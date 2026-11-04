"use client";

/**
 * Plaid OAuth return URL — required for many real banks in Production.
 * Register the same URL in Plaid Dashboard → Allowed redirect URIs and set PLAID_REDIRECT_URI in .env.
 */

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "@/lib/api";
import { btnPrimaryClass, cardClass } from "@/lib/ui";

function PlaidOAuthResume({
  linkToken,
  onDone,
  onFail,
}: {
  linkToken: string;
  onDone: () => void;
  onFail: (message: string) => void;
}) {
  const openedRef = useRef(false);
  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri: typeof window !== "undefined" ? window.location.href : undefined,
    onSuccess: async (publicToken) => {
      if (!publicToken) {
        onFail("Plaid did not return a public token");
        return;
      }
      try {
        await api.exchangePublicToken(publicToken);
        onDone();
      } catch (e) {
        onFail(e instanceof Error ? e.message : "Failed to save linked account");
      }
    },
    onExit: (exit) => {
      if (exit.error) {
        onFail(exit.error.display_message || exit.error.error_message || "Plaid closed");
      } else {
        onFail("Bank linking was cancelled");
      }
    },
  });

  useEffect(() => {
    if (ready && !openedRef.current) {
      openedRef.current = true;
      open();
    }
  }, [ready, open]);

  return null;
}

export default function PlaidOAuthPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const { link_token } = await api.createLinkToken();
      setLinkToken(link_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not resume Plaid Link");
    }
  }, []);

  useEffect(() => {
    void start();
  }, [start]);

  return (
    <main className="app-gradient flex min-h-screen items-center justify-center p-6">
      <div className={`${cardClass} max-w-md space-y-4 p-6 text-center`}>
        <h1 className="text-lg font-semibold text-foreground">Finishing bank connection</h1>
        {error ? (
          <>
            <p className="text-sm text-danger">{error}</p>
            <button type="button" className={btnPrimaryClass} onClick={() => void start()}>
              Try again
            </button>
            <button
              type="button"
              className="block w-full text-sm text-muted-foreground underline"
              onClick={() => router.push("/dashboard")}
            >
              Back to Home
            </button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Opening Plaid…</p>
        )}
        {linkToken && !error ? (
          <PlaidOAuthResume
            linkToken={linkToken}
            onDone={() => router.replace("/dashboard")}
            onFail={(message) => setError(message)}
          />
        ) : null}
      </div>
    </main>
  );
}
