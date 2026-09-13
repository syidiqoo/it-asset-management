"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parsePositiveInt } from "@/lib/params";
import { nameSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function saveSimPackageAction(
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

  const duplicate = await prisma.simPackage.findFirst({
    where: { name, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) return { error: "Package sudah ada." };

  if (id) {
    await prisma.simPackage.update({ where: { id }, data: { name } });
  } else {
    await prisma.simPackage.create({ data: { name } });
  }

  revalidatePath("/sim-packages");
  revalidatePath("/sim-cards");
  return { success: true };
}

export async function deleteSimPackageAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = parsePositiveInt(formData.get("id"));
  if (!id) return { error: "Package tidak valid." };

  const usedCount = await prisma.simCard.count({ where: { packageId: id } });
  if (usedCount > 0) {
    return { error: `Package masih dipakai oleh ${usedCount} SIM Card.` };
  }

  await prisma.simPackage.delete({ where: { id } });

  revalidatePath("/sim-packages");
  revalidatePath("/sim-cards");
  return { success: true };
}
