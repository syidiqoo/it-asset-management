"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { parsePositiveInt } from "@/lib/params";
import { validateDepartmentPlacement, withDepartmentsPath } from "@/lib/departments";
import type { CsvImportState, ImportRowError } from "@/lib/types";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
const MAX_REPORTED_ERRORS = 30;

type FieldKey = "id" | "name" | "parent" | "canHaveAdmin";

const HEADER_ALIASES: Record<string, FieldKey> = {
  id: "id",
  nama: "name",
  name: "name",
  induk: "parent",
  parent: "parent",
  indukdepartment: "parent",
  parentdepartment: "parent",
  bolehadmin: "canHaveAdmin",
  canhaveadmin: "canHaveAdmin",
};

type DeptNode = {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  depth: number;
};

type RawRow = {
  line: number;
  id: number | null;
  name: string;
  parentRaw: string;
  canHaveAdminRaw: boolean;
};

type PlannedRow = {
  line: number;
  id: number | null;
  name: string;
  parentKey: string | null;
  canHaveAdmin: boolean;
};

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeName = (value: string) => value.trim().toLowerCase();
const normalizePath = (value: string) =>
  value.replace(/\s*>\s*/g, ">").trim().toLowerCase();

function parseBoolean(value: string) {
  const raw = value.trim().toLowerCase();
  return raw === "ya" || raw === "true" || raw === "1" || raw === "y" || raw === "yes";
}

function buildErrorResult(errors: ImportRowError[]): CsvImportState {
  errors.sort((a, b) => a.line - b.line);
  return {
    error: `Import dibatalkan karena ${errors.length} baris bermasalah. Perbaiki file lalu coba lagi.`,
    rowErrors: errors.slice(0, MAX_REPORTED_ERRORS),
    ...(errors.length > MAX_REPORTED_ERRORS
      ? {
          fieldErrors: {
            total: [
              `Menampilkan ${MAX_REPORTED_ERRORS} dari ${errors.length} baris bermasalah.`,
            ],
          },
        }
      : {}),
  };
}

