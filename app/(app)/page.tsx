import Link from "next/link";
import {
  Boxes,
  Building2,
  HardDrive,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { withDepartmentsPath } from "@/lib/departments";
import { formatDate } from "@/lib/format";
import { CONDITION_BADGE } from "@/lib/constants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BannerHero } from "@/components/banner-hero";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
}) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [
    assetCount,
    userCount,
    departmentCount,
    typeCount,
    byType,
    byCondition,
    byDepartment,
    recent,
  ] = await Promise.all([
      prisma.asset.count(),
      prisma.user.count(),
      prisma.department.count(),
      prisma.inventType.count(),
      prisma.inventType.findMany({
        include: { _count: { select: { assets: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.asset.groupBy({ by: ["condition"], _count: { _all: true } }),
      prisma.department.findMany({
        include: { _count: { select: { assets: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.asset.findMany({
        take: 5,
        orderBy: { updatedAt: "desc" },
        include: { inventType: true, department: true, user: true },
      }),
    ]);

  const conditionMap = new Map(
    byCondition.map((item) => [item.condition, item._count._all])
  );

  const departmentPaths = new Map(
    withDepartmentsPath(byDepartment).map((item) => [item.id, item.path])
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 11
      ? "Selamat pagi"
      : hour < 15
        ? "Selamat siang"
        : hour < 19
          ? "Selamat sore"
          : "Selamat malam";
  const todayLabel = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="flex flex-col gap-6">
      <BannerHero
        title={`${greeting}, ${user.name}`}
        subtitle={`Ringkasan inventaris IT per ${todayLabel}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Aset" value={assetCount} icon={HardDrive} />
        <StatCard label="Total User" value={userCount} icon={Users} />
        <StatCard label="Department" value={departmentCount} icon={Building2} />
        <StatCard label="Kategori Inventaris" value={typeCount} icon={Tags} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Aset per Kategori Inventaris</CardTitle>
            <CardDescription>Jumlah aset untuk setiap kategori.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {byType.map((type) => (
              <div
                key={type.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <Boxes className="size-4 text-muted-foreground" />
                  {type.name}
                </span>
                <span className="font-medium">{type._count.assets}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aset per Department</CardTitle>
            <CardDescription>Sebaran aset tiap department.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {byDepartment.map((department) => (
              <div
                key={department.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <Building2 className="size-4 text-muted-foreground" />
                  {departmentPaths.get(department.id) ?? department.name}
                </span>
                <span className="font-medium">
                  {department._count.assets}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Kondisi Aset</CardTitle>
            <CardDescription>Distribusi kondisi seluruh aset.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {["Good", "Fair", "Damaged", "Under Repair"].map((condition) => (
              <div
                key={condition}
                className="flex items-center justify-between text-sm"
              >
                <Badge variant={CONDITION_BADGE[condition] ?? "secondary"}>
                  {condition}
                </Badge>
                <span className="font-medium">
                  {conditionMap.get(condition) ?? 0}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aset Terbaru</CardTitle>
          <CardDescription>
            Lima aset yang terakhir diperbarui.{" "}
            <Link href="/assets" className="underline underline-offset-2">
              Lihat semua
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Purchase Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-8 text-center text-muted-foreground"
                  >
                    Belum ada data aset.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/assets/${asset.id}`}
                        className="hover:underline"
                      >
                        {asset.assetName}
                      </Link>
                    </TableCell>
                    <TableCell>{asset.inventType.name}</TableCell>
                    <TableCell>{asset.user?.name ?? "-"}</TableCell>
                    <TableCell>{asset.department?.name ?? "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={CONDITION_BADGE[asset.condition] ?? "secondary"}
                      >
                        {asset.condition}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(asset.purchaseDate)}</TableCell>
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
