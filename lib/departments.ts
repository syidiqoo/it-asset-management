import { MAX_DEPARTMENT_DEPTH } from "@/lib/constants";

export type DepartmentRecord = {
  id: number;
  name: string;
  parentId: number | null;
  canHaveAdmin?: boolean;
};

export type DepartmentWithPath<T extends DepartmentRecord = DepartmentRecord> =
  T & {
    canHaveAdmin: boolean;
    path: string;
    depth: number;
    isSub: boolean;
  };

function buildDepartmentIndex(departments: DepartmentRecord[]) {
  return new Map(departments.map((department) => [department.id, department]));
}

function departmentPath(
  department: DepartmentRecord,
  byId: Map<number, DepartmentRecord>
) {
  const parts: string[] = [];
  const seen = new Set<number>();

  let current: DepartmentRecord | undefined = department;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    parts.unshift(current.name);
    current =
      current.parentId === null ? undefined : byId.get(current.parentId);
  }

  return parts.join(" > ");
}

function departmentDepth(
  department: DepartmentRecord,
  byId: Map<number, DepartmentRecord>
) {
  let depth = 0;
  const seen = new Set<number>();

  let current: DepartmentRecord | undefined = department;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    depth += 1;
    current =
      current.parentId === null ? undefined : byId.get(current.parentId);
  }

  return depth;
}

export function withDepartmentsPath<T extends DepartmentRecord>(
  departments: T[]
): DepartmentWithPath<T>[] {
  const byId = buildDepartmentIndex(departments);

  return departments
    .map((department) => ({
      ...department,
      canHaveAdmin: Boolean(department.canHaveAdmin),
      isSub: department.parentId !== null,
      path: departmentPath(department, byId),
      depth: departmentDepth(department, byId),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function descendantIds(id: number, departments: DepartmentRecord[]) {
  const result: number[] = [];
  const stack = [id];

  while (stack.length > 0) {
    const currentId = stack.pop();
    if (currentId === undefined) continue;

    for (const department of departments) {
      if (department.parentId === currentId) {
        result.push(department.id);
        stack.push(department.id);
      }
    }
  }

  return result;
}

// Jumlah level di bawah sebuah node (0 = daun / tidak punya anak)
export function subtreeHeight(
  id: number,
  departments: DepartmentRecord[],
  visited: Set<number> = new Set()
): number {
  if (visited.has(id)) return 0;
  visited.add(id);

  const children = departments.filter((item) => item.parentId === id);
  if (children.length === 0) return 0;

  let height = 0;
  for (const child of children) {
    height = Math.max(height, 1 + subtreeHeight(child.id, departments, visited));
  }
  return height;
}

// Validasi penempatan sebuah node di struktur department. null = valid.
// Dipakai bersama oleh form Department dan import CSV.
export function validateDepartmentPlacement({
  id,
  parentId,
  departments,
  maxDepth = MAX_DEPARTMENT_DEPTH,
}: {
  id?: number;
  parentId: number | null;
  departments: DepartmentRecord[];
  maxDepth?: number;
}): string | null {
  if (parentId === null) return null;

  const parent = departments.find((item) => item.id === parentId);
  if (!parent) return "Induk department tidak ditemukan.";

  if (id !== undefined) {
    if (parentId === id) {
      return "Department tidak bisa menjadi induk dirinya sendiri.";
    }
    if (descendantIds(id, departments).includes(parentId)) {
      return "Induk tidak boleh dipilih dari sub-department di bawahnya.";
    }
  }

  const byId = buildDepartmentIndex(departments);
  const nodeDepth = departmentDepth(parent, byId) + 1;
  const heightBelow = id !== undefined ? subtreeHeight(id, departments) : 0;

  if (nodeDepth + heightBelow > maxDepth) {
    return heightBelow > 0
      ? `Kedalaman maksimal ${maxDepth} level. Node ini akan menempati level ${nodeDepth} dan turunannya sampai level ${nodeDepth + heightBelow}.`
      : `Kedalaman maksimal ${maxDepth} level. Node ini akan menempati level ${nodeDepth}.`;
  }

  return null;
}
