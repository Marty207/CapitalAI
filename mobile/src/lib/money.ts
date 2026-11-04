/** API balances arrive as JSON numbers or decimal strings from Postgres. */
export function parseBalance(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function sumBalances(
  accounts: { current_balance?: number | string | null; type?: string; is_active?: boolean }[],
  filter?: (account: { type?: string; is_active?: boolean }) => boolean
): number {
  return accounts
    .filter((a) => (filter ? filter(a) : true))
    .reduce((sum, account) => sum + parseBalance(account.current_balance), 0);
}

export function formatCurrency(amount: number | null | undefined, currency = "USD") {
  const value = parseBalance(amount);
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: Math.abs(amount) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(amount) >= 10000 ? 1 : 0,
  }).format(amount);
}

export function creditScoreColor(score: number): string {
  if (score >= 800) return "#059669";
  if (score >= 740) return "#16A34A";
  if (score >= 670) return "#65A30D";
  if (score >= 580) return "#D97706";
  return "#DC2626";
}

export function creditScoreLabel(score: number): string {
  if (score >= 800) return "Exceptional (Excellent)";
  if (score >= 740) return "Very Good";
  if (score >= 670) return "Good";
  if (score >= 580) return "Fair";
  return "Poor";
}

/** Placeholder until a credit bureau / Plaid credit product is integrated. */
export function demoCreditScore(isSandbox: boolean): number | null {
  return isSandbox ? 742 : null;
}
