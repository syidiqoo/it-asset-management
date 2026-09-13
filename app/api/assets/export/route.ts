import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseAssetFilters } from "@/lib/asset-filters";
import { withDepartmentsPath } from "@/lib/departments";
import { ASSET_EXPORT_HEADERS, assetToExportRow } from "@/lib/asset-export";
import { toCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Tidak memiliki akses." }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const filters = parseAssetFilters(Object.fromEntries(searchParams));

  const [assets, departments] = await Promise.all([
    prisma.asset.findMany({
      where: filters.where,
      include: {
        inventType: true,
        department: true,
        user: true,
        updatedBy: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, parentId: true, canHaveAdmin: true },
    }),
  ]);

  const departmentPaths = new Map(
    withDepartmentsPath(departments).map((item) => [item.id, item.path])
  );

  const rows = assets.map((asset, index) =>
    assetToExportRow(asset, index, departmentPaths)
  );

  if (searchParams.get("format") === "json") {
    return NextResponse.json(
      { headers: ASSET_EXPORT_HEADERS, rows, total: rows.length },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(toCsv(ASSET_EXPORT_HEADERS, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="aset-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
