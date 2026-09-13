"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";
import { parsePositiveInt } from "@/lib/params";
import { userSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function saveUserAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = userSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { name, username, password, role, departmentId } = parsed.data;
  const id = parsePositiveInt(parsed.data.id);

  const department = await prisma.department.findUnique({
    where: { id: departmentId },
  });
  if (!department) return { error: "Department tidak ditemukan." };

  const isSubDepartment = department.parentId !== null;

  if (role === "ADMIN" && !department.canHaveAdmin) {
    return {
      error:
        "Role Admin hanya boleh untuk department yang ditandai boleh ada admin (mis. IT, Management).",
    };
  }
  if (role === "GUEST" && isSubDepartment) {
    return {
      error: "Role Guest hanya boleh di department level atas, bukan sub-department.",
    };
  }
  if (role === "NON_USER" && !isSubDepartment) {
    return {
      error: "Role Non-user hanya untuk sub-department (mis. Base Jakarta).",
    };
  }

  const duplicate = await prisma.user.findFirst({
    where: { username, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: "Username sudah dipakai." };

  if (id) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return { error: "User tidak ditemukan." };

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

    await prisma.user.update({ where: { id }, data });
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
