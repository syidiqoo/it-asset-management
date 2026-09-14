type RoleDepartment = {
  parentId: number | null;
  canHaveAdmin: boolean;
};

const ROLE_BY_KEY: Record<string, string> = {
  admin: "ADMIN",
  guest: "GUEST",
  nonuser: "NON_USER",
};

// Terima "Admin", "ADMIN", "Non-user", "non_user", dst. null = tidak dikenal.
export function normalizeRole(input: string) {
  const key = input.trim().toLowerCase().replace(/[\s_-]/g, "");
  return ROLE_BY_KEY[key] ?? null;
}

// Role bawaan kalau kolom Role dikosongkan saat import.
export function defaultRoleFor(department: RoleDepartment) {
  return department.parentId === null ? "GUEST" : "NON_USER";
}

// null = boleh; string = pesan error.
export function validateUserRoleDepartment(
  role: string,
  department: RoleDepartment
): string | null {
  if (role === "ADMIN" && !department.canHaveAdmin) {
    return "Role Admin hanya boleh untuk department yang ditandai boleh ada admin (mis. IT, Management).";
  }
  if (role === "GUEST" && department.parentId !== null) {
    return "Role Guest hanya boleh di department level atas, bukan sub-department.";
  }
  if (role === "NON_USER" && department.parentId === null) {
    return "Role Non-user hanya untuk sub-department (mis. Base Jakarta).";
  }
  return null;
}

export function canLogin(role: string) {
  return role !== "NON_USER";
}

// Dasar username otomatis untuk non-user, diambil dari nama.
export function usernameBaseFromName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "nonuser";
}
