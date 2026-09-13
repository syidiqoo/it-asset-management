import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import {
  AddNameButton,
  DeleteNameDialog,
  EditNameDialog,
} from "@/components/master-data";
import {
  deleteInventTypeAction,
  saveInventTypeAction,
} from "@/lib/actions/invent-types";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function InventTypesPage() {
  await requireAdmin();

  const types = await prisma.inventType.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assets: true } } },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            Kategori Inventaris
          </h1>
          <p className="text-sm text-muted-foreground">
            Contoh: Laptop, Phone, PC, Printer.
          </p>
        </div>
        <AddNameButton action={saveInventTypeAction} label="Kategori Inventaris" />
      </div>

      <Card>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama Kategori</TableHead>
                <TableHead>Jumlah Aset</TableHead>
                <TableHead className="pr-4 text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Belum ada kategori inventaris.
                  </TableCell>
                </TableRow>
              ) : (
                types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell className="pl-4 font-medium">
                      {type.name}
                    </TableCell>
                    <TableCell>{type._count.assets}</TableCell>
                    <TableCell className="pr-4">
                      <div className="flex items-center justify-end gap-1">
                        <EditNameDialog
                          action={saveInventTypeAction}
                          id={type.id}
                          defaultValue={type.name}
                        />
                        <DeleteNameDialog
                          action={deleteInventTypeAction}
                          id={type.id}
                          name={type.name}
                          entityLabel="kategori inventaris"
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
