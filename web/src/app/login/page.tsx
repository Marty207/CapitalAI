"use client";

/**
 * Email/password login — same Supabase project as the old mobile app.
 */

import Link from "next/link";
import { AppBrand } from "@/components/app-brand";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { devCredentials, isDevAutoLogin } from "@/lib/dev-auth";
import { btnPrimaryClass, cardClass, codeInlineClass, inputClass } from "@/lib/ui";

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
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
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
      setError("Enter username or email and a password (at least 4 characters).");
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
    <div className="app-gradient flex min-h-screen flex-col items-center justify-center px-4">
      <div className={`${cardClass} w-full max-w-md p-8`}>
        <AppBrand href="/" size="md" />
        <p className="mt-1 text-sm text-muted-foreground">Personal finance in your browser</p>

        {isDevAutoLogin() ? (
          <p className="mt-4 rounded-xl bg-warning-bg px-3 py-2.5 text-xs text-warning-foreground">
            Dev auto-login: <strong>{devCredentials().login}</strong> /{" "}
            <strong>{devCredentials().password}</strong>
            <span className="text-muted-foreground"> (stored as {devCredentials().email})</span>
            {devAuthError ? (
              <>
                <br />
                <span className="text-danger">Supabase: {devAuthError}</span>
              </>
            ) : null}
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block text-sm font-medium text-muted-foreground">
            Username or email
            <input
              type="text"
              autoComplete="username"
              placeholder="devlogin"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium text-muted-foreground">
            Password
            <input
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </label>

          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {message ? <p className="text-sm text-accent">{message}</p> : null}

          <button type="submit" disabled={submitting} className={`${btnPrimaryClass} w-full`}>
            {submitting ? "Please wait…" : isSignUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <button
          type="button"
          className="mt-4 w-full text-sm text-muted-foreground transition hover:text-foreground"
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setMessage(null);
          }}
        >
          {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>

        <p className="mt-6 text-center text-xs text-muted">
          Backend must be running:{" "}
          <code className={codeInlineClass}>uvicorn … --port 8000</code>
        </p>
      </div>
      <Link
        href="/dashboard"
        className="mt-4 text-xs text-muted transition hover:text-muted-foreground"
      >
        Go to dashboard (requires login)
      </Link>
    </div>
  );
}
