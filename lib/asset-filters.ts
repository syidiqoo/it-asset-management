import { CONDITIONS } from "@/lib/constants";
import { first, parsePositiveInt } from "@/lib/params";

export type AssetFilterParams = Record<string, string | string[] | undefined>;

export function parseAssetFilters(params: AssetFilterParams) {
  const q = (first(params.q) ?? "").trim();
  const departmentId = parsePositiveInt(params.departmentId);
  const typeId = parsePositiveInt(params.typeId);
  const conditionValue = first(params.condition) ?? "";
  const condition = (CONDITIONS as readonly string[]).includes(conditionValue)
    ? conditionValue
    : "";

  const where = {
    ...(q
      ? {
          OR: [
            { assetName: { contains: q } },
            { code: { contains: q } },
            { serialNumber: { contains: q } },
          ],
        }
      : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(typeId ? { inventTypeId: typeId } : {}),
    ...(condition ? { condition } : {}),
  };

  const search = new URLSearchParams();
  if (q) search.set("q", q);
  if (departmentId) search.set("departmentId", String(departmentId));
  if (typeId) search.set("typeId", String(typeId));
  if (condition) search.set("condition", condition);

  return {
    q,
    departmentId,
    typeId,
    condition,
    where,
    query: search.toString(),
  };
}
