"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Upload } from "lucide-react";
import type { CsvImportState } from "@/lib/types";
import { fileClass } from "@/lib/ui-classes";
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

type ImportAction = (
  state: CsvImportState,
  formData: FormData
) => Promise<CsvImportState>;

function ImportForm({
  action,
  columnsHint,
}: {
  action: ImportAction;
  columnsHint: string;
}) {
  const [state, formAction, pending] = useActionState<CsvImportState, FormData>(
    action,
    {}
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.success]);

  return (
    <>
      {state.success ? (
        <div className="flex items-start gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>
            {state.imported ?? 0} data ditambahkan
            {state.updated ? `, ${state.updated} data diperbarui` : ""}.
          </span>
        </div>
      ) : null}

      {state.error ? (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{state.error}</span>
        </div>
      ) : null}

      {state.rowErrors && state.rowErrors.length > 0 ? (
        <div className="max-h-44 overflow-y-auto rounded-lg border">
          <ul className="text-xs">
            {state.rowErrors.map((item) => (
              <li
                key={item.line}
                className="flex gap-2 border-b px-3 py-2 last:border-b-0"
              >
                <span className="font-medium whitespace-nowrap">
                  Baris {item.line}
                </span>
                <span className="text-muted-foreground">{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {state.fieldErrors?.total?.[0] ? (
        <p className="text-xs text-muted-foreground">
          {state.fieldErrors.total[0]}
        </p>
      ) : null}

      <form ref={formRef} action={formAction} className="flex flex-col gap-2">
        <input
          type="file"
          name="file"
          accept=".csv,text/csv"
          required
          className={fileClass}
          onChange={(event) =>
            setFileName(event.target.files?.[0]?.name ?? null)
          }
        />
        <p className="text-xs text-muted-foreground">
          {fileName ? `File: ${fileName}` : columnsHint}
        </p>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Tutup
          </DialogClose>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            {pending ? "Mengimpor..." : "Import"}
          </Button>
        </DialogFooter>
      </form>
    </>
  );
}

export function CsvImportDialog({
  action,
  title,
  description,
  columnsHint,
}: {
  action: ImportAction;
  title: string;
  description: string;
  columnsHint: string;
}) {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        <Upload className="size-4" />
        Import CSV
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ImportForm action={action} columnsHint={columnsHint} />
      </DialogContent>
    </Dialog>
  );
}
