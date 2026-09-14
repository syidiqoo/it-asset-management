"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ImageIcon, Loader2, Save } from "lucide-react";
import { saveAssetAction } from "@/lib/actions/assets";
import { CONDITIONS } from "@/lib/constants";
import { fileClass, selectClass } from "@/lib/ui-classes";
import type { AssetFormState } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type AssetFormValues = {
  id: number;
  inventTypeId: number;
  assetName: string;
  code: string;
  serialNumber: string | null;
  departmentId: number | null;
  userId: number | null;
  condition: string;
  recordDate: string;
  purchaseDate: string | null;
  note: string | null;
  imageUrl: string | null;
  docUrl: string | null;
};

type Option = { id: number; name: string };
type DepartmentOption = {
  id: number;
  name: string;
  parentId: number | null;
  path: string;
};
type UserOption = { id: number; name: string; departmentId: number | null };

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}

export function AssetForm({
  departments,
  users,
  types,
  updatedByName,
  defaultValues,
}: {
  departments: DepartmentOption[];
  users: UserOption[];
  types: Option[];
  updatedByName: string;
  defaultValues?: AssetFormValues;
}) {
  const [state, formAction, pending] = useActionState<AssetFormState, FormData>(
    saveAssetAction,
    {}
  );

  const [departmentId, setDepartmentId] = useState(
    defaultValues?.departmentId ? String(defaultValues.departmentId) : ""
  );
  const [userId, setUserId] = useState(
    defaultValues?.userId ? String(defaultValues.userId) : ""
  );
  const [imagePreview, setImagePreview] = useState<string | null>(
    defaultValues?.imageUrl ?? null
  );

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) => String(user.departmentId ?? "") === departmentId
      ),
    [users, departmentId]
  );

  const today = new Date().toISOString().slice(0, 10);

  const topLevelDepartments = departments.filter(
    (item) => item.parentId === null
  );
  const subDepartments = departments.filter((item) => item.parentId !== null);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {defaultValues ? (
        <input type="hidden" name="id" value={defaultValues.id} />
      ) : null}

      {state.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="assetName">Asset Name</Label>
          <Input
            id="assetName"
            name="assetName"
            defaultValue={defaultValues?.assetName ?? ""}
            placeholder="Contoh: Lenovo ThinkPad E14"
            required
          />
          <FieldError messages={state.fieldErrors?.assetName} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="inventTypeId">Kategori Inventaris</Label>
          <select
            id="inventTypeId"
            name="inventTypeId"
            className={selectClass}
            defaultValue={
              defaultValues?.inventTypeId ? String(defaultValues.inventTypeId) : ""
            }
            required
          >
            <option value="" disabled>
              Pilih kategori inventaris
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.inventTypeId} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="code">Code</Label>
          <Input
            id="code"
            name="code"
            defaultValue={defaultValues?.code ?? ""}
            placeholder="Contoh: IT-LP-001"
            required
          />
          <FieldError messages={state.fieldErrors?.code} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="serialNumber">Serial Number</Label>
          <Input
            id="serialNumber"
            name="serialNumber"
            defaultValue={defaultValues?.serialNumber ?? ""}
            placeholder="Nomor seri perangkat"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="departmentId">Department</Label>
          <select
            id="departmentId"
            name="departmentId"
            className={selectClass}
            value={departmentId}
            onChange={(event) => {
              const value = event.target.value;
              setDepartmentId(value);
              const stillValid = users.some(
                (user) =>
                  String(user.id) === userId &&
                  String(user.departmentId ?? "") === value
              );
              if (!stillValid) setUserId("");
            }}
            required
          >
            <option value="" disabled>
              Pilih department
            </option>
            <optgroup label="Department">
              {topLevelDepartments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </optgroup>
            {subDepartments.length > 0 ? (
              <optgroup label="Sub Department">
                {subDepartments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.path}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
          <FieldError messages={state.fieldErrors?.departmentId} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="userId">User</Label>
          <select
            id="userId"
            name="userId"
            className={selectClass}
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            disabled={!departmentId}
            required
          >
            <option value="" disabled>
              {departmentId
                ? "Pilih user"
                : "Pilih department terlebih dahulu"}
            </option>
            {filteredUsers.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name}
              </option>
            ))}
          </select>
          <FieldError messages={state.fieldErrors?.userId} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="condition">Condition</Label>
          <select
            id="condition"
            name="condition"
            className={selectClass}
            defaultValue={defaultValues?.condition ?? "Good"}
            required
          >
            {CONDITIONS.map((condition) => (
              <option key={condition} value={condition}>
                {condition}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="recordDate">Date</Label>
          <Input
            id="recordDate"
            name="recordDate"
            type="date"
            defaultValue={defaultValues?.recordDate ?? today}
            required
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="purchaseDate">Purchase Date</Label>
          <Input
            id="purchaseDate"
            name="purchaseDate"
            type="date"
            defaultValue={defaultValues?.purchaseDate ?? ""}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Updated By</Label>
          <Input value={updatedByName} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            Terisi otomatis dari akun yang sedang login.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="image">Image</Label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/*"
            className={fileClass}
            onChange={(event) => {
              const file = event.target.files?.[0];
              setImagePreview(file ? URL.createObjectURL(file) : null);
            }}
          />
          {imagePreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imagePreview}
              alt="Preview"
              className="mt-1 h-24 w-24 rounded-lg border object-cover"
            />
          ) : (
            <div className="mt-1 flex h-24 w-24 items-center justify-center rounded-lg border border-dashed text-muted-foreground">
              <ImageIcon className="size-6" />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="doc">Doc</Label>
          <input
            id="doc"
            name="doc"
            type="file"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt"
            className={fileClass}
          />
          {defaultValues?.docUrl ? (
            <a
              href={defaultValues.docUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline underline-offset-2"
            >
              Lihat dokumen saat ini
            </a>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 md:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Textarea
            id="note"
            name="note"
            defaultValue={defaultValues?.note ?? ""}
            placeholder="Catatan tambahan (opsional)"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {pending ? "Menyimpan..." : "Simpan"}
        </Button>
        <Button type="button" variant="outline" render={<Link href="/assets" />}>
          Batal
        </Button>
      </div>
    </form>
  );
}
