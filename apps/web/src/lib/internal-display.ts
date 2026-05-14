import type { InternalDictionary } from "./internal-i18n";

type DisplayGroup =
  | "categories"
  | "departments"
  | "operationStatuses"
  | "sources"
  | "urgencies";

export function formatDisplayValue(
  value: string | null | undefined,
  group: DisplayGroup,
  t: InternalDictionary,
) {
  if (!value) {
    return t.common.missing;
  }

  const labels = t.common[group] as Record<string, string>;
  return labels[normalizeDisplayKey(value)] ?? value;
}

function normalizeDisplayKey(value: string) {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}
