import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export const UNKNOWN_DEPARTMENT_NAME = "Unknown";
export const UNKNOWN_USER_NAME = "Unknown";
export const UNKNOWN_USERNAME = "unknown";
export const UNKNOWN_INVENT_TYPE_NAME = "Unknown";

// Pastikan department, user, dan kategori "Unknown" ada. Dipakai sebagai
// fallback saat import CSV menemukan data user/department/kategori yang tidak
// cocok.
export async function getUnknownRefs() {
  const [department, inventType] = await Promise.all([
    prisma.department.upsert({
      where: { name: UNKNOWN_DEPARTMENT_NAME },
      update: {},
      create: { name: UNKNOWN_DEPARTMENT_NAME },
    }),
    prisma.inventType.upsert({
      where: { name: UNKNOWN_INVENT_TYPE_NAME },
      update: {},
      create: { name: UNKNOWN_INVENT_TYPE_NAME },
    }),
  ]);

  const user = await prisma.user.upsert({
    where: { username: UNKNOWN_USERNAME },
    update: { departmentId: department.id },
    create: {
      username: UNKNOWN_USERNAME,
      name: UNKNOWN_USER_NAME,
      role: "NON_USER",
      departmentId: department.id,
      passwordHash: await hashPassword(randomUUID()),
    },
  });

  return { department, user, inventType };
}
