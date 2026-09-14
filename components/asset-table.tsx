"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AssetRow } from "@/lib/asset-list";
import { CONDITION_BADGE, PAGE_SIZE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AssetTableProps = {
  assets: AssetRow[];
  total: number;
  page: number;
  query: string;
  departmentPaths: Record<number, string>;
};

// Path panjang seperti "Operations > Base Padang > Unit Gunungsitoli" bikin
// kolom Department sulit dibaca, jadi yang tampil cukup segmen terakhirnya.
function departmentLabel(
  asset: AssetRow,
  departmentPaths: Record<number, string>
) {
  const full =
    (asset.departmentId != null
      ? departmentPaths[asset.departmentId]
      : undefined) ??
    asset.departmentName ??
    null;
  if (!full) return null;

  const last = full.split(" > ").pop()?.trim();
  return { full, short: last && last.length > 0 ? last : full };
}

function DepartmentCell({
  asset,
  departmentPaths,
}: {
  asset: AssetRow;
  departmentPaths: Record<number, string>;
}) {
  const label = departmentLabel(asset, departmentPaths);
  if (!label) return <TableCell>-</TableCell>;

  return <TableCell title={label.full}>{label.short}</TableCell>;
}

export function AssetTable({
  assets,
  total,
  page,
  query,
  departmentPaths,
}: AssetTableProps) {
  const router = useRouter();
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE;
  const from = total === 0 ? 0 : startIndex + 1;
  const to = startIndex + assets.length;

  function pageHref(target: number) {
    const params = new URLSearchParams(query);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs ? `/assets?${qs}` : "/assets";
  }

  return (
    <>
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
            <TableHead className="pr-4">Note</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={14}
                className="py-10 text-center text-muted-foreground"
              >
                Tidak ada aset yang cocok.
              </TableCell>
            </TableRow>
          ) : (
            assets.map((asset, index) => (
              <TableRow
                key={asset.id}
                role="link"
                tabIndex={0}
                aria-label={`Lihat detail ${asset.assetName}`}
                className="cursor-pointer focus-visible:bg-accent/60 focus-visible:outline-none"
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest("a, button")) return;
                  router.push(`/assets/${asset.id}`);
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  router.push(`/assets/${asset.id}`);
                }}
              >
                <TableCell className="pl-4 text-muted-foreground">
                  {startIndex + index + 1}
                </TableCell>
                <TableCell>{asset.inventTypeName}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/assets/${asset.id}`} className="hover:underline">
                    {asset.assetName}
                  </Link>
                </TableCell>
                <TableCell>{asset.code}</TableCell>
                <TableCell>{asset.serialNumber ?? "-"}</TableCell>
                <TableCell>{asset.userName ?? "-"}</TableCell>
                <DepartmentCell
                  asset={asset}
                  departmentPaths={departmentPaths}
                />
                <TableCell>
                  <Badge variant={CONDITION_BADGE[asset.condition] ?? "secondary"}>
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
                <TableCell>{asset.updatedByName ?? "-"}</TableCell>
                <TableCell
                  className="max-w-48 truncate pr-4"
                  title={asset.note ?? ""}
                >
                  {asset.note ?? "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div className="flex flex-col items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground sm:flex-row">
        <span>
          {total === 0
            ? "Tidak ada aset."
            : `Menampilkan ${from}–${to} dari ${total} aset.`}
        </span>
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Button
              variant="outline"
              size="icon-sm"
              render={
                <Link href={pageHref(page - 1)} aria-label="Halaman sebelumnya" />
              }
            >
              <ChevronLeft className="size-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon-sm"
              disabled
              aria-label="Halaman sebelumnya"
            >
              <ChevronLeft className="size-4" />
            </Button>
          )}

          <span className="px-2 tabular-nums">
            Hal {page} / {totalPages}
          </span>

          {page < totalPages ? (
            <Button
              variant="outline"
              size="icon-sm"
              render={
                <Link href={pageHref(page + 1)} aria-label="Halaman berikutnya" />
              }
            >
              <ChevronRight className="size-4" />
            </Button>
          ) : (
            <Button
              variant="outline"
              size="icon-sm"
              disabled
              aria-label="Halaman berikutnya"
            >
              <ChevronRight className="size-4" />
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
