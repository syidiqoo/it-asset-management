import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAssetFilters } from "@/lib/asset-filters";
import { parsePositiveInt } from "@/lib/params";
import { PAGE_SIZE } from "@/lib/constants";
import { assetListInclude, assetListOrderBy, toAssetRow } from "@/lib/asset-list";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const filters = parseAssetFilters(Object.fromEntries(searchParams));
  const page = parsePositiveInt(searchParams.get("page")) ?? 1;

  const [total, assets] = await Promise.all([
    prisma.asset.count({ where: filters.where }),
    prisma.asset.findMany({
      where: filters.where,
      include: assetListInclude,
      orderBy: assetListOrderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);

  return NextResponse.json(
    {
      assets: assets.map(toAssetRow),
      total,
      page,
      pageSize: PAGE_SIZE,
      hasMore: page * PAGE_SIZE < total,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
