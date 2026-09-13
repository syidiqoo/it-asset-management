import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { withDepartmentsPath } from "@/lib/departments";
import { AssetForm } from "@/components/asset-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function toInputDate(date: Date | null) {
  if (!date) return null;
  return date.toISOString().slice(0, 10);
}

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAdmin();
  const { id } = await params;
  const assetId = Number(id);

  if (!Number.isInteger(assetId)) notFound();

  const [asset, departments, users, types] = await Promise.all([
    prisma.asset.findUnique({ where: { id: assetId } }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true },
    }),
    prisma.inventType.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!asset) notFound();

  const departmentOptions = withDepartmentsPath(departments);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon-sm"
          render={<Link href={`/assets/${asset.id}`} />}
        >
          <ArrowLeft className="size-4" />
          <span className="sr-only">Kembali</span>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Edit Aset</h1>
          <p className="text-sm text-muted-foreground">{asset.assetName}</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <AssetForm
            departments={departmentOptions}
            users={users}
            types={types}
            updatedByName={user.name}
            defaultValues={{
              id: asset.id,
              inventTypeId: asset.inventTypeId,
              assetName: asset.assetName,
              code: asset.code,
              serialNumber: asset.serialNumber,
              departmentId: asset.departmentId,
              userId: asset.userId,
              condition: asset.condition,
              recordDate: toInputDate(asset.recordDate) ?? "",
              purchaseDate: toInputDate(asset.purchaseDate),
              note: asset.note,
              imageUrl: asset.imageUrl,
              docUrl: asset.docUrl,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
