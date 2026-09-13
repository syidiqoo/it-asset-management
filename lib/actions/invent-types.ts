"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parsePositiveInt } from "@/lib/params";
import { nameSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function saveInventTypeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = nameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { name } = parsed.data;
  const id = parsePositiveInt(parsed.data.id);

  const duplicate = await prisma.inventType.findFirst({
    where: { name, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: "Kategori inventaris sudah ada." };

  if (id) {
    await prisma.inventType.update({ where: { id }, data: { name } });
  } else {
    await prisma.inventType.create({ data: { name } });
  }

  revalidatePath("/types");
  revalidatePath("/assets");
  return { success: true };
}

export async function deleteInventTypeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = parsePositiveInt(formData.get("id"));
  if (!id) return { error: "Kategori inventaris tidak valid." };

  const assetCount = await prisma.asset.count({ where: { inventTypeId: id } });
  if (assetCount > 0) {
    return {
      error: `Kategori inventaris masih dipakai oleh ${assetCount} aset.`,
    };
  }

  await prisma.inventType.delete({ where: { id } });

  revalidatePath("/types");
  revalidatePath("/assets");
  return { success: true };
}
