type ExportRelation = { name: string } | null;

type ExportAsset = {
  inventType: { name: string };
  assetName: string;
  code: string;
  serialNumber: string | null;
  user: { name: string; username: string; role: string } | null;
  departmentId: number | null;
  department: ExportRelation;
  condition: string;
  recordDate: Date;
  purchaseDate: Date | null;
  updatedBy: ExportRelation;
  note: string | null;
};

export const ASSET_EXPORT_HEADERS = [
  "No",
  "Kategori Inventaris",
  "Asset Name",
  "Code",
  "Serial Number",
  "User",
  "Username",
  "Department",
  "Condition",
  "Date",
  "Purchase Date",
  "Updated By",
  "Note",
];

function toIsoDate(date: Date | null) {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function assetToExportRow(
  asset: ExportAsset,
  index: number,
  departmentPaths: Map<number, string>
): string[] {
  return [
    String(index + 1),
    asset.inventType.name,
    asset.assetName,
    asset.code,
    asset.serialNumber ?? "",
    asset.user?.name ?? "",
    // Non-user tidak bisa login, jadi username-nya tidak perlu ikut diekspor.
    asset.user?.role === "NON_USER" ? "" : (asset.user?.username ?? ""),
    asset.departmentId
      ? (departmentPaths.get(asset.departmentId) ??
        asset.department?.name ??
        "")
      : "",
    asset.condition,
    toIsoDate(asset.recordDate),
    toIsoDate(asset.purchaseDate),
    asset.updatedBy?.name ?? "",
    asset.note ?? "",
  ];
}
