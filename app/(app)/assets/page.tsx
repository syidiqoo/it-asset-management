import Link from "next/link";
import Image from "next/image";
import { Eye, Pencil, Plus, Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { CONDITION_BADGE, CONDITIONS, PAGE_SIZE } from "@/lib/constants";
import { parsePositiveInt } from "@/lib/params";
import { parseAssetFilters } from "@/lib/asset-filters";
import { withDepartmentsPath } from "@/lib/departments";
import { filterSelectClass } from "@/lib/ui-classes";
import { AssetExportMenu } from "@/components/asset-export-menu";
import { AssetImportDialog } from "@/components/asset-import-dialog";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const { q, departmentId, typeId, condition, where, query } =
    parseAssetFilters(params);
  const page = parsePositiveInt(params.page) ?? 1;

  const [total, assets, departments, types] = await Promise.all([
    prisma.asset.count({ where }),
    prisma.asset.findMany({
      where,
      include: {
        inventType: true,
        department: true,
        user: true,
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.inventType.findMany({ orderBy: { name: "asc" } }),
  ]);

  const departmentRows = withDepartmentsPath(departments);
  const pathById = new Map(departmentRows.map((item) => [item.id, item.path]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isAdmin = user.role === "ADMIN";

  function pageHref(targetPage: number) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (departmentId) search.set("departmentId", String(departmentId));
    if (typeId) search.set("typeId", String(typeId));
    if (condition) search.set("condition", condition);
    search.set("page", String(targetPage));
    return `/assets?${search.toString()}`;
  }

  const hasFilter = Boolean(q || departmentId || typeId || condition);

  return (
    <div className="flex flex-col gap-6">
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

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">No</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Asset Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Doc</TableHead>
                <TableHead>Purchase Date</TableHead>
                <TableHead>Updated By</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={15}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Tidak ada aset yang cocok.
                  </TableCell>
                </TableRow>
              ) : (
                assets.map((asset, index) => (
                  <TableRow key={asset.id}>
                    <TableCell className="pl-4 text-muted-foreground">
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell>{asset.inventType.name}</TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="hover:underline"
                      >
                        {asset.assetName}
                      </Link>
                    </TableCell>
                    <TableCell>{asset.code}</TableCell>
                    <TableCell>{asset.serialNumber ?? "-"}</TableCell>
                    <TableCell>{asset.user?.name ?? "-"}</TableCell>
                    <TableCell>
                      {pathById.get(asset.departmentId ?? -1) ??
                        asset.department?.name ??
                        "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={CONDITION_BADGE[asset.condition] ?? "secondary"}
                      >
                        {asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {asset.imageUrl ? (
                        <Image
                          src={asset.imageUrl}
                          alt={asset.assetName}
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 rounded-md border object-cover"
                        />
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(asset.recordDate)}</TableCell>
                    <TableCell>
                      {asset.docUrl ? (
                        <a
                          href={asset.docUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="underline underline-offset-2"
                        >
                          Lihat
                        </a>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
                    <TableCell>{asset.updatedBy?.name ?? "-"}</TableCell>
                    <TableCell
                      className="max-w-48 truncate"
                      title={asset.note ?? ""}
                    >
                      {asset.note ?? "-"}
                    </TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          render={<Link href={`/assets/${asset.id}`} />}
                        >
                          <Eye className="size-4" />
                          <span className="sr-only">Detail</span>
                        </Button>
                        {isAdmin ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              render={
                                <Link href={`/assets/${asset.id}/edit`} />
                              }
                            >
                              <Pencil className="size-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <DeleteAssetButton
                              id={asset.id}
                              name={asset.assetName}
                            />
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Halaman {page} dari {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={pageHref(page - 1)} />}
              >
                Sebelumnya
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Sebelumnya
              </Button>
            )}
            {page < totalPages ? (
              <Button
                variant="outline"
                size="sm"
                render={<Link href={pageHref(page + 1)} />}
              >
                Selanjutnya
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Selanjutnya
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
