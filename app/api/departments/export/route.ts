import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withDepartmentsPath } from "@/lib/departments";
import {
  DEPARTMENT_EXPORT_HEADERS,
  departmentToExportRow,
} from "@/lib/department-export";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Tidak memiliki akses." },
      { status: 401 }
    );
  }

  const departments = await prisma.department.findMany({
    select: { id: true, name: true, parentId: true, canHaveAdmin: true },
  });

  // withDepartmentsPath mengembalikan urutan by path, jadi induk selalu
  // muncul sebelum anaknya — enak dipakai sebagai template import.
  const rows = withDepartmentsPath(departments);
  const pathById = new Map(rows.map((item) => [item.id, item.path]));

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(
    toCsv(
      DEPARTMENT_EXPORT_HEADERS,
      rows.map((item) => departmentToExportRow(item, pathById))
    ),
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="department-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    }
  );
}
