"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/types";
import { descendantIds, subtreeHeight } from "@/lib/departments";
import { MAX_DEPARTMENT_DEPTH } from "@/lib/constants";
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

type DepartmentAction = (
  state: ActionState,
  formData: FormData
) => Promise<ActionState>;

type DepartmentOption = {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  depth: number;
  canHaveAdmin: boolean;
};

function DepartmentForm({
  action,
  departments,
  department,
  onSuccess,
}: {
  action: DepartmentAction;
  departments: DepartmentOption[];
  department?: DepartmentOption;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {}
  );
  const [parentId, setParentId] = useState(
    department?.parentId ? String(department.parentId) : ""
  );
  const [canHaveAdmin, setCanHaveAdmin] = useState(
    Boolean(department?.canHaveAdmin)
  );

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => {
    if (state.success) onSuccessRef.current?.();
  }, [state.success]);

  const blocked = new Set<number>();
  if (department) {
    blocked.add(department.id);
    for (const id of descendantIds(department.id, departments)) {
      blocked.add(id);
    }
  }
  const heightBelow = department
    ? subtreeHeight(department.id, departments)
    : 0;
  const maxParentDepth = MAX_DEPARTMENT_DEPTH - 1 - heightBelow;
  const parentOptions = departments.filter(
    (item) => !blocked.has(item.id) && item.depth <= maxParentDepth
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {department ? (
        <input type="hidden" name="id" value={department.id} />
      ) : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="department-name">Nama</Label>
        <Input
          id="department-name"
          name="name"
          defaultValue={department?.name ?? ""}
          placeholder="Contoh: Base Jakarta"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="department-parent">Induk</Label>
        <select
          id="department-parent"
          name="parentId"
          className={selectClass}
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
        >
          <option value="">— Tidak ada (department level atas)</option>
          {parentOptions.map((item) => (
            <option key={item.id} value={item.id}>
              {item.path}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Kosongkan untuk department level atas. Maksimal {MAX_DEPARTMENT_DEPTH}{" "}
          level (department, base, unit, sub-unit).
        </p>
      </div>

      {parentId === "" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="canHaveAdmin"
            checked={canHaveAdmin}
            onChange={(event) => setCanHaveAdmin(event.target.checked)}
            className="size-4 rounded border-input accent-primary"
          />
          Boleh ada akun Admin (mis. IT, Management)
        </label>
      ) : null}

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

export function AddDepartmentDialog({
  action,
  departments,
}: {
  action: DepartmentAction;
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Tambah Department
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Department</DialogTitle>
          <DialogDescription>
            Bisa berupa department level atas atau sub-department.
          </DialogDescription>
        </DialogHeader>
        <DepartmentForm
          action={action}
          departments={departments}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditDepartmentDialog({
  action,
  departments,
  department,
}: {
  action: DepartmentAction;
  departments: DepartmentOption[];
  department: DepartmentOption;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" />}>
        <Pencil className="size-4" />
        <span className="sr-only">Edit</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Department</DialogTitle>
          <DialogDescription>{department.path}</DialogDescription>
        </DialogHeader>
        <DepartmentForm
          action={action}
          departments={departments}
          department={department}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteDepartmentDialog({
  action,
  id,
  name,
}: {
  action: DepartmentAction;
  id: number;
  name: string;
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
          <DialogTitle>Hapus department?</DialogTitle>
          <DialogDescription>
            &quot;{name}&quot; akan dihapus permanen. Sub-department yang masih
            tersisa harus dihapus atau dipindahkan lebih dulu.
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
