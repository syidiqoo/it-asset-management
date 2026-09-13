"use client";

import { useState } from "react";
import {
  ChevronDown,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ExportPayload = {
  headers: string[];
  rows: string[][];
  total: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function AssetExportMenu({ query }: { query: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function endpoint(format: "csv" | "json") {
    const params = new URLSearchParams(query);
    params.set("format", format);
    return `/api/assets/export?${params.toString()}`;
  }

  function exportCsv() {
    setError(null);
    const link = document.createElement("a");
    link.href = endpoint("csv");
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  async function exportPdf() {
    setPending(true);
    setError(null);

    try {
      const response = await fetch(endpoint("json"), { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal mengambil data.");
      const data = (await response.json()) as ExportPayload;

      if (data.rows.length === 0) {
        setError("Tidak ada data untuk diekspor.");
        return;
      }

      const [{ jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "pt",
        format: "a4",
      });
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(14);
      doc.text("Data Aset IT", 24, 32);
      doc.setFontSize(8);
      doc.setTextColor(110);
      doc.text(
        `Total: ${data.rows.length} aset - Diekspor: ${new Date().toLocaleString("id-ID")}`,
        24,
        46
      );
      doc.setTextColor(0);

      autoTable(doc, {
        head: [data.headers],
        body: data.rows,
        startY: 58,
        margin: { left: 24, right: 24, bottom: 28 },
        styles: { fontSize: 6.5, cellPadding: 2, overflow: "linebreak" },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: { fillColor: [245, 247, 250] },
      });

      const pageCount = doc.getNumberOfPages();
      for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setFontSize(7);
        doc.setTextColor(110);
        doc.text(
          `Halaman ${page} dari ${pageCount}`,
          pageWidth - 24,
          doc.internal.pageSize.getHeight() - 12,
          { align: "right" }
        );
      }

      doc.save(`aset-${today()}.pdf`);
    } catch {
      setError("Gagal membuat file PDF. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          render={<Button variant="outline" />}
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Export
          <ChevronDown className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={pending} onClick={exportCsv}>
            <FileSpreadsheet className="size-4" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem disabled={pending} onClick={exportPdf}>
            <FileText className="size-4" />
            Export PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
