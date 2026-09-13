import Link from "next/link";
import { Search, X } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { first, parsePositiveInt } from "@/lib/params";
import { withDepartmentsPath } from "@/lib/departments";
import { filterSelectClass } from "@/lib/ui-classes";
import {
  AddSimCardDialog,
  DeleteSimCardDialog,
  EditSimCardDialog,
} from "@/components/sim-card-dialogs";
import {
  saveSimCardAction,
  deleteSimCardAction,
} from "@/lib/actions/sim-cards";
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

const numberFormat = new Intl.NumberFormat("id-ID");

function formatCredit(value: number | null) {
  return value === null ? "-" : numberFormat.format(value);
}

export default async function SimCardsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const q = (first(params.q) ?? "").trim();
  const departmentId = parsePositiveInt(params.departmentId);
  const packageId = parsePositiveInt(params.packageId);
  const isAdmin = user.role === "ADMIN";

  const where = {
    ...(q
      ? {
          OR: [
            { phoneNumber: { contains: q } },
            { user: { name: { contains: q } } },
          ],
        }
      : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(packageId ? { packageId } : {}),
  };

  const [simCards, users, departments, packages] = await Promise.all([
    prisma.simCard.findMany({
      where,
      include: { user: true, department: true, package: true },
      orderBy: { phoneNumber: "asc" },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, departmentId: true },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.simPackage.findMany({ orderBy: { name: "asc" } }),
  ]);

  const departmentRows = withDepartmentsPath(departments);
  const pathById = new Map(departmentRows.map((item) => [item.id, item.path]));

  const userOptions = users.map((item) => ({
    id: item.id,
    name: item.name,
    departmentPath: item.departmentId
      ? (pathById.get(item.departmentId) ?? null)
      : null,
  }));
  const packageOptions = packages.map((item) => ({
    id: item.id,
    name: item.name,
  }));

  const hasFilter = Boolean(q || departmentId || packageId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            SIM Card
          </h1>
          <p className="text-sm text-muted-foreground">
            {simCards.length} SIM Card ditemukan.
          </p>
        </div>
        {isAdmin ? (
          <AddSimCardDialog
            action={saveSimCardAction}
            users={userOptions}
            packages={packageOptions}
          />
        ) : null}
      </div>

      <Card size="sm">
        <CardContent>
          <form
            method="get"
            action="/sim-cards"
            className="flex flex-wrap items-end gap-2"
          >
            <div className="relative min-w-52 flex-1">
              <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Cari no handphone atau nama user"
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
              name="packageId"
              defaultValue={packageId ? String(packageId) : ""}
              className={filterSelectClass}
            >
              <option value="">Semua Package</option>
              {packageOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
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
                render={<Link href="/sim-cards" />}
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
                <TableHead className="pl-4">No Handphone</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>CLS Domestic</TableHead>
                <TableHead>CLS Roaming</TableHead>
                {isAdmin ? (
                  <TableHead className="pr-4 text-right">Aksi</TableHead>
                ) : null}
              </TableRow>
            </TableHeader>
            <TableBody>
              {simCards.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={isAdmin ? 7 : 6}
                    className="py-10 text-center text-muted-foreground"
                  >
                    {hasFilter
                      ? "Tidak ada SIM Card yang cocok."
                      : "Belum ada SIM Card."}
                  </TableCell>
                </TableRow>
              ) : (
                simCards.map((sim) => (
                  <TableRow key={sim.id}>
                    <TableCell className="pl-4 font-medium">
                      {sim.phoneNumber}
                    </TableCell>
                    <TableCell>{sim.user?.name ?? "-"}</TableCell>
                    <TableCell>
                      {pathById.get(sim.departmentId ?? -1) ??
                        sim.department?.name ??
                        "-"}
                    </TableCell>
                    <TableCell>{sim.package?.name ?? "-"}</TableCell>
                    <TableCell>{formatCredit(sim.clsDomestic)}</TableCell>
                    <TableCell>{formatCredit(sim.clsRoaming)}</TableCell>
                    {isAdmin ? (
                      <TableCell className="pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <EditSimCardDialog
                            action={saveSimCardAction}
                            users={userOptions}
                            packages={packageOptions}
                            simCard={{
                              id: sim.id,
                              phoneNumber: sim.phoneNumber,
                              userId: sim.userId,
                              packageId: sim.packageId,
                              clsDomestic: sim.clsDomestic,
                              clsRoaming: sim.clsRoaming,
                            }}
                          />
                          <DeleteSimCardDialog
                            action={deleteSimCardAction}
                            id={sim.id}
                            phoneNumber={sim.phoneNumber}
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
