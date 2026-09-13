import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  AddDepartmentDialog,
  DeleteDepartmentDialog,
  EditDepartmentDialog,
} from "@/components/department-dialogs";
import {
  deleteDepartmentAction,
  saveDepartmentAction,
} from "@/lib/actions/departments";
import { withDepartmentsPath } from "@/lib/departments";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function DepartmentsPage() {
  await requireAdmin();

  const departments = await prisma.department.findMany({
    include: {
      _count: { select: { users: true, assets: true, children: true } },
    },
  });

  const rows = withDepartmentsPath(departments);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            Department
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola struktur: department, base, dan unit. Nama orang diisi di
            menu User.
          </p>
        </div>
        <AddDepartmentDialog
          action={saveDepartmentAction}
          departments={rows}
        />
      </div>

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
                    Belum ada department.
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
                          departments={rows}
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
