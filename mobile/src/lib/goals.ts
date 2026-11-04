import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Account } from "./api";
import { parseBalance } from "./money";

export type GoalTrackingMode = "manual" | "total_cash" | "account";

export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  trackingMode: GoalTrackingMode;
  accountId?: string;
  createdAt: string;
};

function storageKey(userId: string) {
  return `financeai_goals_${userId}`;
}

function normalizeGoal(raw: Goal): Goal {
  return {
    ...raw,
    trackingMode: raw.trackingMode ?? "manual",
  };
}

export async function loadGoals(userId: string): Promise<Goal[]> {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as Goal[]).map(normalizeGoal);
  } catch {
    return [];
  }
}

export async function saveGoals(userId: string, goals: Goal[]): Promise<void> {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(goals));
}

export function createGoal(
  title: string,
  targetAmount: number,
  options: {
    trackingMode: GoalTrackingMode;
    accountId?: string;
    startingAmount?: number;
  }
): Goal {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: title.trim(),
    targetAmount,
    currentAmount: options.startingAmount ?? 0,
    trackingMode: options.trackingMode,
    accountId: options.accountId,
    createdAt: new Date().toISOString(),
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
    (a) => a.is_active && a.type === "depository" && a.current_balance !== null
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
      return { ...goal, currentAmount: parseBalance(account?.current_balance) || goal.currentAmount };
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
    description: "Stays at the starting amount you enter (no bank link)",
  },
];
