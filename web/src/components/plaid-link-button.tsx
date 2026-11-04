"use client";

/**
 * Plaid Link in the browser.
 * We fetch link_token from our backend, then mount a child that calls usePlaidLink ONCE
 * (avoids loading Plaid's script twice — that breaks with "Load failed").
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "@/lib/api";
import { btnPrimaryClass } from "@/lib/ui";

type PlaidLinkButtonProps = {
  onLinked: () => void;
  className?: string;
};

/** Only mount this after we have a link_token — one Plaid embed per click. */
function PlaidLinkOpener({
  linkToken,
  onLinked,
  onClose,
  onFail,
}: {
  linkToken: string;
  onLinked: () => void;
  onClose: () => void;
  onFail: (message: string) => void;
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
      open();
    }
  }, [ready, open]);

  return null;
}

export function PlaidLinkButton({ onLinked, className }: PlaidLinkButtonProps) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearSession = useCallback(() => {
    setLinkToken(null);
    setBusy(false);
  }, []);

  const handleClick = useCallback(async () => {
    setError(null);
    setBusy(true);
    setLinkToken(null);
    try {
      const { link_token } = await api.createLinkToken();
      setLinkToken(link_token);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Could not start Plaid Link");
    }
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className={className ?? btnPrimaryClass}
      >
        {busy ? "Opening Plaid…" : "Link account"}
      </button>
      {error ? (
        <p className="w-full basis-full rounded-lg bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {linkToken ? (
        <PlaidLinkOpener
          linkToken={linkToken}
          onLinked={onLinked}
          onClose={clearSession}
          onFail={(message) => setError(message)}
        />
      ) : null}
    </>
  );
}
