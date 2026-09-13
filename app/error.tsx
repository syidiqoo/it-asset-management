"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">Terjadi kesalahan</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Maaf, ada masalah saat memuat halaman ini. Silakan coba lagi.
      </p>
      <Button onClick={reset}>
        <RotateCcw className="size-4" />
        Coba lagi
      </Button>
    </div>
  );
}
