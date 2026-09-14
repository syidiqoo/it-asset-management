import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { CONDITIONS, PAGE_SIZE } from "@/lib/constants";
import { parseAssetFilters } from "@/lib/asset-filters";
import { parsePositiveInt } from "@/lib/params";
import { withDepartmentsPath } from "@/lib/departments";
import { assetListInclude, assetListOrderBy, toAssetRow } from "@/lib/asset-list";
import { filterSelectClass } from "@/lib/ui-classes";
import { AssetExportMenu } from "@/components/asset-export-menu";
import { AssetImportDialog } from "@/components/asset-import-dialog";
import { AssetTable } from "@/components/asset-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const { q, departmentId, typeId, condition, where, query } =
    parseAssetFilters(params);

  const requestedPage = parsePositiveInt(params.page) ?? 1;

  const [total, departments, types] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.inventType.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);

  const assets = await prisma.asset.findMany({
    where,
    include: assetListInclude,
    orderBy: assetListOrderBy,
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const departmentRows = withDepartmentsPath(departments);
  const departmentPaths: Record<number, string> = {};
  for (const department of departmentRows) {
    departmentPaths[department.id] = department.path;
  }

  const isAdmin = user.role === "ADMIN";
  const hasFilter = Boolean(q || departmentId || typeId || condition);

  return (
    <div className="flex flex-col gap-6 md:gap-3">
      {/* Header + filter dibuat sticky supaya tidak ikut ter-scroll. Negative
          margin + padding dipakai agar background-nya menutupi area padding
          wrapper halaman. Sticky hanya aktif di md+ karena di mobile sudah ada
          header navigasi yang juga sticky dan tingginya dinamis. */}
      <div className="flex flex-col gap-6 md:sticky md:top-0 md:z-20 md:-mx-8 md:-mt-8 md:bg-background md:px-8 md:pt-8 md:pb-3 lg:-mx-10 lg:-mt-10 lg:px-10 lg:pt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Data Aset</h1>
            <p className="text-sm text-muted-foreground">
              {total} aset ditemukan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AssetExportMenu query={query} />
            {isAdmin ? (
              <>
                <AssetImportDialog />
                <Button render={<Link href="/assets/new" />}>
                  <Plus className="size-4" />
                  Tambah Aset
                </Button>
              </>
            ) : null}
          </div>
        </div>

        <Card size="sm">
          <CardContent>
            <form
              method="get"
              action="/assets"
              className="flex flex-wrap items-end gap-2"
            >
              <div className="relative min-w-52 flex-1">
                <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="q"
                  defaultValue={q}
                  placeholder="Cari nama, code, atau serial number"
                  className="pl-8"
                />
              </div>

              <select
                name="departmentId"
                defaultValue={departmentId ? String(departmentId) : ""}
                className={filterSelectClass}
              >
                <option value="">Semua Department</option>
                {departmentRows.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.path}
                  </option>
                ))}
              </select>

              <select
                name="typeId"
                defaultValue={typeId ? String(typeId) : ""}
                className={filterSelectClass}
              >
                <option value="">Semua Kategori</option>
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>

              <select
                name="condition"
                defaultValue={condition}
                className={filterSelectClass}
              >
                <option value="">Semua Kondisi</option>
                {CONDITIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <Button type="submit" variant="secondary">
                Filter
              </Button>

              {hasFilter ? (
                <Button
                  type="button"
                  variant="ghost"
                  render={<Link href="/assets" />}
                >
                  <X className="size-4" />
                  Reset
                </Button>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="px-0">
          <AssetTable
            assets={assets.map(toAssetRow)}
            total={total}
            page={page}
            query={query}
            departmentPaths={departmentPaths}
          />
        </CardContent>
      </Card>
    </div>
  );
}
