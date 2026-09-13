import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-md bg-muted">
        <SearchX className="size-5 text-muted-foreground" />
      </div>
      <h1 className="font-heading text-2xl font-bold tracking-tight md:text-3xl">
        Halaman tidak ditemukan
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Data atau halaman yang Anda cari tidak tersedia.
      </p>
      <Button variant="outline" render={<Link href="/" />}>
        Kembali ke Dashboard
      </Button>
    </div>
  );
}
