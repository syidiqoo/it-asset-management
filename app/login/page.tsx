import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";
import { getCurrentUser, SESSION_COOKIE } from "@/lib/auth";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function LoginPage() {
  const cookieStore = await cookies();

  // Hanya validasi ke database bila cookie ada, supaya pengunjung baru tetap
  // langsung melihat form dan cookie sesi basi tidak membuat loop redirect.
  if (cookieStore.has(SESSION_COOKIE)) {
    const user = await getCurrentUser();
    if (user) redirect("/");
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <MonitorSmartphone className="size-6" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
            IT Asset Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Masuk untuk mengelola data aset IT
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Gunakan akun yang sudah terdaftar.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <LoginForm />

            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Akun demo:</p>
              <p>Admin — admin / admin123</p>
              <p>Guest — guest / guest123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
