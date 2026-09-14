import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export const IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const DOC_MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
const DOC_EXTENSIONS = [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt"];

const IMAGE_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DOC_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain",
};

export type UploadKind = "image" | "doc";

export type UploadResult =
  | { ok: true; url: string | null }
  | { ok: false; error: string };

// Folder penyimpanan file. Sengaja DI LUAR `public/` karena Next.js hanya
// menyajikan berkas public yang ada saat build. File di sini dilayani oleh
// route `app/uploads/[...path]/route.ts`. Di Docker folder ini di-mount
// ke volume supaya file tetap ada saat container di-build ulang.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(process.cwd(), "data", "uploads");

const SIGNATURES: Record<string, (buffer: Buffer) => boolean> = {
  ".png": (buffer) =>
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  ".jpg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  ".jpeg": (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  ".gif": (buffer) => buffer.subarray(0, 6).toString("ascii").startsWith("GIF8"),
  ".webp": (buffer) =>
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP",
};

function extensionOf(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

export function contentTypeFor(fileName: string) {
  return CONTENT_TYPES[extensionOf(fileName)] ?? "application/octet-stream";
}

function matchesSignature(kind: UploadKind, extension: string, buffer: Buffer) {
  if (kind === "doc") return true;
  const check = SIGNATURES[extension];
  return Boolean(check) && buffer.length >= 12 && check(buffer);
}

export async function saveUpload(
  file: File | null | undefined,
  kind: UploadKind
): Promise<UploadResult> {
  if (!file || file.size === 0) return { ok: true, url: null };

  const maxBytes = kind === "image" ? IMAGE_MAX_BYTES : DOC_MAX_BYTES;
  if (file.size > maxBytes) {
    return {
      ok: false,
      error:
        kind === "image"
          ? "Ukuran gambar maksimal 2 MB."
          : "Ukuran dokumen maksimal 5 MB.",
    };
  }

  const extension = extensionOf(file.name);
  const allowedExtensions = kind === "image" ? IMAGE_EXTENSIONS : DOC_EXTENSIONS;
  const allowedMime = kind === "image" ? IMAGE_MIME : DOC_MIME;

  if (!allowedExtensions.includes(extension)) {
    return {
      ok: false,
      error:
        kind === "image"
          ? "Format gambar harus PNG, JPG, WEBP, atau GIF."
          : "Format dokumen harus PDF, DOC, DOCX, XLS, XLSX, atau TXT.",
    };
  }

  if (file.type && !allowedMime.includes(file.type)) {
    return { ok: false, error: "Tipe file tidak sesuai dengan jenisnya." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!matchesSignature(kind, extension, buffer)) {
    return { ok: false, error: "Isi file tidak sesuai dengan formatnya." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-80);
  const fileName = `${kind}-${randomUUID()}-${safeName}`;

  try {
    await fs.mkdir(UPLOAD_ROOT, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_ROOT, fileName), buffer);
  } catch {
    return { ok: false, error: "Gagal menyimpan file. Silakan coba lagi." };
  }

  return { ok: true, url: `/uploads/${fileName}` };
}

export function resolveUploadPath(relativePath: string) {
  const target = path.resolve(UPLOAD_ROOT, relativePath);
  if (!target.startsWith(`${UPLOAD_ROOT}${path.sep}`)) return null;
  return target;
}

export async function removeUpload(url: string | null | undefined) {
  if (!url || !url.startsWith("/uploads/")) return;

  const target = resolveUploadPath(url.slice("/uploads/".length));
  if (!target) return;

  await fs.unlink(target).catch(() => undefined);
}

export async function cleanupUploads(urls: (string | null | undefined)[]) {
  await Promise.all(urls.map((url) => removeUpload(url)));
}
