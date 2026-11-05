"use client";

/**
 * Email/password login — Supabase Auth (browser uses publishable key only).
 */

import { AppBrand } from "@/components/app-brand";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { devCredentials, isDevAutoLogin } from "@/lib/dev-auth";
import { btnPrimaryClass, cardClass, inputClass } from "@/lib/ui";

export default function LoginPage() {
  const { signIn, signUp, session, loading, devAuthError } = useAuth();
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  if (!loading && session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const trimmed = loginId.trim();
    if (!trimmed || password.length < 4) {
      setError("Enter your email and a password (at least 4 characters).");
      setSubmitting(false);
      return;
    }

    if (isSignUp) {
      const { error: signUpError } = await signUp(trimmed, password);
      if (signUpError) {
        setError(signUpError.message);
      } else {
        setMessage("Check your email to confirm, then sign in.");
        setIsSignUp(false);
      }
    } else {
      const { error: signInError } = await signIn(trimmed, password);
      if (signInError) {
        setError(signInError.message);
      } else {
        router.replace("/dashboard");
      }
    }

    setSubmitting(false);
  }

  return (
    <div className="app-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        <div className={`${cardClass} relative overflow-hidden px-8 py-9 sm:px-9 sm:py-10`}>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/45 to-transparent"
            aria-hidden
          />

          <header className="flex flex-col items-center pb-8 pt-1 text-center">
            <AppBrand href="/" size="md" />
          </header>

          {isDevAutoLogin() ? (
            <p className="mb-6 rounded-xl border border-warning-bg bg-warning-bg/80 px-3 py-2.5 text-xs text-warning-foreground">
              Dev: <strong>{devCredentials().login}</strong> / <strong>{devCredentials().password}</strong>
              {devAuthError ? (
                <span className="mt-1 block text-danger">Supabase: {devAuthError}</span>
              ) : null}
            </p>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Email
                </span>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="you@email.com"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  className={`${inputClass} mt-0`}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Password
                </span>
                <input
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} mt-0`}
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-lg border border-danger/30 bg-danger-bg px-3 py-2 text-sm text-danger">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-lg border border-accent/25 bg-accent-muted px-3 py-2 text-sm text-accent">
                {message}
              </p>
            ) : null}

            <button type="submit" disabled={submitting} className={`${btnPrimaryClass} w-full py-3`}>
              {submitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-medium text-accent transition hover:text-accent-hover"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setMessage(null);
              }}
            >
              {isSignUp ? "Sign in" : "Create account"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
