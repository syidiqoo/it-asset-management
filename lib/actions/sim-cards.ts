"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { parsePositiveInt } from "@/lib/params";
import { simCardSchema } from "@/lib/schemas";
import type { ActionState } from "@/lib/types";

export async function saveSimCardAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = simCardSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const { phoneNumber, clsDomestic, clsRoaming } = parsed.data;
  const id = parsePositiveInt(parsed.data.id);
  const userId = parsed.data.userId;
  const packageId = parsed.data.packageId ?? null;

  const assignee = await prisma.user.findUnique({ where: { id: userId } });
  if (!assignee) return { error: "User tidak ditemukan." };

  if (packageId !== null) {
    const simPackage = await prisma.simPackage.findUnique({
      where: { id: packageId },
    });
    if (!simPackage) return { error: "Package tidak ditemukan." };
  }

  const duplicate = await prisma.simCard.findFirst({
    where: { phoneNumber, ...(id ? { NOT: { id } } : {}) },
  });
  if (duplicate) {
    return { error: `No Handphone "${phoneNumber}" sudah dipakai.` };
  }

  const baseData = {
    phoneNumber,
    userId,
    departmentId: assignee.departmentId,
    packageId,
    clsDomestic: clsDomestic ?? null,
    clsRoaming: clsRoaming ?? null,
  };

  if (id) {
    const existing = await prisma.simCard.findUnique({ where: { id } });
    if (!existing) return { error: "SIM Card tidak ditemukan." };
    await prisma.simCard.update({ where: { id }, data: baseData });
  } else {
    await prisma.simCard.create({ data: baseData });
  }

  revalidatePath("/sim-cards");
  revalidatePath("/");
  return { success: true };
}

export async function deleteSimCardAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const id = parsePositiveInt(formData.get("id"));
  if (!id) return { error: "SIM Card tidak valid." };

  await prisma.simCard.delete({ where: { id } }).catch(() => undefined);

  revalidatePath("/sim-cards");
  revalidatePath("/");
  return { success: true };
}
