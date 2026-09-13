import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  AddNameButton,
  DeleteNameDialog,
  EditNameDialog,
} from "@/components/master-data";
import {
  deleteSimPackageAction,
  saveSimPackageAction,
} from "@/lib/actions/sim-packages";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SimPackagesPage() {
  await requireAdmin();

  const packages = await prisma.simPackage.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { simCards: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            Package SIM
          </h1>
          <p className="text-sm text-muted-foreground">
            Daftar paket untuk inventaris SIM Card.
          </p>
        </div>
        <AddNameButton action={saveSimPackageAction} label="Package" />
      </div>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama Package</TableHead>
                <TableHead>Jumlah SIM</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {packages.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Belum ada package.
                  </TableCell>
                </TableRow>
              ) : (
                packages.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="pl-4 font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell>{item._count.simCards}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditNameDialog
                          action={saveSimPackageAction}
                          id={item.id}
                          defaultValue={item.name}
                        />
                        <DeleteNameDialog
                          action={deleteSimPackageAction}
                          id={item.id}
                          name={item.name}
                          entityLabel="package"
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
