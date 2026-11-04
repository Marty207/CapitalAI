"use client";

/**
 * Goals tab content — saved in Supabase via FastAPI /api/v1/goals (survives login/device).
 */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  applyAutoTracking,
  clearLegacyGoalsLocalStorage,
  createGoal,
  goalProgress,
  loadLegacyGoalsFromLocalStorage,
  parseGoalAmount,
  TRACKING_OPTIONS,
  trackingLabel,
  type Goal,
  type GoalTrackingMode,
} from "@/lib/goals";
import { formatCurrency, parseBalance } from "@/lib/money";
import type { Account } from "@/lib/types";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  inputClass,
  sectionLabelClass,
} from "@/lib/ui";

type GoalsSectionProps = {
  userId: string;
};

async function persistAutoTrackingChanges(before: Goal[], after: Goal[]) {
  const patches = after.filter((g, i) => g.currentAmount !== before[i]?.currentAmount);
  await Promise.all(patches.map((g) => api.patchGoalAmount(g.id, g.currentAmount)));
}

export function GoalsSection({ userId }: GoalsSectionProps) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState("");
  const [starting, setStarting] = useState("");
  const [trackingMode, setTrackingMode] = useState<GoalTrackingMode>("total_cash");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const depositoryAccounts = accounts.filter(
    (a) => a.is_active !== false && a.type === "depository"
  );

  const refreshGoals = useCallback(async () => {
    if (!userId) return;
    setLoadError(null);
    let fetchedAccounts: Account[] = [];
    try {
      fetchedAccounts = await api.getAccounts();
      setAccounts(fetchedAccounts);
    } catch {
      setAccounts([]);
    }

    try {
      let stored = await api.getGoals();

      // Move old localStorage goals into Supabase once.
      if (stored.length === 0) {
        const legacy = loadLegacyGoalsFromLocalStorage(userId);
        if (legacy.length > 0) {
          for (const g of legacy) {
            await api.createGoal({
              title: g.title,
              targetAmount: g.targetAmount,
              currentAmount: g.currentAmount,
              trackingMode: g.trackingMode,
              accountId: g.accountId,
            });
          }
          clearLegacyGoalsLocalStorage(userId);
          stored = await api.getGoals();
        }
      }

      const synced = applyAutoTracking(stored, fetchedAccounts);
      await persistAutoTrackingChanges(stored, synced);
      setGoals(synced);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load goals");
      setGoals([]);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    refreshGoals().finally(() => setLoading(false));
  }, [userId, refreshGoals]);

  function resetForm() {
    setTitle("");
    setTarget("");
    setStarting("");
    setTrackingMode("total_cash");
    setSelectedAccountId("");
    setFormError(null);
  }

  function resolveCurrentAmount(
    mode: GoalTrackingMode,
    accountId: string | undefined,
    manualStart: number,
    accts: Account[]
  ): number {
    if (mode === "manual") return manualStart;
    if (mode === "total_cash") {
      return accts
        .filter((a) => a.is_active !== false && a.type === "depository")
        .reduce((sum, a) => sum + parseBalance(a.current_balance), 0);
    }
    if (mode === "account" && accountId) {
      const account = accts.find((a) => a.id === accountId);
      return parseBalance(account?.current_balance);
    }
    return 0;
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const targetAmount = parseGoalAmount(target);
    const startingAmount = parseGoalAmount(starting) ?? 0;

    if (!title.trim()) {
      setFormError("Give your goal a name, like Emergency fund.");
      return;
    }
    if (targetAmount === null || targetAmount <= 0) {
      setFormError("Enter a target amount greater than zero.");
      return;
    }
    if (trackingMode === "account") {
      if (depositoryAccounts.length === 0) {
        setFormError("Link a bank on Home first, or pick another tracking option.");
        return;
      }
      if (!selectedAccountId) {
        setFormError("Choose which account to track.");
        return;
      }
    }

    const draft = createGoal(title, targetAmount, {
      trackingMode,
      accountId: trackingMode === "account" ? selectedAccountId : undefined,
      startingAmount: trackingMode === "manual" ? startingAmount : undefined,
    });

    try {
      await api.createGoal({
        title: draft.title,
        targetAmount: draft.targetAmount,
        currentAmount: resolveCurrentAmount(
          trackingMode,
          draft.accountId,
          startingAmount,
          accounts
        ),
        trackingMode: draft.trackingMode,
        accountId: draft.accountId,
      });
      await refreshGoals();
      resetForm();
      setShowForm(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save goal");
    }
  }

  async function handleDelete(goal: Goal) {
    if (!confirm(`Remove "${goal.title}"?`)) return;
    try {
      await api.deleteGoal(goal.id);
      await refreshGoals();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not delete goal");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className={sectionLabelClass}>Your goals</p>
        <button
          type="button"
          onClick={() => {
            setShowForm((v) => !v);
            setFormError(null);
          }}
          className={btnSecondaryClass}
        >
          {showForm ? "Cancel" : "+ Add goal"}
        </button>
      </div>
      {loadError ? (
        <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{loadError}</p>
      ) : null}

      {showForm ? (
        <form
          onSubmit={handleAddGoal}
          className="space-y-4 rounded-xl border border-border bg-surface/60 p-4"
        >
          <label className="block text-sm text-muted-foreground">
            Goal name
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
              placeholder="Emergency fund"
            />
          </label>
          <label className="block text-sm text-muted-foreground">
            Target amount
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className={inputClass}
              placeholder="5000"
              inputMode="decimal"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-muted-foreground">Track progress</legend>
            {TRACKING_OPTIONS.map((opt) => (
              <label
                key={opt.mode}
                className={`flex cursor-pointer gap-3 rounded-xl border p-3 transition ${
                  trackingMode === opt.mode
                    ? "border-accent/40 bg-accent-muted"
                    : "border-border hover:bg-surface-hover"
                }`}
              >
                <input
                  type="radio"
                  name="tracking"
                  checked={trackingMode === opt.mode}
                  onChange={() => setTrackingMode(opt.mode)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-foreground">{opt.title}</span>
                  <span className="block text-xs text-muted">{opt.description}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {trackingMode === "manual" ? (
            <label className="block text-sm text-muted-foreground">
              Starting amount
              <input
                value={starting}
                onChange={(e) => setStarting(e.target.value)}
                className={inputClass}
                placeholder="0"
                inputMode="decimal"
              />
            </label>
          ) : null}

          {trackingMode === "account" ? (
            <label className="block text-sm text-muted-foreground">
              Account
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select account…</option>
                {depositoryAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.mask ? ` · ••••${a.mask}` : ""}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
          <button type="submit" className={btnPrimaryClass}>
            Save goal
          </button>
        </form>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading goals…</p>
      ) : goals.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No goals yet. Add one to track savings toward a target.
        </p>
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => {
            const pct = goalProgress(goal);
            return (
              <li
                key={goal.id}
                className="rounded-xl border border-border bg-surface/80 p-4 transition hover:border-border-strong"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{goal.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{trackingLabel(goal, accounts)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(goal)}
                    className="text-xs text-muted transition hover:text-danger"
                  >
                    Remove
                  </button>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-2 text-sm tabular-nums text-muted-foreground">
                  {formatCurrency(goal.currentAmount)}
                  <span className="text-muted"> of </span>
                  {formatCurrency(goal.targetAmount)}
                  <span className="text-muted"> · </span>
                  {Math.round(pct)}%
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
