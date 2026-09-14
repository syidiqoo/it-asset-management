"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Eye, Loader2, Pencil } from "lucide-react";
import type { AssetRow } from "@/lib/asset-list";
import { CONDITION_BADGE } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { DeleteAssetButton } from "@/components/delete-asset-button";
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
  initialAssets: AssetRow[];
  total: number;
  isAdmin: boolean;
  query: string;
  departmentPaths: Record<number, string>;
};

type AssetsResponse = {
  assets: AssetRow[];
  total: number;
  hasMore: boolean;
};

export function AssetTable({
  initialAssets,
  total,
  isAdmin,
  query,
  departmentPaths,
}: AssetTableProps) {
  const [assets, setAssets] = useState(initialAssets);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialAssets.length < total);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const inFlightRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    setError(false);

    const nextPage = page + 1;
    try {
      const params = new URLSearchParams(query);
      params.set("page", String(nextPage));
      const response = await fetch(`/api/assets?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Gagal memuat data.");

      const data = (await response.json()) as AssetsResponse;
      setAssets((prev) => [...prev, ...data.assets]);
      setPage(nextPage);
      setHasMore(data.hasMore && data.assets.length > 0);
    } catch {
      setError(true);
      setHasMore(false);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [page, query]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore, assets.length]);

  function retry() {
    setError(false);
    setHasMore(true);
    void loadMore();
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
                  {index + 1}
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
                <TableCell>
                  {(asset.departmentId != null
                    ? departmentPaths[asset.departmentId]
                    : undefined) ??
                    asset.departmentName ??
                    "-"}
                </TableCell>
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
                <TableCell className="max-w-48 truncate" title={asset.note ?? ""}>
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
                          render={<Link href={`/assets/${asset.id}/edit`} />}
                        >
                          <Pencil className="size-4" />
                          <span className="sr-only">Edit</span>
                        </Button>
                        <DeleteAssetButton id={asset.id} name={asset.assetName} />
                      </>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <div
        ref={sentinelRef}
        className="flex min-h-12 items-center justify-center px-4 py-3 text-sm text-muted-foreground"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Memuat aset...
          </span>
        ) : error ? (
          <span className="flex items-center gap-3">
            Gagal memuat data.
            <Button variant="outline" size="sm" onClick={retry}>
              Coba lagi
            </Button>
          </span>
        ) : hasMore ? (
          <span>Gulir ke bawah untuk memuat aset lainnya...</span>
        ) : assets.length > 0 ? (
          <span>
            Semua aset sudah ditampilkan ({assets.length} dari {total}).
          </span>
        ) : null}
      </div>
    </>
  );
}
