export type AwinProgramDetails = {
  commissionRange?: Array<{ min?: number; max?: number; type?: string }>;
  kpi?: {
    approvalPercentage?: number;
    conversionRate?: number;
    epc?: number;
    validationDays?: number;
  };
  programmeInfo?: {
    id?: number;
    name?: string;
    membershipStatus?: string;
    currencyCode?: string;
    deeplinkEnabled?: boolean;
  };
};

export function moneyToMinor(value: unknown) {
  const amount = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value)
      : null;
  return amount !== null && Number.isFinite(amount) ? Math.max(0, Math.round(amount * 100)) : null;
}

export function percentageEstimate(range: AwinProgramDetails["commissionRange"]) {
  const percentage = (range ?? [])
    .filter((item) => String(item.type || "").toLowerCase().includes("percent"))
    .flatMap((item) => [item.min, item.max])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0);

  if (!percentage.length) return null;
  return (Math.min(...percentage) + Math.max(...percentage)) / 2;
}

export function addAwinClickRef(url: string, clickRef: string) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Unsupported affiliate URL protocol.");
  }
  parsed.searchParams.set("clickref", clickRef);
  return parsed.toString();
}

export function amountObject(value: unknown) {
  if (typeof value === "number" || typeof value === "string") {
    return { minor: moneyToMinor(value), currency: null as string | null };
  }

  if (!value || typeof value !== "object") {
    return { minor: null, currency: null as string | null };
  }

  const object = value as Record<string, unknown>;
  return {
    minor: moneyToMinor(object.amount),
    currency: typeof object.currency === "string" ? object.currency.toUpperCase() : null,
  };
}

export function stringField(
  source: Record<string, unknown>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

export function normalizeTransactionStatus(value: unknown) {
  const status = String(value || "").toLowerCase();
  return ["pending", "approved", "declined", "deleted"].includes(status) ? status : "unknown";
}
