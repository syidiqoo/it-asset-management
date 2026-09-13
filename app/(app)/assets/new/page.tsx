import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { withDepartmentsPath } from "@/lib/departments";
import { AssetForm } from "@/components/asset-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewAssetPage() {
  const user = await requireAdmin();

  const [departments, users, types] = await Promise.all([
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true },
    }),
    prisma.inventType.findMany({ orderBy: { name: "asc" } }),
  ]);

  const departmentOptions = withDepartmentsPath(departments);

  return (
    <div className="flex flex-col gap-6">
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
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Tambah Aset</h1>
          <p className="text-sm text-muted-foreground">
            Lengkapi data aset baru.
          </p>
        </div>
      </div>

      <Card>
        <CardContent>
          <AssetForm
            departments={departmentOptions}
            users={users}
            types={types}
            updatedByName={user.name}
          />
        </CardContent>
      </Card>
    </div>
  );
}
