import { z } from "zod";
import { CONDITIONS, ROLES } from "@/lib/constants";

export function positiveInt(message: string) {
  return z.coerce.number().int(message).positive(message);
}

export const optionalTrimmedString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  });

function isValidDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

export const requiredDateString = z
  .string()
  .trim()
  .min(1, "Tanggal wajib diisi")
  .refine(isValidDate, { message: "Tanggal tidak valid" });

export const optionalDateString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  })
  .refine((value) => value === undefined || isValidDate(value), {
    message: "Tanggal tidak valid",
  });

export const assetSchema = z.object({
  id: z.string().optional(),
  inventTypeId: positiveInt("Kategori inventaris wajib dipilih"),
  assetName: z.string().trim().min(1, "Nama aset wajib diisi"),
  code: z.string().trim().min(1, "Code wajib diisi"),
  serialNumber: optionalTrimmedString,
  departmentId: positiveInt("Department wajib dipilih"),
  userId: positiveInt("User wajib dipilih"),
  condition: z
    .string()
    .refine((value) => (CONDITIONS as readonly string[]).includes(value), {
      message: "Condition tidak valid",
    }),
  recordDate: requiredDateString,
  purchaseDate: optionalDateString,
  note: optionalTrimmedString,
});

export const userSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  username: optionalTrimmedString,
  password: z.string().optional(),
  role: z.enum(ROLES),
  departmentId: positiveInt("Department wajib dipilih"),
});

export const nameSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nama wajib diisi"),
});

export const departmentSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  parentId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      const raw = value?.trim();
      if (!raw) return undefined;
      const parsed = Number(raw);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
    })
    .refine((value) => value === undefined || !Number.isNaN(value), {
      message: "Induk department tidak valid",
    }),
  canHaveAdmin: z
    .union([z.string(), z.boolean(), z.null()])
    .optional()
    .transform((value) => value === true || value === "true" || value === "on"),
});

function optionalNonNegativeNumber(message: string) {
  return z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((value) => {
      if (value === null || value === undefined) return undefined;
      if (typeof value === "string") {
        const trimmed = value.trim();
        if (trimmed === "") return undefined;
        return Number(trimmed);
      }
      return value;
    })
    .refine(
      (value) => value === undefined || (Number.isFinite(value) && value >= 0),
      { message }
    );
}

export const simCardSchema = z.object({
  id: z.string().optional(),
  phoneNumber: z.string().trim().min(1, "No Handphone wajib diisi"),
  userId: positiveInt("User wajib dipilih"),
  packageId: z
    .union([z.string(), z.null()])
    .optional()
    .transform((value) => {
      const raw = value?.trim();
      if (!raw) return undefined;
      const parsed = Number(raw);
      return Number.isInteger(parsed) && parsed > 0 ? parsed : Number.NaN;
    })
    .refine((value) => value === undefined || !Number.isNaN(value), {
      message: "Package tidak valid",
    }),
  clsDomestic: optionalNonNegativeNumber("CLS Domestic harus berupa angka"),
  clsRoaming: optionalNonNegativeNumber("CLS Roaming harus berupa angka"),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, "Username dan password wajib diisi."),
  password: z.string().min(1, "Username dan password wajib diisi."),
});

export type AssetInput = z.infer<typeof assetSchema>;
export type UserInput = z.infer<typeof userSchema>;
export type NameInput = z.infer<typeof nameSchema>;
export type DepartmentInput = z.infer<typeof departmentSchema>;
export type SimCardInput = z.infer<typeof simCardSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
