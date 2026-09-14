"use client";

import Image from "next/image";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function AssetImagePreview({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="group relative block w-full overflow-hidden rounded-lg border bg-muted text-left focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        }
      >
        <Image
          src={src}
          alt={alt}
          width={640}
          height={480}
          unoptimized
          className="h-80 w-full object-contain transition-transform group-hover:scale-[1.01]"
        />
        <span className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm">
          <Maximize2 className="size-3.5" />
          Lihat penuh
        </span>
      </DialogTrigger>
      <DialogContent className="h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] bg-black/95 p-4 ring-white/15 sm:max-w-[calc(100vw-2rem)]">
        <DialogTitle className="sr-only">Gambar {alt}</DialogTitle>
        <DialogDescription className="sr-only">
          Tampilan penuh gambar aset {alt}.
        </DialogDescription>
        <div className="relative min-h-0 w-full">
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            sizes="100vw"
            className="object-contain"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
