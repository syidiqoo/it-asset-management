"use client";

import { Trash2 } from "lucide-react";
import { deleteAssetAction } from "@/lib/actions/assets";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteAssetButton({
  id,
  name,
  variant = "icon",
}: {
  id: number;
  name: string;
  variant?: "icon" | "full";
}) {
  const action = deleteAssetAction.bind(null, id);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="destructive"
            size={variant === "icon" ? "icon-sm" : "sm"}
          />
        }
      >
        <Trash2 className="size-4" />
        {variant === "full" ? "Hapus" : <span className="sr-only">Hapus</span>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus aset?</DialogTitle>
          <DialogDescription>
            Aset &quot;{name}&quot; akan dihapus permanen beserta gambarnya.
            Tindakan ini tidak bisa dibatalkan.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <form action={action}>
            <Button type="submit" variant="destructive">
              Ya, hapus
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
