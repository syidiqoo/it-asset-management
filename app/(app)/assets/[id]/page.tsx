import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withDepartmentsPath } from "@/lib/departments";
import { formatDate } from "@/lib/format";
import { CONDITION_BADGE } from "@/lib/constants";
import { AssetImagePreview } from "@/components/asset-image-preview";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1 border-b py-3 last:border-0 sm:flex-row sm:items-center">
      <span className="w-40 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{children}</span>
    </div>
  );
}

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const assetId = Number(id);

  if (!Number.isInteger(assetId)) notFound();

  const [asset, departments] = await Promise.all([
    prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        inventType: true,
        department: true,
        user: true,
        updatedBy: true,
      },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, parentId: true, canHaveAdmin: true },
    }),
  ]);

  if (!asset) notFound();

  const departmentPathById = new Map(
    withDepartmentsPath(departments).map((item) => [item.id, item.path])
  );

  const isAdmin = user.role === "ADMIN";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href="/assets" />}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Kembali</span>
        </Button>

        {isAdmin ? (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              render={<Link href={`/assets/${asset.id}/edit`} />}
            >
              <Pencil className="size-4" />
              Edit
            </Button>
            <DeleteAssetButton
              id={asset.id}
              name={asset.assetName}
              variant="full"
            />
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Informasi Aset</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Kategori Inventaris">{asset.inventType.name}</DetailRow>
            <DetailRow label="Asset Name">
              <strong className="font-semibold">{asset.assetName}</strong>
            </DetailRow>
            <DetailRow label="Code">
              <strong className="font-semibold">{asset.code}</strong>
            </DetailRow>
            <DetailRow label="Serial Number">
              {asset.serialNumber ?? "-"}
            </DetailRow>
            <DetailRow label="User">{asset.user?.name ?? "-"}</DetailRow>
            <DetailRow label="Department">
              {asset.departmentId
                ? (departmentPathById.get(asset.departmentId) ??
                  asset.department?.name ??
                  "-")
                : "-"}
            </DetailRow>
            <DetailRow label="Condition">
              <Badge variant={CONDITION_BADGE[asset.condition] ?? "secondary"}>
                {asset.condition}
              </Badge>
            </DetailRow>
            <DetailRow label="Date">{formatDate(asset.recordDate)}</DetailRow>
            <DetailRow label="Purchase Date">
              {formatDate(asset.purchaseDate)}
            </DetailRow>
            <DetailRow label="Updated By">
              {asset.updatedBy?.name ?? "-"}
            </DetailRow>
            <DetailRow label="Note">{asset.note ?? "-"}</DetailRow>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lampiran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Image</p>
              {asset.imageUrl ? (
                <AssetImagePreview
                  src={asset.imageUrl}
                  alt={asset.assetName}
                />
              ) : (
                <div className="flex h-80 items-center justify-center rounded-lg border border-dashed bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Tidak ada gambar.
                  </p>
                </div>
              )}
            </div>

            {asset.docUrl ? (
              <Button
                variant="outline"
                size="sm"
                className="w-fit"
                render={
                  <a href={asset.docUrl} target="_blank" rel="noreferrer" />
                }
              >
                <FileText className="size-4" />
                Lihat PDF
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Tidak ada dokumen PDF.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
