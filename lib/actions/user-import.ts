"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { parseCsv } from "@/lib/csv";
import { parsePositiveInt } from "@/lib/params";
import { PASSWORD_MIN_LENGTH, ROLE_LABELS } from "@/lib/constants";
import { withDepartmentsPath } from "@/lib/departments";
import {
  canLogin,
  defaultRoleFor,
  normalizeRole,
  usernameBaseFromName,
  validateUserRoleDepartment,
} from "@/lib/user-rules";
import type { CsvImportState, ImportRowError } from "@/lib/types";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
const MAX_IMPORT_ROWS = 1000;
const MAX_REPORTED_ERRORS = 30;

type FieldKey = "id" | "name" | "username" | "role" | "position" | "password";

const HEADER_ALIASES: Record<string, FieldKey> = {
  id: "id",
  nama: "name",
  name: "name",
  username: "username",
  role: "role",
  posisi: "position",
  position: "position",
  department: "position",
  departemen: "position",
  divisi: "position",
  password: "password",
  sandi: "password",
};

type PlannedRow = {
  line: number;
  id: number | null;
  name: string;
  username: string;
  role: string;
  departmentId: number;
  password: string;
};

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
const normalizeName = (value: string) => value.trim().toLowerCase();
const normalizePath = (value: string) =>
  value.replace(/\s*>\s*/g, ">").trim().toLowerCase();

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

export async function importUsersAction(
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
  const missingColumns: string[] = [];
  if (!columnIndex.has("name")) missingColumns.push("Nama");
  if (!columnIndex.has("position")) missingColumns.push("Posisi");
  if (missingColumns.length > 0) {
    return {
      error: `Kolom wajib tidak ditemukan: ${missingColumns.join(", ")}.`,
    };
  }

  const get = (cells: string[], key: FieldKey) => {
    const index = columnIndex.get(key);
    return index === undefined ? "" : (cells[index] ?? "").trim();
  };

  const [existingUsers, departments] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, username: true, role: true, departmentId: true },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, parentId: true, canHaveAdmin: true },
    }),
  ]);

  const departmentRows = withDepartmentsPath(departments);
  const departmentByPath = new Map(
    departmentRows.map((item) => [normalizePath(item.path), item])
  );
  const departmentByName = new Map(
    departmentRows.map((item) => [normalizeName(item.name), item])
  );

  const existingById = new Map(existingUsers.map((item) => [item.id, item]));
  const ownerByUsername = new Map(
    existingUsers.map((item) => [item.username.toLowerCase(), item.id])
  );
  const claimedUsernames = new Set<string>();

  function claimUsername(username: string, rowId: number | null) {
    const key = username.toLowerCase();
    if (claimedUsernames.has(key)) return false;
    const ownerId = ownerByUsername.get(key);
    if (ownerId !== undefined && ownerId !== rowId) return false;
    claimedUsernames.add(key);
    return true;
  }

  function generateUsername(name: string) {
    const base = usernameBaseFromName(name);
    let candidate = base;
    let suffix = 1;
    while (ownerByUsername.has(candidate) || claimedUsernames.has(candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }
    claimedUsernames.add(candidate);
    return candidate;
  }

  const errors: ImportRowError[] = [];
  const planned: PlannedRow[] = [];

  for (const { line, cells } of dataRows) {
    const fail = (message: string) => {
      errors.push({ line, message });
    };

    const idRaw = get(cells, "id");
    const id = parsePositiveInt(idRaw) ?? null;
    if (idRaw && id === null) {
      fail(`ID "${idRaw}" tidak valid`);
      continue;
    }
    const existing = id !== null ? existingById.get(id) : undefined;
    if (id !== null && !existing) {
      fail(`ID ${id} tidak ditemukan`);
      continue;
    }

    const name = get(cells, "name");
    if (!name) {
      fail("Nama wajib diisi");
      continue;
    }

    const positionRaw = get(cells, "position");
    const department = positionRaw
      ? (departmentByPath.get(normalizePath(positionRaw)) ??
        departmentByName.get(normalizeName(positionRaw)))
      : undefined;
    if (!department) {
      fail(`Posisi "${positionRaw || "(kosong)"}" tidak ditemukan`);
      continue;
    }

    const roleRaw = get(cells, "role");
    let role: string;
    if (roleRaw) {
      const parsed = normalizeRole(roleRaw);
      if (!parsed) {
        fail(`Role "${roleRaw}" tidak dikenal`);
        continue;
      }
      role = parsed;
    } else {
      role = defaultRoleFor(department);
    }

    const roleError = validateUserRoleDepartment(role, department);
    if (roleError) {
      fail(roleError);
      continue;
    }

    const password = get(cells, "password");
    if (password && password.length < PASSWORD_MIN_LENGTH) {
      fail(`Password minimal ${PASSWORD_MIN_LENGTH} karakter`);
      continue;
    }
    if (canLogin(role) && existing === undefined && !password) {
      fail(`Password wajib untuk role ${ROLE_LABELS[role] ?? role} pada baris baru`);
      continue;
    }

    const usernameRaw = get(cells, "username");
    let username: string;
    if (usernameRaw) {
      username = usernameRaw;
    } else if (!canLogin(role)) {
      // Non-user tidak perlu username: pakai milik user lama, atau buat otomatis.
      username = existing?.username ?? generateUsername(name);
    } else {
      fail("Username wajib diisi");
      continue;
    }

    if (canLogin(role) && username.length < 3) {
      fail("Username minimal 3 karakter");
      continue;
    }

    if (usernameRaw || canLogin(role)) {
      if (!claimUsername(username, id)) {
        fail(`Username "${username}" sudah dipakai`);
        continue;
      }
    }

    planned.push({
      line,
      id,
      name,
      username,
      role,
      departmentId: department.id,
      password,
    });
  }

  // Minimal harus tersisa satu akun Admin.
  let adminCount = existingUsers.filter((item) => item.role === "ADMIN").length;
  for (const row of planned) {
    const wasAdmin = row.id !== null && existingById.get(row.id)?.role === "ADMIN";
    const willBeAdmin = row.role === "ADMIN";
    if (wasAdmin && !willBeAdmin) adminCount -= 1;
    if (!wasAdmin && willBeAdmin) adminCount += 1;
  }
  if (adminCount < 1) {
    errors.push({
      line: planned[0]?.line ?? 2,
      message: "Tidak bisa menghilangkan semua akun Admin.",
    });
  }

  if (errors.length > 0) return buildErrorResult(errors);

  let imported = 0;
  let updated = 0;

  try {
    await prisma.$transaction(async (tx) => {
      for (const row of planned) {
        if (row.id !== null) {
          const data: {
            name: string;
            username: string;
            role: string;
            departmentId: number;
            passwordHash?: string;
          } = {
            name: row.name,
            username: row.username,
            role: row.role,
            departmentId: row.departmentId,
          };
          if (row.password) {
            data.passwordHash = await hashPassword(row.password);
          }

          await tx.user.update({ where: { id: row.id }, data });
          updated += 1;
        } else {
          const passwordHash = await hashPassword(
            row.password || randomUUID()
          );
          await tx.user.create({
            data: {
              name: row.name,
              username: row.username,
              role: row.role,
              departmentId: row.departmentId,
              passwordHash,
            },
          });
          imported += 1;
        }
      }
    });
  } catch {
    return { error: "Gagal menyimpan data. Tidak ada user yang diimpor." };
  }

  revalidatePath("/users");
  revalidatePath("/departments");
  revalidatePath("/assets");
  revalidatePath("/");
  return { success: true, imported, updated };
}
