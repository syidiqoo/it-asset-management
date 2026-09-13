"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { assetSchema } from "@/lib/schemas";
import { cleanupUploads, saveUpload } from "@/lib/uploads";
import type { AssetFormState } from "@/lib/types";

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function saveAssetAction(
  _prevState: AssetFormState,
  formData: FormData
): Promise<AssetFormState> {
  const user = await requireAdmin();

  const parsed = assetSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: "Periksa kembali data yang diisi.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const data = parsed.data;
  const id = parsed.data.id ? Number(parsed.data.id) : null;

  const [inventType, department, assignee] = await Promise.all([
    prisma.inventType.findUnique({ where: { id: data.inventTypeId } }),
    prisma.department.findUnique({ where: { id: data.departmentId } }),
    prisma.user.findUnique({ where: { id: data.userId } }),
  ]);

  if (!inventType) return { error: "Kategori inventaris tidak ditemukan." };
  if (!department) return { error: "Department tidak ditemukan." };
  if (!assignee || assignee.departmentId !== data.departmentId) {
    return { error: "User yang dipilih bukan anggota department tersebut." };
  }

  const duplicate = await prisma.asset.findFirst({
    where: { code: data.code, ...(id ? { NOT: { id } } : {}) },
  });

  if (duplicate) {
    return { error: `Code "${data.code}" sudah dipakai oleh aset lain.` };
  }

  const existing = id ? await prisma.asset.findUnique({ where: { id } }) : null;
  if (id && !existing) return { error: "Aset tidak ditemukan." };

  const imageFile = formData.get("image");
  const docFile = formData.get("doc");

  const imageResult = await saveUpload(
    imageFile instanceof File ? imageFile : null,
    "image"
  );
  if (!imageResult.ok) return { error: imageResult.error };

  const docResult = await saveUpload(
    docFile instanceof File ? docFile : null,
    "doc"
  );
  if (!docResult.ok) {
    await cleanupUploads([imageResult.url]);
    return { error: docResult.error };
  }

  const baseData = {
    inventTypeId: data.inventTypeId,
    assetName: data.assetName,
    code: data.code,
    serialNumber: data.serialNumber ?? null,
    userId: data.userId,
    departmentId: data.departmentId,
    condition: data.condition,
    recordDate: new Date(data.recordDate),
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    note: data.note ?? null,
    updatedById: user.id,
  };

  try {
    if (id && existing) {
      await prisma.asset.update({
        where: { id },
        data: {
          ...baseData,
          imageUrl: imageResult.url ?? existing.imageUrl,
          docUrl: docResult.url ?? existing.docUrl,
        },
      });

      await cleanupUploads([
        imageResult.url ? existing.imageUrl : null,
        docResult.url ? existing.docUrl : null,
      ]);

      revalidatePath("/assets");
      revalidatePath(`/assets/${id}`);
      redirect(`/assets/${id}`);
    }

    const created = await prisma.asset.create({
      data: {
        ...baseData,
        imageUrl: imageResult.url,
        docUrl: docResult.url,
      },
    });

    revalidatePath("/assets");
    redirect(`/assets/${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    await cleanupUploads([imageResult.url, docResult.url]);
    return { error: "Gagal menyimpan data aset. Silakan coba lagi." };
  }
}

export async function deleteAssetAction(id: number) {
  await requireAdmin();

  if (!Number.isInteger(id) || id <= 0) return;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) return;

  try {
    await prisma.asset.delete({ where: { id } });
  } catch {
    return;
  }

  await cleanupUploads([asset.imageUrl, asset.docUrl]);

  revalidatePath("/assets");
  redirect("/assets");
}