export async function importDepartmentsAction(
  _prev: CsvImportState,
  formData: FormData
): Promise<CsvImportState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pilih file CSV terlebih dahulu." };
  }
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return { error: "File harus berformat .csv." };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { error: "Ukuran file maksimal 2 MB." };
  }

  const rows = parseCsv(await file.text());
  if (rows.length === 0 || rows.every((cells) => cells.every((cell) => !cell.trim()))) {
    return { error: "File CSV kosong." };
  }

  const headerRow = rows[0];
  const dataRows = rows
    .slice(1)
    .map((cells, index) => ({ line: index + 2, cells }))
    .filter(({ cells }) => cells.some((cell) => cell.trim() !== ""));

  if (dataRows.length === 0) {
    return { error: "File CSV hanya berisi baris judul, belum ada data." };
  }
  if (dataRows.length > MAX_IMPORT_ROWS) {
    return { error: `Maksimal ${MAX_IMPORT_ROWS} baris per sekali impor.` };
  }

  const columnIndex = new Map<FieldKey, number>();
  headerRow.forEach((header, index) => {
    const field = HEADER_ALIASES[normalizeHeader(header)];
    if (field && !columnIndex.has(field)) columnIndex.set(field, index);
  });
  if (!columnIndex.has("name")) {
    return { error: "Kolom wajib tidak ditemukan: Nama." };
  }

  const get = (cells: string[], key: FieldKey) => {
    const index = columnIndex.get(key);
    return index === undefined ? "" : (cells[index] ?? "").trim();
  };

  const errors: ImportRowError[] = [];
  const rawRows: RawRow[] = [];
  const seenNames = new Map<string, number>();

  for (const { line, cells } of dataRows) {
    const idRaw = get(cells, "id");
    const id = parsePositiveInt(idRaw);
    if (idRaw && !id) {
      errors.push({ line, message: `ID "${idRaw}" tidak valid` });
      continue;
    }

    const name = get(cells, "name");
    if (!name) {
      errors.push({ line, message: "Nama wajib diisi" });
      continue;
    }

    const duplicateLine = seenNames.get(normalizeName(name));
    if (duplicateLine !== undefined) {
      errors.push({
        line,
        message: `Nama "${name}" duplikat dengan baris ${duplicateLine}`,
      });
      continue;
    }
    seenNames.set(normalizeName(name), line);

    rawRows.push({
      line,
      id: id ?? null,
      name,
      parentRaw: get(cells, "parent"),
      canHaveAdminRaw: parseBoolean(get(cells, "canHaveAdmin")),
    });
  }

  const existing = await prisma.department.findMany({
    select: { id: true, name: true, parentId: true, canHaveAdmin: true },
  });
  const existingRows = withDepartmentsPath(existing);
  const existingIds = new Set(existingRows.map((item) => item.id));

  const nodes = new Map<number, DeptNode>();
  const byName = new Map<string, DeptNode>();
  const byPath = new Map<string, DeptNode>();

  function register(node: DeptNode) {
    nodes.set(node.id, node);
    byName.set(normalizeName(node.name), node);
    byPath.set(normalizePath(node.path), node);
  }

  for (const item of existingRows) {
    register({
      id: item.id,
      name: item.name,
      parentId: item.parentId,
      path: item.path,
      depth: item.depth,
    });
  }

  function findParent(rawValue: string): DeptNode | null | undefined {
    if (!rawValue.trim()) return null;
    return (
      byPath.get(normalizePath(rawValue)) ??
      byName.get(normalizeName(rawValue)) ??
      undefined
    );
  }

  const remaining = rawRows.filter((row) => {
    if (row.id !== null && !existingIds.has(row.id)) {
      errors.push({ line: row.line, message: `ID ${row.id} tidak ditemukan` });
      return false;
    }
    return true;
  });

  const planned: PlannedRow[] = [];
  let tempId = -1;
  let progressed = true;

  while (remaining.length > 0 && progressed) {
    progressed = false;

    for (let index = 0; index < remaining.length; ) {
      const row = remaining[index];
      const parent = findParent(row.parentRaw);

      if (parent === undefined) {
        index += 1;
        continue;
      }

      const clash = byName.get(normalizeName(row.name));
      if (clash && clash.id !== row.id) {
        errors.push({
          line: row.line,
          message: `Nama "${row.name}" sudah dipakai department lain`,
        });
        remaining.splice(index, 1);
        progressed = true;
        continue;
      }

      const parentId = parent ? parent.id : null;
      const placementError = validateDepartmentPlacement({
        id: row.id ?? undefined,
        parentId,
        departments: [...nodes.values()],
      });
      if (placementError) {
        errors.push({ line: row.line, message: placementError });
        remaining.splice(index, 1);
        progressed = true;
        continue;
      }

      const canHaveAdmin = parentId === null ? row.canHaveAdminRaw : false;
      const path = parent ? `${parent.path} > ${row.name}` : row.name;

      const previous = row.id !== null ? nodes.get(row.id) : undefined;
      if (previous) {
        byName.delete(normalizeName(previous.name));
        byPath.delete(normalizePath(previous.path));
      }

      register({
        id: row.id ?? tempId--,
        name: row.name,
        parentId,
        path,
        depth: parent ? parent.depth + 1 : 1,
      });

      planned.push({
        line: row.line,
        id: row.id,
        name: row.name,
        parentKey: parent ? normalizeName(parent.name) : null,
        canHaveAdmin,
      });

      remaining.splice(index, 1);
      progressed = true;
    }
  }

  for (const row of remaining) {
    errors.push({
      line: row.line,
      message: `Induk "${row.parentRaw}" tidak ditemukan`,
    });
  }

  if (errors.length > 0) return buildErrorResult(errors);

  const idByName = new Map<string, number>();
  for (const item of existingRows) idByName.set(normalizeName(item.name), item.id);

  let imported = 0;
  let updated = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of planned) {
        const parentId = row.parentKey ? (idByName.get(row.parentKey) ?? null) : null;

        if (row.id !== null) {
          await tx.department.update({
            where: { id: row.id },
            data: { name: row.name, parentId, canHaveAdmin: row.canHaveAdmin },
          });
          idByName.set(normalizeName(row.name), row.id);
          updated += 1;
        } else {
          const created = await tx.department.create({
            data: { name: row.name, parentId, canHaveAdmin: row.canHaveAdmin },
          });
          idByName.set(normalizeName(row.name), created.id);
          imported += 1;
        }
      }
    });
  } catch {
    return { error: "Gagal menyimpan data. Tidak ada department yang diimpor." };
  }

  revalidatePath("/departments");
  revalidatePath("/users");
  revalidatePath("/assets");
  revalidatePath("/");
  return { success: true, imported, updated };
}
