import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      <Sidebar
        user={{
          name: user.name,
          role: user.role,
          department: user.department?.name ?? null,
        }}
      />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-7xl p-5 md:p-8 lg:p-10">{children}</div>
      </main>
    </div>
  );
}
