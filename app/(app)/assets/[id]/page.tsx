import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withDepartmentsPath } from "@/lib/departments";
import { formatDate } from "@/lib/format";
import { CONDITION_BADGE } from "@/lib/constants";
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
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon-sm"
            render={<Link href="/assets" />}
          >
            <ArrowLeft className="size-4" />
            <span className="sr-only">Kembali</span>
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
              {asset.assetName}
            </h1>
            <p className="text-sm text-muted-foreground">{asset.code}</p>
          </div>
        </div>

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

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informasi Aset</CardTitle>
          </CardHeader>
          <CardContent>
            <DetailRow label="Kategori Inventaris">{asset.inventType.name}</DetailRow>
            <DetailRow label="Asset Name">{asset.assetName}</DetailRow>
            <DetailRow label="Code">{asset.code}</DetailRow>
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

        <Card>
          <CardHeader>
            <CardTitle>Lampiran</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Image</p>
              {asset.imageUrl ? (
                <Image
                  src={asset.imageUrl}
                  alt={asset.assetName}
                  width={320}
                  height={320}
                  unoptimized
                  className="h-48 w-full rounded-lg border object-cover"
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tidak ada gambar.
                </p>
              )}
            </div>

            <div>
              <p className="mb-2 text-sm text-muted-foreground">Doc</p>
              {asset.docUrl ? (
                <a
                  href={asset.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm underline underline-offset-2"
                >
                  <FileText className="size-4" />
                  Buka dokumen
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Tidak ada dokumen.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
