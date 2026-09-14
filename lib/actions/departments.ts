"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parsePositiveInt } from "@/lib/params";
import { departmentSchema } from "@/lib/schemas";
import { validateDepartmentPlacement } from "@/lib/departments";
import type { ActionState } from "@/lib/types";

function revalidateDepartmentViews() {
  revalidatePath("/departments");
  revalidatePath("/users");
  revalidatePath("/assets");
  revalidatePath("/");
}

export async function saveDepartmentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = departmentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { name } = parsed.data;
  const id = parsePositiveInt(parsed.data.id);
  const parentId = parsed.data.parentId ?? null;
  const canHaveAdmin = parentId === null ? parsed.data.canHaveAdmin : false;

  const duplicate = await prisma.department.findFirst({
    where: { name, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: "Nama department sudah ada." };

  if (parentId !== null) {
    const departments = await prisma.department.findMany({
      select: { id: true, name: true, parentId: true },
    });
    const placementError = validateDepartmentPlacement({
      id,
      parentId,
      departments,
    });
    if (placementError) return { error: placementError };
  }

  if (id) {
    await prisma.department.update({
      where: { id },
      data: { name, parentId, canHaveAdmin },
    });
  } else {
    await prisma.department.create({
      data: { name, parentId, canHaveAdmin },
    });
  }

  revalidateDepartmentViews();
  return { success: true };
}

export async function deleteDepartmentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = parsePositiveInt(formData.get("id"));
  if (!id) return { error: "Department tidak valid." };

  const [childCount, userCount, assetCount, simCount] = await Promise.all([
    prisma.department.count({ where: { parentId: id } }),
    prisma.user.count({ where: { departmentId: id } }),
    prisma.asset.count({ where: { departmentId: id } }),
    prisma.simCard.count({ where: { departmentId: id } }),
  ]);

  if (childCount > 0) {
    return {
      error: `Department masih punya ${childCount} sub-department. Hapus atau pindahkan sub-department terlebih dahulu.`,
    };
  }

  if (userCount > 0 || assetCount > 0 || simCount > 0) {
    return {
      error: `Department masih dipakai oleh ${userCount} user, ${assetCount} aset, dan ${simCount} SIM Card.`,
    };
  }

  await prisma.department.delete({ where: { id } });

  revalidateDepartmentViews();
  return { success: true };
}
