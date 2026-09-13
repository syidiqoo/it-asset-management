"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  cleanupExpiredSessions,
  createSession,
  destroySession,
  verifyPassword,
} from "@/lib/auth";
import { clearFailures, isRateLimited, recordFailure } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export type LoginState = {
  error?: string;
};

async function clientKey(username: string) {
  const headerList = await headers();
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  return `${ip}:${username.toLowerCase()}`;
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: "Username dan password wajib diisi." };
  }

  const { username, password } = parsed.data;
  const key = await clientKey(username);

  if (isRateLimited(key)) {
    return { error: "Terlalu banyak percobaan login. Coba lagi dalam 15 menit." };
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    recordFailure(key);
    return { error: "Username atau password salah." };
  }

  if (user.role === "NON_USER") {
    clearFailures(key);
    return { error: "Akun ini tidak diizinkan login." };
  }

  clearFailures(key);
  await createSession(user.id);
  await cleanupExpiredSessions();
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
