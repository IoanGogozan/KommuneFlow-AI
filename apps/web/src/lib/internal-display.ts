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

const internalDateTimeFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Oslo",
});

const internalDateFormatter = new Intl.DateTimeFormat("nb-NO", {
  dateStyle: "short",
  timeZone: "Europe/Oslo",
});

const internalNumberFormatter = new Intl.NumberFormat("nb-NO");

export function formatInternalDateTime(value: string | Date) {
  return internalDateTimeFormatter.format(new Date(value));
}

export function formatInternalDate(value: string | Date) {
  return internalDateFormatter.format(new Date(value));
}

export function formatInternalNumber(value: number) {
  return internalNumberFormatter.format(value);
}

function normalizeDisplayKey(value: string) {
  return value
    .trim()
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}
