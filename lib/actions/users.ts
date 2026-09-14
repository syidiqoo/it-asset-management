"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { parsePositiveInt } from "@/lib/params";
import { userSchema } from "@/lib/schemas";
import {
  usernameBaseFromName,
  validateUserRoleDepartment,
} from "@/lib/user-rules";
import type { ActionState } from "@/lib/types";

// Username untuk non-user dibuat otomatis (mereka tidak bisa login, jadi admin
// tidak perlu mengisinya). Diambil dari nama, ditambah angka bila sudah dipakai.
async function generateUsername(name: string) {
  const base = usernameBaseFromName(name);

  let candidate = base;
  let suffix = 1;
  while (
    await prisma.user.findUnique({
      where: { username: candidate },
      select: { id: true },
    })
  ) {
    suffix += 1;
    candidate = `${base}${suffix}`;
  }

  return candidate;
}

export async function saveUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { name, password, role, departmentId } = parsed.data;
  const id = parsePositiveInt(parsed.data.id);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) return { error: "Department tidak ditemukan." };

  const roleError = validateUserRoleDepartment(role, department);
  if (roleError) return { error: roleError };

  const existing = id ? await prisma.user.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "User tidak ditemukan." };

  // Non-user tidak perlu username: pakai username lama saat edit, atau buat
  // otomatis saat menambah user baru.
  let username: string;
  if (role === "NON_USER") {
    username =
      parsed.data.username ??
      existing?.username ??
      (await generateUsername(name));
  } else {
    username = parsed.data.username ?? "";
    if (username.length < 3) {
      return { error: "Username minimal 3 karakter." };
    }
  }

  const duplicate = await prisma.user.findFirst({
    where: { username, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: "Username sudah dipakai." };

  if (existing) {
    if (existing.role === "ADMIN" && role !== "ADMIN") {
      const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
      if (adminCount <= 1) {
        return { error: "Tidak bisa mengubah admin terakhir menjadi bukan admin." };
      }
    }

    const data: {
      name: string;
      username: string;
      role: string;
      departmentId: number;
      passwordHash?: string;
    } = { name, username, role, departmentId };

    if (password && password.length > 0) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        return { error: `Password minimal ${PASSWORD_MIN_LENGTH} karakter.` };
      }
      data.passwordHash = await hashPassword(password);
    }

    await prisma.user.update({ where: { id: existing.id }, data });
  } else {
    let passwordHash: string;

    if (password && password.length > 0) {
      if (password.length < PASSWORD_MIN_LENGTH) {
        return { error: `Password minimal ${PASSWORD_MIN_LENGTH} karakter.` };
      }
      passwordHash = await hashPassword(password);
    } else if (role === "NON_USER") {
      passwordHash = await hashPassword(randomUUID());
    } else {
      return { error: `Password minimal ${PASSWORD_MIN_LENGTH} karakter.` };
    }

    await prisma.user.create({
      data: { name, username, role, departmentId, passwordHash },
    });
  }

  revalidatePath("/users");
  revalidatePath("/assets");
  revalidatePath("/departments");
  return { success: true };
}

export async function deleteUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const admin = await requireAdmin();

  const id = parsePositiveInt(formData.get("id"));
  if (!id) return { error: "User tidak valid." };

  if (id === admin.id) {
    return { error: "Tidak bisa menghapus akun yang sedang login." };
  }

  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) return { error: "User tidak ditemukan." };

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return { error: "Tidak bisa menghapus admin terakhir." };
    }
  }

  const linkedAssetCount = await prisma.asset.count({
    where: { OR: [{ userId: id }, { updatedById: id }] },
  });
  if (linkedAssetCount > 0) {
    return {
      error: `User masih terhubung ke ${linkedAssetCount} aset (sebagai pemakai atau pengubah terakhir).`,
    };
  }

  const linkedSimCount = await prisma.simCard.count({ where: { userId: id } });
  if (linkedSimCount > 0) {
    return { error: `User masih terhubung ke ${linkedSimCount} SIM Card.` };
  }

  await prisma.user.delete({ where: { id } });

  revalidatePath("/users");
  revalidatePath("/assets");
  revalidatePath("/departments");
  return { success: true };
}
