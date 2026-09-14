import "dotenv/config";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL belum diatur.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEPARTMENTS: { name: string; parent?: string; canHaveAdmin?: boolean }[] = [
  { name: "IT", canHaveAdmin: true },
  { name: "Management", canHaveAdmin: true },
  { name: "HR" },
  { name: "Finance" },
  { name: "Marketing" },
  { name: "Operations" },
  { name: "Base", parent: "Operations" },
  { name: "Base Jakarta", parent: "Base" },
  { name: "Base Padang", parent: "Base" },
  { name: "Tello", parent: "Base Padang" },
  { name: "Gunung Sitoli", parent: "Base Padang" },
  { name: "Unknown" },
];

const INVENT_TYPES = ["Laptop", "Phone", "PC", "Printer", "Unknown"];

const SIM_PACKAGES = ["Halo+", "Enterprise Silver", "Enterprise Diamond"];

const EMPLOYEES: { name: string; username: string; department: string }[] = [
  { name: "Budi Santoso", username: "budi", department: "IT" },
  { name: "Siti Aminah", username: "siti", department: "IT" },
  { name: "Andi Wijaya", username: "andi", department: "HR" },
  { name: "Rina Melati", username: "rina", department: "HR" },
  { name: "Dewi Lestari", username: "dewi", department: "Finance" },
  { name: "Agus Pratama", username: "agus", department: "Finance" },
  { name: "Fajar Nugroho", username: "fajar", department: "Marketing" },
  { name: "Maya Sari", username: "maya", department: "Marketing" },
  { name: "Hendra Gunawan", username: "hendra", department: "Operations" },
  { name: "Lina Marlina", username: "lina", department: "Operations" },
];

const PERSONNEL: { name: string; username: string; department: string }[] = [
  { name: "Rudi Hartono", username: "rudi", department: "Base Jakarta" },
  { name: "Sari Wulandari", username: "sari", department: "Tello" },
  { name: "Joko Susilo", username: "joko", department: "Gunung Sitoli" },
];

