"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ActionState } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/constants";
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

type UserAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export type DepartmentOption = {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
  canHaveAdmin: boolean;
};

type UserValues = {
  id: number;
  name: string;
  username: string;
  role: string;
  departmentId: number | null;
};

function allowedRoles(department?: DepartmentOption) {
  if (!department) return ["GUEST"];
  if (department.parentId !== null) return ["NON_USER"];
  return department.canHaveAdmin ? ["ADMIN", "GUEST"] : ["GUEST"];
}

function UserForm({
  action,
  departments,
  user,
  onSuccess,
}: {
  action: UserAction;
  departments: DepartmentOption[];
  user?: UserValues;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    {}
  );
  const [departmentId, setDepartmentId] = useState(
    user?.departmentId ? String(user.departmentId) : ""
  );
  const [role, setRole] = useState(user?.role ?? "GUEST");

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });
  useEffect(() => {
    if (state.success) onSuccessRef.current?.();
  }, [state.success]);

  const selected = departments.find((item) => String(item.id) === departmentId);
  const roles = allowedRoles(selected);

  function handleDepartmentChange(value: string) {
    setDepartmentId(value);
    const department = departments.find((item) => String(item.id) === value);
    const allowed = allowedRoles(department);
    if (!allowed.includes(role)) setRole(allowed[0]);
  }

  const topLevel = departments.filter((item) => item.parentId === null);
  const subLevel = departments.filter((item) => item.parentId !== null);
  const passwordHint = user
    ? "(biarkan kosong jika tidak diubah)"
    : role === "NON_USER"
      ? "(opsional untuk non-user)"
      : "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {user ? <input type="hidden" name="id" value={user.id} /> : null}

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-name">Nama Lengkap</Label>
        <Input
          id="user-name"
          name="name"
          defaultValue={user?.name ?? ""}
          placeholder="Contoh: Budi Santoso"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-username">Username</Label>
        <Input
          id="user-username"
          name="username"
          defaultValue={user?.username ?? ""}
          placeholder="budi"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-department">Posisi</Label>
        <select
          id="user-department"
          name="departmentId"
          className={selectClass}
          value={departmentId}
          onChange={(event) => handleDepartmentChange(event.target.value)}
          required
        >
          <option value="" disabled>
            Pilih posisi
          </option>
          <optgroup label="Department">
            {topLevel.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </optgroup>
          {subLevel.length > 0 ? (
            <optgroup label="Sub Department">
              {subLevel.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.path}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
        <p className="text-xs text-muted-foreground">
          Posisi diambil dari struktur di menu Department. Sub-department hanya
          untuk role Non-user (tanpa login).
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-role">Role</Label>
        <select
          id="user-role"
          name="role"
          className={selectClass}
          value={role}
          onChange={(event) => setRole(event.target.value)}
          disabled={!departmentId}
        >
          {roles.map((item) => (
            <option key={item} value={item}>
              {ROLE_LABELS[item] ?? item}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user-password">Password {passwordHint}</Label>
        <Input
          id="user-password"
          name="password"
          type="password"
          placeholder="Minimal 8 karakter"
          required={!user && role !== "NON_USER"}
        />
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

export function AddUserDialog({
  action,
  departments,
}: {
  action: UserAction;
  departments: DepartmentOption[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" />
        Tambah User
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah User</DialogTitle>
          <DialogDescription>
            User login di department level atas; staf sub-department memakai
            role Non-user.
          </DialogDescription>
        </DialogHeader>
        <UserForm
          action={action}
          departments={departments}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  action,
  departments,
  user,
}: {
  action: UserAction;
  departments: DepartmentOption[];
  user: UserValues;
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
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>{user.username}</DialogDescription>
        </DialogHeader>
        <UserForm
          action={action}
          departments={departments}
          user={user}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteUserButton({
  action,
  id,
  name,
}: {
  action: UserAction;
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
          <DialogTitle>Hapus user?</DialogTitle>
          <DialogDescription>
            &quot;{name}&quot; akan dihapus permanen.
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
