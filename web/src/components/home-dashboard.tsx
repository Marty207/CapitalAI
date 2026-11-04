"use client";

/**
 * Home (Overview) — main dashboard: balances, goals, activity, accounts.
 * Data from FastAPI; called by web/src/app/(app)/dashboard/page.tsx.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CapitoAvatar } from "@/components/capito-avatar";
import { CircularGauge } from "@/components/circular-gauge";
import { PlaidLinkButton } from "@/components/plaid-link-button";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { applyAutoTracking, goalProgress } from "@/lib/goals";
import {
  creditScoreLabel,
  creditScoreRange,
  demoCreditScore,
  formatCompactCurrency,
  formatCurrency,
  parseBalance,
  sumBalances,
} from "@/lib/money";
import type { Account, Goal, Transaction } from "@/lib/types";
import { getDisplayName } from "@/lib/user-display";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  cardClass,
  gaugeColors,
  listClass,
  sectionLabelClass,
} from "@/lib/ui";

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function accountAccent(type: string): string {
  if (type === "depository") return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25";
  if (type === "credit") return "bg-amber-500/15 text-amber-200 ring-amber-500/25";
  if (type === "investment") return "bg-sky-500/15 text-sky-200 ring-sky-500/25";
  return "bg-white/10 text-muted-foreground ring-white/10";
}

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className={`${cardClass} flex flex-col gap-1 p-4`}>
      <p className={sectionLabelClass}>{label}</p>
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      {detail ? <p className="text-xs text-muted-foreground">{detail}</p> : null}
    </div>
  );
}

export function HomeDashboard() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setError(null);
    try {
      const [acct, txn] = await Promise.all([
        api.getAccounts(),
        api.getTransactions({ limit: 12 }),
      ]);
      setAccounts(acct);
      setTransactions(txn);
      try {
        const rawGoals = await api.getGoals();
        setGoals(applyAutoTracking(rawGoals, acct));
      } catch {
        setGoals([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const activeAccounts = accounts.filter((a) => a.is_active !== false);
  const totalBalance = sumBalances(activeAccounts);
  const cashBalance = sumBalances(
    activeAccounts,
    (a) => a.type === "depository"
  );
  const creditBalance = sumBalances(activeAccounts, (a) => a.type === "credit");
  const creditScore = demoCreditScore();

  const monthSpend = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    return transactions
      .filter((t) => {
        const d = new Date(t.date + "T12:00:00");
        return d.getFullYear() === y && d.getMonth() === m && parseBalance(t.amount) > 0;
      })
      .reduce((sum, t) => sum + parseBalance(t.amount), 0);
  }, [transactions]);

  const topGoals = goals.slice(0, 3);
  const recentTx = transactions.slice(0, 6);
  const name = getDisplayName(user);
  const cashProgress =
    cashBalance > 0 ? Math.min(1, Math.max(cashBalance / 15000, 0.12)) : 0;

  async function handleSync() {
    setSyncing(true);
    setError(null);
    try {
      await api.syncTransactions();
      await loadAll();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-8 pb-4">
      {/* Header + hero balance */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{timeGreeting()}</p>
            <h1 className="mt-0.5 text-3xl font-semibold tracking-tight text-foreground">
              {name ? name : "Overview"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <PlaidLinkButton onLinked={loadAll} className={btnSecondaryClass} />
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className={btnSecondaryClass}
            >
              {syncing ? "Syncing…" : "Sync"}
            </button>
            <Link href="/capito" className={btnPrimaryClass}>
              Ask Capito
            </Link>
          </div>
        </div>

        <div
          className={`${cardClass} relative overflow-hidden p-6 sm:p-8`}
          style={{ boxShadow: "var(--shadow-soft)" }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
            aria-hidden
          />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className={sectionLabelClass}>Total balance</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
                {formatCurrency(totalBalance)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Cash {formatCurrency(cashBalance)}
                {creditBalance !== 0 ? (
                  <span> · Credit {formatCurrency(Math.abs(creditBalance))}</span>
                ) : null}
              </p>
            </div>
            <div className="shrink-0 self-center sm:self-auto">
              <CircularGauge
                progress={cashProgress}
                color={gaugeColors.fill}
                trackColor={gaugeColors.track}
                size={120}
                centerValue={formatCompactCurrency(cashBalance)}
                centerLabel="Cash"
                centerSublabel={`${activeAccounts.length} linked`}
              />
            </div>
          </div>
        </div>

      </section>

      {/* Stat strip */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This month"
          value={formatCurrency(monthSpend)}
          detail="Spending (posted)"
        />
        <StatCard
          label="Savings goals"
          value={String(goals.length)}
          detail={
            goals.length
              ? `${goals.filter((g) => goalProgress(g) >= 100).length} completed`
              : "None yet"
          }
        />
        <StatCard
          label="Recent activity"
          value={String(recentTx.length)}
          detail="Latest transactions shown below"
        />
        <StatCard
          label="Credit score"
          value={creditScore !== null ? String(creditScore) : "—"}
          detail={
            creditScore !== null
              ? `${creditScoreLabel(creditScore)}
                `
              : "Coming soon"
          }
        />
      </section>

      {error ? (
        <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {/* Goals + activity */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className={sectionLabelClass}>Goals at a glance</h2>
            <Link href="/goals" className="text-xs font-semibold text-accent hover:underline">
              View all →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : topGoals.length === 0 ? (
            <div className={`${cardClass} p-5 text-sm text-muted-foreground`}>
              No goals yet.{" "}
              <Link href="/goals" className="font-medium text-accent hover:underline">
                Add a savings target
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {topGoals.map((goal) => {
                const pct = goalProgress(goal);
                return (
                  <li key={goal.id} className={`${cardClass} p-4`}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{goal.title}</p>
                      <span className="text-xs tabular-nums text-muted">{pct.toFixed(0)}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-accent transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatCurrency(goal.currentAmount)} of {formatCurrency(goal.targetAmount)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className={sectionLabelClass}>Recent activity</h2>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-accent hover:underline"
            >
              All transactions →
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : recentTx.length === 0 ? (
            <div className={`${cardClass} p-5 text-sm text-muted-foreground`}>
              Link an account and sync to see spending here.
            </div>
          ) : (
            <ul className={listClass}>
              {recentTx.map((txn) => {
                const amt = parseBalance(txn.amount);
                const isOutflow = amt > 0;
                return (
                  <li
                    key={txn.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-surface-hover"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{txn.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatShortDate(txn.date)}
                        {txn.category_primary ? ` · ${txn.category_primary}` : ""}
                      </p>
                    </div>
                    <p
                      className={`shrink-0 text-sm font-semibold tabular-nums ${
                        isOutflow ? "text-foreground" : "text-accent"
                      }`}
                    >
                      {isOutflow ? "−" : "+"}
                      {formatCurrency(Math.abs(amt))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Capito nudge */}
      <Link
        href="/capito"
        className={`${cardClass} group flex items-center gap-4 p-5 transition hover:border-accent/30 hover:bg-surface-hover`}
      >
        <CapitoAvatar size={52} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground group-hover:text-accent">Ask Capito</p>
          <p className="text-sm text-muted-foreground">
            Ask about your finances.
          </p>
        </div>
        <span className="text-muted transition group-hover:translate-x-0.5 group-hover:text-accent">
          →
        </span>
      </Link>

      {/* Accounts grid */}
      <section className="space-y-3">
        <h2 className={sectionLabelClass}>Linked accounts</h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading accounts…</p>
        ) : activeAccounts.length === 0 ? (
          <div className={`${cardClass} p-6 text-center text-sm text-muted-foreground`}>
            <p>No accounts linked yet.</p>
            <p className="mt-2">Use <strong className="text-foreground">Link account</strong> above to connect your bank.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {activeAccounts.map((account) => (
              <li key={account.id}>
                <Link
                  href={`/transactions?account=${account.id}`}
                  className={`${cardClass} group flex h-full flex-col gap-3 p-4 transition hover:border-accent/25 hover:bg-surface-hover`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${accountAccent(account.type)}`}
                    >
                      {account.subtype ?? account.type}
                    </span>
                    <span className="text-muted transition group-hover:text-accent">→</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground group-hover:text-accent">
                      {account.name}
                    </p>
                    {account.mask ? (
                      <p className="text-xs text-muted-foreground">•••• {account.mask}</p>
                    ) : null}
                  </div>
                  <p className="mt-auto text-xl font-semibold tabular-nums text-foreground">
                    {formatCurrency(parseBalance(account.current_balance))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
