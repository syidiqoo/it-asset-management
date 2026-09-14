import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CsvExportButton({ href }: { href: string }) {
  return (
    <Button variant="outline" render={<a href={href} download />}>
      <Download className="size-4" />
      Export CSV
    </Button>
  );
}
