/**
 * Goal helpers — persistence is via GET/POST /api/v1/goals (Supabase Postgres).
 * Pure functions here match mobile/src/lib/goals.ts for progress + auto-tracking.
 */

import type { Account } from "@/lib/types";
import type { Goal, GoalTrackingMode } from "@/lib/types";
import { parseBalance } from "@/lib/money";

export type { Goal, GoalTrackingMode };

export function createGoal(
  title: string,
  targetAmount: number,
  options: {
    trackingMode: GoalTrackingMode;
    accountId?: string;
    startingAmount?: number;
  }
): Omit<Goal, "id" | "createdAt"> {
  return {
    title: title.trim(),
    targetAmount,
    currentAmount: options.startingAmount ?? 0,
    trackingMode: options.trackingMode,
    accountId: options.accountId,
  };
}

export function goalProgress(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100));
}

export function trackingLabel(goal: Goal, accounts: Account[]): string {
  if (goal.trackingMode === "total_cash") {
    return "Auto · Total cash";
  }
  if (goal.trackingMode === "account" && goal.accountId) {
    const account = accounts.find((a) => a.id === goal.accountId);
    return account ? `Auto · ${account.name}` : "Auto · Account";
  }
  return "Manual · Fixed amount";
}

function cashAccounts(accounts: Account[]): Account[] {
  return accounts.filter(
    (a) => a.is_active !== false && a.type === "depository" && a.current_balance != null
  );
}

function totalCashBalance(accounts: Account[]): number {
  return cashAccounts(accounts).reduce((sum, a) => sum + parseBalance(a.current_balance), 0);
}

export function applyAutoTracking(goals: Goal[], accounts: Account[]): Goal[] {
  return goals.map((goal) => {
    if (goal.trackingMode === "manual") {
      return goal;
    }
    if (goal.trackingMode === "total_cash") {
      return { ...goal, currentAmount: totalCashBalance(accounts) };
    }
    if (goal.trackingMode === "account" && goal.accountId) {
      const account = accounts.find((a) => a.id === goal.accountId);
      return {
        ...goal,
        currentAmount: parseBalance(account?.current_balance) || goal.currentAmount,
      };
    }
    return goal;
  });
}

export const TRACKING_OPTIONS: {
  mode: GoalTrackingMode;
  title: string;
  description: string;
}[] = [
  {
    mode: "total_cash",
    title: "Total cash",
    description: "Updates from all linked checking & savings balances",
  },
  {
    mode: "account",
    title: "One account",
    description: "Updates from a specific linked account",
  },
  {
    mode: "manual",
    title: "Fixed amount",
    description: "Stays at the starting amount you enter",
  },
];

export function parseGoalAmount(value: string): number | null {
  const parsed = parseFloat(value.replace(/[^0-9.]/g, ""));
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

/** One-time import from old browser-only storage (before Supabase goals). */
export function loadLegacyGoalsFromLocalStorage(userId: string): Goal[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(`financeai_goals_${userId}`);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Goal[];
  } catch {
    return [];
  }
}

export function clearLegacyGoalsLocalStorage(userId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`financeai_goals_${userId}`);
}
