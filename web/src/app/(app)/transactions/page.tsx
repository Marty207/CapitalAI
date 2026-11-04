"use client";

/**
 * Transaction list — optional ?account=<uuid> from dashboard account click.
 */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatCurrency, parseBalance } from "@/lib/money";
import type { Account, Transaction } from "@/lib/types";
import { listClass, pageTitleClass } from "@/lib/ui";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const accountId = searchParams.get("account");

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getTransactions({
        limit: 100,
        accountId: accountId ?? undefined,
      });
      setTransactions(data);

      if (accountId) {
        const accounts = await api.getAccounts();
        const match = accounts.find((a: Account) => a.id === accountId);
        setAccountLabel(
          match
            ? `${match.name}${match.mask ? ` · ••••${match.mask}` : ""}`
            : "This account"
        );
      } else {
        setAccountLabel(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className={pageTitleClass}>
            {accountLabel ? accountLabel : "Transactions"}
          </h1>
          {accountLabel ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Showing activity for this account only.{" "}
              <Link href="/transactions" className="text-accent hover:underline">
                View all accounts
              </Link>
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            load();
          }}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent-muted"
        >
          Refresh
        </button>
      </div>

      {error ? (
        <p className="rounded-xl bg-danger-bg px-4 py-3 text-sm text-danger">{error}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : transactions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {accountId
            ? "No transactions for this account yet. Try Sync transactions on Home."
            : "No transactions yet. Link a bank on Home and tap Sync transactions."}
        </p>
      ) : (
        <ul className={listClass}>
          {transactions.map((txn) => (
            <li
              key={txn.id}
              className="flex items-start justify-between gap-4 px-4 py-3.5 transition hover:bg-surface-hover"
            >
              <div>
                <p className="font-medium text-foreground">{txn.name}</p>
                <p className="text-sm text-muted-foreground">
                  {txn.date}
                  {txn.category_primary ? ` · ${txn.category_primary}` : ""}
                  {txn.pending ? " · Pending" : ""}
                </p>
              </div>
              <p className="shrink-0 font-semibold tabular-nums text-foreground">
                {formatCurrency(parseBalance(txn.amount))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-muted-foreground">Loading transactions…</p>}
    >
      <TransactionsContent />
    </Suspense>
  );
}
