import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withDepartmentsPath } from "@/lib/departments";
import { USER_EXPORT_HEADERS, userToExportRow } from "@/lib/user-export";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 }
    );
  }

  const [users, departments] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        departmentId: true,
      },
    }),
    prisma.department.findMany({
      select: { id: true, name: true, parentId: true },
    }),
  ]);

  const pathById = new Map(
    withDepartmentsPath(departments).map((item) => [item.id, item.path])
  );

  const sorted = [...users].sort((a, b) => {
    const pathA = a.departmentId ? (pathById.get(a.departmentId) ?? "") : "";
    const pathB = b.departmentId ? (pathById.get(b.departmentId) ?? "") : "";
    return pathA.localeCompare(pathB) || a.name.localeCompare(b.name);
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(
    toCsv(
      USER_EXPORT_HEADERS,
      sorted.map((item) => userToExportRow(item, pathById))
    ),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="user-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
