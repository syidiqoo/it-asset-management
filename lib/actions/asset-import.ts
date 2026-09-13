"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { CONDITIONS } from "@/lib/constants";
import { parseCsv } from "@/lib/csv";
import { withDepartmentsPath } from "@/lib/departments";
import type { AssetImportState, ImportRowError } from "@/lib/types";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
const MAX_REPORTED_ERRORS = 30;

type FieldKey =
  | "inventType"
  | "assetName"
  | "code"
  | "serialNumber"
  | "user"
  | "username"
  | "department"
  | "condition"
  | "recordDate"
  | "purchaseDate"
  | "note";

type DepartmentOption = {
  id: number;
  name: string;
  parentId: number | null;
  canHaveAdmin?: boolean;
};
type TypeOption = { id: number; name: string };
type UserOption = {
  id: number;
  name: string;
  username: string;
  departmentId: number | null;
};

type Candidate = {
  line: number;
  inventTypeId: number;
  assetName: string;
  code: string;
  serialNumber: string | null;
  departmentId: number;
  userId: number;
  condition: string;
  recordDate: Date;
  purchaseDate: Date | null;
  note: string | null;
};

type ParseResult =
  | { ok: true; candidate: Candidate }
  | { ok: false; line: number; message: string };

const HEADER_ALIASES: Record<string, FieldKey> = {
  inventtype: "inventType",
  jenisinventaris: "inventType",
  jenis: "inventType",
  kategoriinventaris: "inventType",
  kategori: "inventType",
  assetname: "assetName",
  namaaset: "assetName",
  code: "code",
  kode: "code",
  serialnumber: "serialNumber",
  serial: "serialNumber",
  noserial: "serialNumber",
  user: "user",
  pengguna: "user",
  pemakai: "user",
  username: "username",
  department: "department",
  departemen: "department",
  divisi: "department",
  condition: "condition",
  kondisi: "condition",
  date: "recordDate",
  tanggal: "recordDate",
  purchasedate: "purchaseDate",
  tanggalpembelian: "purchaseDate",
  note: "note",
  catatan: "note",
  keterangan: "note",
};

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDepartmentKey(value: string) {
  return value.replace(/\s*>\s*/g, ">").trim().toLowerCase();
}

function parseDateInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);
  if (iso) return new Date(trimmed);

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    const year = Number(dmy[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    const valid =
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day;
    return valid ? date : null;
  }

  const fallback = new Date(trimmed);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export async function importAssetsAction(
  _prev: AssetImportState,
  formData: FormData
): Promise<AssetImportState> {
  const admin = await requireAdmin();

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

  const requiredColumns = [
    { key: "inventType" as const, label: "Kategori Inventaris" },
    { key: "assetName" as const, label: "Asset Name" },
    { key: "code" as const, label: "Code" },
    { key: "department" as const, label: "Department" },
  ];
  const missingColumns = requiredColumns
    .filter(({ key }) => !columnIndex.has(key))
    .map(({ label }) => label);
  if (!columnIndex.has("user") && !columnIndex.has("username")) {
    missingColumns.push("User / Username");
  }
  if (missingColumns.length > 0) {
    return {
      error: `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}.`,
    };
  }

  const [departments, types, users] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true, parentId: true, canHaveAdmin: true },
    }),
    prisma.inventType.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, departmentId: true },
    }),
  ]);

  const departmentByPath = new Map<string, DepartmentOption>(
    withDepartmentsPath(departments).map((item) => [
      normalizeDepartmentKey(item.path),
      item,
    ])
  );
  const departmentByName = new Map<string, DepartmentOption>(
    departments.map((item) => [item.name.trim().toLowerCase(), item])
  );
  const typeByName = new Map<string, TypeOption>(
    types.map((item) => [item.name.trim().toLowerCase(), item])
  );
  const userByUsername = new Map<string, UserOption>(
    users.map((item) => [item.username.trim().toLowerCase(), item])
  );
  const usersByName = new Map<string, UserOption[]>();
  for (const item of users) {
    const key = item.name.trim().toLowerCase();
    const list = usersByName.get(key) ?? [];
    list.push(item);
    usersByName.set(key, list);
  }

  const get = (cells: string[], key: FieldKey) => {
    const index = columnIndex.get(key);
    if (index === undefined) return "";
    return (cells[index] ?? "").trim();
  };

  const today = new Date(new Date().toISOString().slice(0, 10));
  const seenCodes = new Map<string, number>();

  function parseRow(line: number, cells: string[]): ParseResult {
    const fail = (message: string): ParseResult => ({ ok: false, line, message });

    const typeName = get(cells, "inventType");
    const type = typeName ? typeByName.get(typeName.toLowerCase()) : undefined;
    if (!type) {
      return fail(`Kategori inventaris "${typeName || "(kosong)"}" tidak ditemukan`);
    }

    const departmentValue = get(cells, "department");
    const departmentKey = normalizeDepartmentKey(departmentValue);
    const department = departmentValue
      ? (departmentByPath.get(departmentKey) ??
        departmentByName.get(departmentKey))
      : undefined;
    if (!department) {
      return fail(
        `Department "${departmentValue || "(kosong)"}" tidak ditemukan`
      );
    }

    const assetName = get(cells, "assetName");
    if (!assetName) return fail("Asset Name wajib diisi");

    const code = get(cells, "code");
    if (!code) return fail("Code wajib diisi");

    const username = get(cells, "username");
    const userName = get(cells, "user");
    let user: UserOption | undefined;
    if (username) {
      user = userByUsername.get(username.toLowerCase());
      if (!user) return fail(`Username "${username}" tidak ditemukan`);
    } else if (userName) {
      const matches = usersByName.get(userName.toLowerCase()) ?? [];
      if (matches.length === 0) return fail(`User "${userName}" tidak ditemukan`);
      if (matches.length > 1) {
        return fail(`User "${userName}" lebih dari satu, isi kolom Username`);
      }
      user = matches[0];
    } else {
      return fail("User / Username wajib diisi");
    }

    if (user.departmentId !== department.id) {
      return fail("User yang dipilih bukan anggota department tersebut");
    }

    const conditionValue = get(cells, "condition");
    const condition = conditionValue || "Good";
    if (!(CONDITIONS as readonly string[]).includes(condition)) {
      return fail(`Condition "${conditionValue}" tidak valid`);
    }

    const recordDateValue = get(cells, "recordDate");
    const recordDate = recordDateValue ? parseDateInput(recordDateValue) : today;
    if (!recordDate) return fail(`Tanggal "${recordDateValue}" tidak valid`);

    const purchaseDateValue = get(cells, "purchaseDate");
    const purchaseDate = purchaseDateValue ? parseDateInput(purchaseDateValue) : null;
    if (purchaseDateValue && !purchaseDate) {
      return fail(`Purchase Date "${purchaseDateValue}" tidak valid`);
    }

    const normalizedCode = code.toLowerCase();
    const duplicateLine = seenCodes.get(normalizedCode);
    if (duplicateLine !== undefined) {
      return fail(`Code "${code}" duplikat dengan baris ${duplicateLine}`);
    }
    seenCodes.set(normalizedCode, line);

    return {
      ok: true,
      candidate: {
        line,
        inventTypeId: type.id,
        assetName,
        code,
        serialNumber: get(cells, "serialNumber") || null,
        departmentId: department.id,
        userId: user.id,
        condition,
        recordDate,
        purchaseDate,
        note: get(cells, "note") || null,
      },
    };
  }

  const errors: ImportRowError[] = [];
  const candidates: Candidate[] = [];

  for (const { line, cells } of dataRows) {
    const result = parseRow(line, cells);
    if (result.ok) candidates.push(result.candidate);
    else errors.push({ line: result.line, message: result.message });
  }

  if (errors.length === 0 && candidates.length > 0) {
    const existing = await prisma.asset.findMany({
      where: { code: { in: candidates.map((item) => item.code) } },
      select: { code: true },
    });
    const existingCodes = new Set(existing.map((item) => item.code.toLowerCase()));
    for (const candidate of candidates) {
      if (existingCodes.has(candidate.code.toLowerCase())) {
        errors.push({
          line: candidate.line,
          message: `Code "${candidate.code}" sudah dipakai aset lain`,
        });
      }
    }
  }

  if (errors.length > 0) {
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

  try {
    await prisma.$transaction(
      candidates.map((candidate) =>
        prisma.asset.create({
          data: {
            inventTypeId: candidate.inventTypeId,
            assetName: candidate.assetName,
            code: candidate.code,
            serialNumber: candidate.serialNumber,
            userId: candidate.userId,
            departmentId: candidate.departmentId,
            condition: candidate.condition,
            recordDate: candidate.recordDate,
            purchaseDate: candidate.purchaseDate,
            note: candidate.note,
            updatedById: admin.id,
          },
        })
      )
    );
  } catch {
    return { error: "Gagal menyimpan data. Tidak ada aset yang diimpor." };
  }

  revalidatePath("/assets");
  revalidatePath("/");
  return { success: true, imported: candidates.length };
}
