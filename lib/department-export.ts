export const DEPARTMENT_EXPORT_HEADERS = [
  "ID",
  "Nama",
  "Induk",
  "Boleh Admin",
];

export type ExportDepartment = {
  id: number;
  name: string;
  parentId: number | null;
  canHaveAdmin: boolean;
};

export function departmentToExportRow(
  department: ExportDepartment,
  pathById: Map<number, string>
): string[] {
  return [
    String(department.id),
    department.name,
    department.parentId === null
      ? ""
      : (pathById.get(department.parentId) ?? ""),
    department.canHaveAdmin ? "Ya" : "",
  ];
}
