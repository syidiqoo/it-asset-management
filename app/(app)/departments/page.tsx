import Link from "next/link";
import { Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { first, parsePositiveInt } from "@/lib/params";
import { descendantIds, withDepartmentsPath } from "@/lib/departments";
import { filterSelectClass } from "@/lib/ui-classes";
import {
  AddDepartmentDialog,
  DeleteDepartmentDialog,
  EditDepartmentDialog,
} from "@/components/department-dialogs";
import {
  deleteDepartmentAction,
  saveDepartmentAction,
} from "@/lib/actions/departments";
import { importDepartmentsAction } from "@/lib/actions/department-import";
import { CsvExportButton } from "@/components/csv-export-button";
import { CsvImportDialog } from "@/components/csv-import-dialog";
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

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const q = (first(params.q) ?? "").trim();
  const parentId = parsePositiveInt(params.parentId);

  const departments = await prisma.department.findMany({
    include: {
      _count: { select: { users: true, assets: true, children: true } },
    },
  });

  const allRows = withDepartmentsPath(departments);

  // Filter "induk" menampilkan department terpilih beserta seluruh turunannya.
  const scope = parentId
    ? new Set([parentId, ...descendantIds(parentId, departments)])
    : null;
  const needle = q.toLowerCase();

  const rows = allRows.filter((row) => {
    if (scope && !scope.has(row.id)) return false;
    if (!needle) return true;
    return (
      row.name.toLowerCase().includes(needle) ||
      row.path.toLowerCase().includes(needle)
    );
  });

  const hasFilter = Boolean(q || parentId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            Department
          </h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} department ditemukan.
          </p>
          <p className="text-sm text-muted-foreground">
            Kelola struktur: department, base, dan unit. Nama orang diisi di
            menu User.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CsvExportButton href="/api/departments/export" />
          <CsvImportDialog
            action={importDepartmentsAction}
            title="Import Department (CSV)"
            description="Baris dengan ID akan diperbarui; baris tanpa ID akan dibuat baru."
            columnsHint="Kolom: ID, Nama, Induk, Boleh Admin. Isi Induk dengan path lengkap, mis. Operations > Base."
          />
          <AddDepartmentDialog
            action={saveDepartmentAction}
            departments={allRows}
          />
        </div>
      </div>

      <Card size="sm">
        <CardContent>
          <form
            method="get"
            action="/departments"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="relative min-w-52 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Cari nama atau path department"
                className="pl-8"
              />
            </div>

            <select
              name="parentId"
              defaultValue={parentId ? String(parentId) : ""}
              className={filterSelectClass}
            >
              <option value="">Semua Induk</option>
              {allRows.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.path}
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
                render={<Link href="/departments" />}
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
                <TableHead className="pl-4">Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Boleh Admin</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Sub</TableHead>
                <TableHead>Aset</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {hasFilter
                      ? "Tidak ada department yang cocok."
                      : "Belum ada department."}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-4">
                      <span className="font-medium">{row.name}</span>
                      {row.isSub ? (
                        <span className="block text-xs text-muted-foreground">
                          {row.path}
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {row.isSub ? (
                        <Badge variant="outline">Sub Department</Badge>
                      ) : (
                        <Badge variant="secondary">Department</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.canHaveAdmin ? (
                        <Badge variant="success">Ya</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{row._count.users}</TableCell>
                    <TableCell>{row._count.children}</TableCell>
                    <TableCell>{row._count.assets}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditDepartmentDialog
                          action={saveDepartmentAction}
                          departments={allRows}
                          department={row}
                        />
                        <DeleteDepartmentDialog
                          action={deleteDepartmentAction}
                          id={row.id}
                          name={row.path}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
