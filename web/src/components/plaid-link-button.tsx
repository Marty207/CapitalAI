"use client";

/**
 * Plaid Link in the browser.
 * Fetches link_token from FastAPI, then opens Plaid once (one usePlaidLink mount per click).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "@/lib/api";
import { btnPrimaryClass } from "@/lib/ui";

type PlaidLinkButtonProps = {
  onLinked: () => void;
  className?: string;
};

function PlaidLinkOpener({
  linkToken,
  onLinked,
  onClose,
  onFail,
  onOpened,
}: {
  linkToken: string;
  onLinked: () => void;
  onClose: () => void;
  onFail: (message: string) => void;
  onOpened: () => void;
}) {
  const openedRef = useRef(false);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: async (publicToken) => {
      if (!publicToken) {
        onFail("Plaid did not return a public token");
        onClose();
        return;
      }
      try {
        await api.exchangePublicToken(publicToken);
        onLinked();
      } catch (e) {
        onFail(e instanceof Error ? e.message : "Failed to save linked account");
      } finally {
        onClose();
      }
    },
    onExit: (error) => {
      if (error) {
        onFail(error.display_message || error.error_message || "Plaid closed");
      }
      onClose();
    },
  });

  useEffect(() => {
    if (ready && !openedRef.current) {
      openedRef.current = true;
      onOpened();
      open();
    }
  }, [ready, open, onOpened]);

  return null;
}

export function PlaidLinkButton({ onLinked, className }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const plaidOpenedRef = useRef(false);

  const reset = useCallback(() => {
    setLinkToken(null);
    setBusy(false);
    plaidOpenedRef.current = false;
  }, []);

  const fail = useCallback(
    (message: string) => {
      setError(message);
      reset();
    },
    [reset]
  );

  const handleClick = useCallback(async () => {
    setError(null);
    setBusy(true);
    setLinkToken(null);
    try {
      const { link_token } = await api.createLinkToken();
      if (!link_token) {
        fail("Backend did not return a Plaid link token.");
        return;
      }
      setLinkToken(link_token);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not start Plaid Link";
      fail(
        msg.includes("401") || /unauthorized/i.test(msg)
          ? `${msg} Try signing out and back in.`
          : msg
      );
    }
  }, [fail]);

  // If we got a link token but Plaid never opens (proxy/API/script), show an error.
  useEffect(() => {
    if (!linkToken) return;
    plaidOpenedRef.current = false;
    const id = window.setTimeout(() => {
      if (!plaidOpenedRef.current) {
        fail(
          "Plaid did not open. Check Railway is up, Vercel API_PROXY_TARGET is your Railway URL + /api/v1, then redeploy."
        );
      }
    }, 14_000);
    return () => window.clearTimeout(id);
  }, [linkToken, fail]);

  useEffect(() => {
    if (linkToken && busy) {
      setBusy(false);
    }
  }, [linkToken, busy]);

  return (
    <div className="flex flex-col items-stretch gap-2">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy || !!linkToken}
        className={className ?? btnPrimaryClass}
      >
        {busy || linkToken ? "Opening Plaid…" : "Link account"}
      </button>
      {error ? (
        <p
          role="alert"
          className="max-w-sm rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger"
        >
          {error}
        </p>
      ) : null}
      {linkToken ? (
        <PlaidLinkOpener
          linkToken={linkToken}
          onLinked={onLinked}
          onClose={reset}
          onFail={fail}
          onOpened={() => {
            plaidOpenedRef.current = true;
          }}
        />
      ) : null}
    </div>
  );
}
