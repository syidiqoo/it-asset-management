import type { Prisma } from "@prisma/client";

export const assetListInclude = {
  inventType: { select: { name: true } },
  department: { select: { name: true } },
  user: { select: { name: true } },
  updatedBy: { select: { name: true } },
} satisfies Prisma.AssetInclude;

export const assetListOrderBy = [
  { updatedAt: "desc" },
  { id: "desc" },
] satisfies Prisma.AssetOrderByWithRelationInput[];

type AssetWithRelations = Prisma.AssetGetPayload<{
  include: typeof assetListInclude;
}>;

// Bentuk data yang aman dikirim ke client component / JSON API.
export type AssetRow = {
  id: number;
  inventTypeName: string;
  assetName: string;
  code: string;
  serialNumber: string | null;
  userName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  condition: string;
  imageUrl: string | null;
  recordDate: string;
  docUrl: string | null;
  purchaseDate: string | null;
  updatedByName: string | null;
  note: string | null;
};

export function toAssetRow(asset: AssetWithRelations): AssetRow {
  return {
    id: asset.id,
    inventTypeName: asset.inventType.name,
    assetName: asset.assetName,
    code: asset.code,
    serialNumber: asset.serialNumber,
    userName: asset.user?.name ?? null,
    departmentId: asset.departmentId,
    departmentName: asset.department?.name ?? null,
    condition: asset.condition,
    imageUrl: asset.imageUrl,
    recordDate: asset.recordDate.toISOString(),
    docUrl: asset.docUrl,
    purchaseDate: asset.purchaseDate ? asset.purchaseDate.toISOString() : null,
    updatedByName: asset.updatedBy?.name ?? null,
    note: asset.note,
  };
}
