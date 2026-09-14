export const USER_EXPORT_HEADERS = [
  "ID",
  "Nama",
  "Username",
  "Role",
  "Posisi",
  "Password",
];

type ExportUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  departmentId: number | null;
};

const ROLE_EXPORT_LABELS: Record<string, string> = {
  ADMIN: "Admin",
  GUEST: "Guest",
  NON_USER: "Non-user",
};

export function userToExportRow(
  user: ExportUser,
  pathById: Map<number, string>
): string[] {
  return [
    String(user.id),
    user.name,
    // Non-user tidak bisa login, jadi usernamenya tidak perlu ditampilkan.
    user.role === "NON_USER" ? "" : user.username,
    ROLE_EXPORT_LABELS[user.role] ?? user.role,
    user.departmentId === null ? "" : (pathById.get(user.departmentId) ?? ""),
    // Sengaja kosong: kolom ini untuk diisi saat menambah user baru, dan
    // password (hash) tidak pernah boleh keluar dari sistem.
    "",
  ];
}
