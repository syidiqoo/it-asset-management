"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/types";
import { selectClass } from "@/lib/ui-classes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type SimCardAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

type SimUserOption = {
  id: number;
  name: string;
  departmentPath: string | null;
};

type SimPackageOption = { id: number; name: string };

type SimCardValues = {
  id: number;
  phoneNumber: string;
  userId: number | null;
  packageId: number | null;
  clsDomestic: number | null;
  clsRoaming: number | null;
};

function SimCardForm({
  action,
  users,
  packages,
  simCard,
  onSuccess,
}: {
  action: SimCardAction;
  users: SimUserOption[];
  packages: SimPackageOption[];
  simCard?: SimCardValues;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {}
  );
  const [userId, setUserId] = useState(
    simCard?.userId ? String(simCard.userId) : ""
  );

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => {
    if (state.success) onSuccessRef.current?.();
  }, [state.success]);

  const selectedUser = users.find((item) => String(item.id) === userId);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {simCard ? <input type="hidden" name="id" value={simCard.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="sim-phone">No Handphone</Label>
        <Input
          id="sim-phone"
          name="phoneNumber"
          defaultValue={simCard?.phoneNumber ?? ""}
          placeholder="0811-1000-000"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sim-user">User</Label>
        <select
          id="sim-user"
          name="userId"
          className={selectClass}
          value={userId}
          onChange={(event) => setUserId(event.target.value)}
          required
        >
          <option value="" disabled>
            Pilih user
          </option>
          {users.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.departmentPath ? ` — ${item.departmentPath}` : ""}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Department mengikuti user: {selectedUser?.departmentPath ?? "-"}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sim-package">Package</Label>
        <select
          id="sim-package"
          name="packageId"
          className={selectClass}
          defaultValue={
            simCard?.packageId ? String(simCard.packageId) : ""
          }
        >
          <option value="">- (belum ada)</option>
          {packages.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sim-cls-domestic">CLS Domestic</Label>
          <Input
            id="sim-cls-domestic"
            name="clsDomestic"
            type="number"
            min="0"
            defaultValue={simCard?.clsDomestic ?? ""}
            placeholder="mis. 150000"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="sim-cls-roaming">CLS Roaming</Label>
          <Input
            id="sim-cls-roaming"
            name="clsRoaming"
            type="number"
            min="0"
            defaultValue={simCard?.clsRoaming ?? ""}
            placeholder="mis. 50000"
          />
        </div>
      </div>

      {state.error ? (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Simpan
        </Button>
      </div>
    </form>
  );
}

export function AddSimCardDialog({
  action,
  users,
  packages,
}: {
  action: SimCardAction;
  users: SimUserOption[];
  packages: SimPackageOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Tambah SIM Card
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah SIM Card</DialogTitle>
          <DialogDescription>
            Pilih user, department akan mengikuti otomatis.
          </DialogDescription>
        </DialogHeader>
        <SimCardForm
          action={action}
          users={users}
          packages={packages}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditSimCardDialog({
  action,
  users,
  packages,
  simCard,
}: {
  action: SimCardAction;
  users: SimUserOption[];
  packages: SimPackageOption[];
  simCard: SimCardValues;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="size-4" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit SIM Card</DialogTitle>
          <DialogDescription>{simCard.phoneNumber}</DialogDescription>
        </DialogHeader>
        <SimCardForm
          action={action}
          users={users}
          packages={packages}
          simCard={simCard}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSimCardDialog({
  action,
  id,
  phoneNumber,
}: {
  action: SimCardAction;
  id: number;
  phoneNumber: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {}
  );

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Trash2 className="size-4 text-destructive" />
        <span className="sr-only">Hapus</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Hapus SIM Card?</DialogTitle>
          <DialogDescription>
            &quot;{phoneNumber}&quot; akan dihapus permanen.
          </DialogDescription>
        </DialogHeader>
        {state.error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Batal</DialogClose>
          <form action={formAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Hapus
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
