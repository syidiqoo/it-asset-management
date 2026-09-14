import Link from "next/link";
import { Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  ROLE_BADGE,
  ROLE_LABELS,
  ROLE_SHORT_LABELS,
  ROLES,
} from "@/lib/constants";
import { first, parsePositiveInt } from "@/lib/params";
import { withDepartmentsPath } from "@/lib/departments";
import { filterSelectClass } from "@/lib/ui-classes";
import {
  AddUserDialog,
  DeleteUserButton,
  EditUserDialog,
} from "@/components/user-dialogs";
import { saveUserAction, deleteUserAction } from "@/lib/actions/users";
import { importUsersAction } from "@/lib/actions/user-import";
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

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const currentUser = await requireUser();
  const params = await searchParams;

  const q = (first(params.q) ?? "").trim();
  const departmentFilter = parsePositiveInt(params.departmentId);
  const roleValue = first(params.role) ?? "";
  const role = (ROLES as readonly string[]).includes(roleValue) ? roleValue : "";
  const isAdmin = currentUser.role === "ADMIN";

  const where = {
    ...(q
      ? { OR: [{ name: { contains: q } }, { username: { contains: q } }] }
      : {}),
    ...(departmentFilter ? { departmentId: departmentFilter } : {}),
    ...(role ? { role } : {}),
  };

  const [users, allDepartments] = await Promise.all([
    prisma.user.findMany({
      where,
      include: { department: true },
      orderBy: [{ departmentId: "asc" }, { name: "asc" }],
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  const departmentRows = withDepartmentsPath(allDepartments);
  const pathById = new Map(departmentRows.map((item) => [item.id, item.path]));
  const hasFilter = Boolean(q || departmentFilter || role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            User
          </h1>
          <p className="text-sm text-muted-foreground">
            {users.length} user ditemukan. Posisi dipilih dari struktur di menu
            Department.
          </p>
        </div>
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-2">
            <CsvExportButton href="/api/users/export" />
            <CsvImportDialog
              action={importUsersAction}
              title="Import User (CSV)"
              description="Baris dengan ID akan diperbarui; baris tanpa ID akan dibuat baru."
              columnsHint="Kolom: ID, Nama, Username, Role, Posisi, Password. Password wajib untuk role Admin/Guest pada baris baru."
            />
            <AddUserDialog action={saveUserAction} departments={departmentRows} />
          </div>
        ) : null}
      </div>

      <Card size="sm">
        <CardContent>
          <form
            method="get"
            action="/users"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="relative min-w-52 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Cari nama atau username"
                className="pl-8"
              />
            </div>

            <select
              name="departmentId"
              defaultValue={departmentFilter ? String(departmentFilter) : ""}
              className={filterSelectClass}
            >
              <option value="">Semua Posisi</option>
              {departmentRows.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.path}
                </option>
              ))}
            </select>

            <select
              name="role"
              defaultValue={role}
              className={filterSelectClass}
            >
              <option value="">Semua Role</option>
              {ROLES.map((item) => (
                <option key={item} value={item}>
                  {ROLE_LABELS[item] ?? item}
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
                render={<Link href="/users" />}
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
                <TableHead className="pl-4">Nama</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Posisi</TableHead>
                {isAdmin ? (
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 5 : 4}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {hasFilter
                      ? "Tidak ada user yang cocok."
                      : "Belum ada user. Tambahkan lewat tombol di atas."}
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="pl-4 font-medium">
                      {user.name}
                    </TableCell>
                    <TableCell>
                      {user.role === "NON_USER" ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        user.username
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={ROLE_BADGE[user.role] ?? "secondary"}>
                        {ROLE_SHORT_LABELS[user.role] ?? user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {pathById.get(user.departmentId ?? -1) ??
                        user.department?.name ??
                        "-"}
                    </TableCell>
                    {isAdmin ? (
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <EditUserDialog
                            action={saveUserAction}
                            departments={departmentRows}
                            user={{
                              id: user.id,
                              name: user.name,
                              username: user.username,
                              role: user.role,
                              departmentId: user.departmentId,
                            }}
                          />
                          <DeleteUserButton
                            action={deleteUserAction}
                            id={user.id}
                            name={user.name}
                          />
                        </div>
                      </TableCell>
                    ) : null}
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