async function main() {
  const departmentIds: Record<string, number> = {};
  for (const dept of DEPARTMENTS) {
    const parentId = dept.parent ? departmentIds[dept.parent] : null;
    const saved = await prisma.department.upsert({
      where: { name: dept.name },
      update: {
        canHaveAdmin: Boolean(dept.canHaveAdmin),
        ...(dept.parent ? { parentId } : {}),
      },
      create: {
        name: dept.name,
        canHaveAdmin: Boolean(dept.canHaveAdmin),
        parentId,
      },
    });
    departmentIds[dept.name] = saved.id;
  }

  const typeIds: Record<string, number> = {};
  for (const name of INVENT_TYPES) {
    const type = await prisma.inventType.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    typeIds[name] = type.id;
  }

  const packageIds: Record<string, number> = {};
  for (const name of SIM_PACKAGES) {
    const simPackage = await prisma.simPackage.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    packageIds[name] = simPackage.id;
  }

  const adminPassword = await bcrypt.hash("admin123", 10);
  const guestPassword = await bcrypt.hash("guest123", 10);
  const employeePassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: { passwordHash: adminPassword, role: "ADMIN" },
    create: {
      username: "admin",
      name: "Administrator",
      passwordHash: adminPassword,
      role: "ADMIN",
      departmentId: departmentIds["IT"],
    },
  });

  await prisma.user.upsert({
    where: { username: "guest" },
    update: { passwordHash: guestPassword, role: "GUEST" },
    create: {
      username: "guest",
      name: "Guest Viewer",
      passwordHash: guestPassword,
      role: "GUEST",
      departmentId: departmentIds["IT"],
    },
  });

  const userIds: Record<string, number> = { admin: admin.id };
  for (const employee of EMPLOYEES) {
    const user = await prisma.user.upsert({
      where: { username: employee.username },
      update: {},
      create: {
        username: employee.username,
        name: employee.name,
        passwordHash: employeePassword,
        role: "GUEST",
        departmentId: departmentIds[employee.department],
      },
    });
    userIds[employee.username] = user.id;
  }

  for (const person of PERSONNEL) {
    const user = await prisma.user.upsert({
      where: { username: person.username },
      update: {},
      create: {
        username: person.username,
        name: person.name,
        passwordHash: employeePassword,
        role: "NON_USER",
        departmentId: departmentIds[person.department],
      },
    });
    userIds[person.username] = user.id;
  }

  await prisma.user.upsert({
    where: { username: "unknown" },
    update: {},
    create: {
      username: "unknown",
      name: "Unknown",
      passwordHash: await bcrypt.hash(randomUUID(), 10),
      role: "NON_USER",
      departmentId: departmentIds["Unknown"],
    },
  });

  const sampleAssets: {
    inventType: string;
    assetName: string;
    code: string;
    serialNumber: string;
    username: string;
    department: string;
    condition: string;
    purchaseDate: Date;
    note: string;
  }[] = [
    {
      inventType: "Laptop",
      assetName: "Lenovo ThinkPad E14",
      code: "IT-LP-001",
      serialNumber: "PF3A1B2C",
      username: "budi",
      department: "IT",
      condition: "Good",
      purchaseDate: new Date("2023-02-14"),
      note: "Digunakan untuk development",
    },
    {
      inventType: "Laptop",
      assetName: "HP ProBook 450 G9",
      code: "IT-LP-002",
      serialNumber: "5CD2149XYZ",
      username: "dewi",
      department: "Finance",
      condition: "Fair",
      purchaseDate: new Date("2022-08-01"),
      note: "Baterai mulai cepat habis",
    },
    {
      inventType: "PC",
      assetName: "Dell OptiPlex 3000",
      code: "IT-PC-001",
      serialNumber: "DL3000-8891",
      username: "siti",
      department: "IT",
      condition: "Good",
      purchaseDate: new Date("2023-06-20"),
      note: "Workstation admin server",
    },
    {
      inventType: "Phone",
      assetName: "Samsung Galaxy A54",
      code: "IT-PH-001",
      serialNumber: "R58T99887KL",
      username: "fajar",
      department: "Marketing",
      condition: "Good",
      purchaseDate: new Date("2024-01-10"),
      note: "Untuk keperluan campaign",
    },
    {
      inventType: "Printer",
      assetName: "Epson L3250",
      code: "IT-PR-001",
      serialNumber: "X7Y2Z00012",
      username: "lina",
      department: "Operations",
      condition: "Under Repair",
      purchaseDate: new Date("2021-11-05"),
      note: "Sedang diperbaiki di service center",
    },
    {
      inventType: "Laptop",
      assetName: "Asus VivoBook 14",
      code: "IT-LP-003",
      serialNumber: "ASVB14-7712",
      username: "andi",
      department: "HR",
      condition: "Damaged",
      purchaseDate: new Date("2020-04-18"),
      note: "Layar rusak, menunggu penggantian",
    },
    {
      inventType: "Phone",
      assetName: "Xiaomi Redmi Note 12",
      code: "IT-PH-002",
      serialNumber: "XM12-445902",
      username: "rina",
      department: "HR",
      condition: "Good",
      purchaseDate: new Date("2024-03-02"),
      note: "Baru",
    },
    {
      inventType: "PC",
      assetName: "Lenovo ThinkCentre M70q",
      code: "IT-PC-002",
      serialNumber: "TC70Q-3391",
      username: "agus",
      department: "Finance",
      condition: "Good",
      purchaseDate: new Date("2023-09-12"),
      note: "Untuk input jurnal bulanan",
    },
    {
      inventType: "Laptop",
      assetName: "Acer Aspire 3",
      code: "IT-LP-004",
      serialNumber: "ACAS3-4451",
      username: "rudi",
      department: "Base Jakarta",
      condition: "Good",
      purchaseDate: new Date("2024-05-01"),
      note: "Perangkat operasional Base Jakarta",
    },
    {
      inventType: "Laptop",
      assetName: "Dell Latitude 3440",
      code: "IT-LP-005",
      serialNumber: "DL3440-1201",
      username: "sari",
      department: "Tello",
      condition: "Good",
      purchaseDate: new Date("2024-06-15"),
      note: "Perangkat unit Tello",
    },
    {
      inventType: "Phone",
      assetName: "Oppo A78",
      code: "IT-PH-003",
      serialNumber: "OPA78-7781",
      username: "joko",
      department: "Gunung Sitoli",
      condition: "Fair",
      purchaseDate: new Date("2023-11-20"),
      note: "Perangkat unit Gunung Sitoli",
    },
  ];

  for (const asset of sampleAssets) {
    await prisma.asset.upsert({
      where: { code: asset.code },
      update: {},
      create: {
        inventTypeId: typeIds[asset.inventType],
        assetName: asset.assetName,
        code: asset.code,
        serialNumber: asset.serialNumber,
        userId: userIds[asset.username],
        departmentId: departmentIds[asset.department],
        condition: asset.condition,
        recordDate: new Date(),
        purchaseDate: asset.purchaseDate,
        updatedById: admin.id,
        note: asset.note,
      },
    });
  }

  const sampleSimCards: {
    phoneNumber: string;
    username: string;
    department: string;
    simPackage: string;
    clsDomestic: number;
    clsRoaming: number;
  }[] = [
    {
      phoneNumber: "0811-1000-001",
      username: "budi",
      department: "IT",
      simPackage: "Halo+",
      clsDomestic: 150000,
      clsRoaming: 50000,
    },
    {
      phoneNumber: "0811-1000-002",
      username: "dewi",
      department: "Finance",
      simPackage: "Enterprise Silver",
      clsDomestic: 250000,
      clsRoaming: 100000,
    },
    {
      phoneNumber: "0811-1000-003",
      username: "rudi",
      department: "Base Jakarta",
      simPackage: "Enterprise Diamond",
      clsDomestic: 500000,
      clsRoaming: 250000,
    },
  ];

  for (const sim of sampleSimCards) {
    await prisma.simCard.upsert({
      where: { phoneNumber: sim.phoneNumber },
      update: {},
      create: {
        phoneNumber: sim.phoneNumber,
        userId: userIds[sim.username],
        departmentId: departmentIds[sim.department],
        packageId: packageIds[sim.simPackage],
        clsDomestic: sim.clsDomestic,
        clsRoaming: sim.clsRoaming,
      },
    });
  }

  console.log("Seed selesai:");
  console.log(`- ${DEPARTMENTS.length} department (termasuk sub-department)`);
  console.log(`- ${INVENT_TYPES.length} kategori inventaris`);
  console.log(
    `- ${EMPLOYEES.length + PERSONNEL.length + 3} user (admin, guest, unknown, staff)`
  );
  console.log(`- ${sampleAssets.length} contoh aset`);
  console.log(
    `- ${SIM_PACKAGES.length} package & ${sampleSimCards.length} contoh SIM`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
