/**
 * Money helpers shared across dashboard UI.
 * Postgres / Pydantic often serialize decimals as strings in JSON — we normalize before math.
 */

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

/** Matches backend PLAID_ENV — production uses real bank data. */
export function isPlaidSandbox(): boolean {
  const env = (process.env.NEXT_PUBLIC_PLAID_ENV ?? "sandbox").toLowerCase();
  return env === "sandbox";
}

export function demoCreditScore(): number | null {
  return isPlaidSandbox() ? 742 : null;
}

/** FICO-style tiers shown on Home (score 300–850). */
export const CREDIT_SCORE_TIERS = [
  { label: "Exceptional (Excellent)", min: 800, max: 850 },
  { label: "Very Good", min: 740, max: 799 },
  { label: "Good", min: 670, max: 739 },
  { label: "Fair", min: 580, max: 669 },
  { label: "Poor", min: 300, max: 579 },
] as const;

export function creditScoreTier(score: number) {
  const clamped = Math.min(850, Math.max(300, Math.round(score)));
  return (
    CREDIT_SCORE_TIERS.find((t) => clamped >= t.min && clamped <= t.max) ??
    CREDIT_SCORE_TIERS[CREDIT_SCORE_TIERS.length - 1]
  );
}

export function creditScoreLabel(score: number): string {
  return creditScoreTier(score).label;
}

export function creditScoreRange(score: number): string {
  const { min, max } = creditScoreTier(score);
  return `${min}–${max}`;
}
