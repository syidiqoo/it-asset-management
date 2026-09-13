export const CONDITIONS = ["Good", "Fair", "Damaged", "Under Repair"] as const;

export type Condition = (typeof CONDITIONS)[number];

export const ROLES = ["ADMIN", "GUEST", "NON_USER"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  GUEST: "Guest (lihat saja)",
  NON_USER: "Non-user (tanpa login)",
};

export const ROLE_SHORT_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  GUEST: "Guest",
  NON_USER: "Non-user",
};

export const ROLE_BADGE: Record<
  string,
  "default" | "secondary" | "outline"
> = {
  ADMIN: "default",
  GUEST: "secondary",
  NON_USER: "outline",
};

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info";

export const CONDITION_BADGE: Record<string, BadgeVariant> = {
  Good: "success",
  Fair: "warning",
  Damaged: "destructive",
  "Under Repair": "info",
};

export const PAGE_SIZE = 10;

// Kedalaman maksimal hirarki department (level 1 = department level atas)
export const MAX_DEPARTMENT_DEPTH = 4;

export const PASSWORD_MIN_LENGTH = 8;
