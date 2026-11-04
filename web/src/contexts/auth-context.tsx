"use client";

/**
 * Client-side auth state for Next.js App Router.
 * Supabase session lives in the browser; we expose it to pages via React context.
 */

import { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { devCredentials, isDevAutoLogin, normalizeLoginId } from "@/lib/dev-auth";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Set when DEV_AUTO_LOGIN is on but Supabase sign-in failed */
  devAuthError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<{ error: Error | null }>;
  updateLoginEmail: (loginId: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  updatePersonalDetails: (fields: {
    displayName: string;
    username: string;
    email: string;
    phone: string;
    avatarUrl: string;
  }) => Promise<{ error: Error | null }>;
  sendPasswordResetEmail: () => Promise<{ error: Error | null }>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => getSupabaseBrowserClient(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [devAuthError, setDevAuthError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapAuth() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;

      if (data.session) {
        setSession(data.session);
        setLoading(false);
        return;
      }

      // Dev only: sign in with shared test account (see web/.env.local)
      if (isDevAutoLogin()) {
        const { email, password } = devCredentials();
        let { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          await supabase.auth.signUp({ email, password });
          ({ error } = await supabase.auth.signInWithPassword({ email, password }));
        }
        if (error) {
          setDevAuthError(error.message);
        } else {
          const { data: after } = await supabase.auth.getSession();
          setSession(after.session);
        }
      }

      setLoading(false);
    }

    bootstrapAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = useCallback(
    async (loginId: string, password: string) => {
      const email = normalizeLoginId(loginId);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const signUp = useCallback(
    async (loginId: string, password: string) => {
      const email = normalizeLoginId(loginId);
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  const updateDisplayName = useCallback(
    async (displayName: string) => {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: displayName.trim() },
      });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const updateLoginEmail = useCallback(
    async (loginId: string) => {
      const email = normalizeLoginId(loginId);
      const { error } = await supabase.auth.updateUser({ email });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const updatePassword = useCallback(
    async (newPassword: string) => {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error: error ? new Error(error.message) : null };
    },
    [supabase]
  );

  const updatePersonalDetails = useCallback(
    async (fields: {
      displayName: string;
      username: string;
      email: string;
      phone: string;
      avatarUrl: string;
    }) => {
      const { error: metaError } = await supabase.auth.updateUser({
        data: {
          display_name: fields.displayName.trim(),
          username: fields.username.trim(),
          phone: fields.phone.trim(),
          avatar_url: fields.avatarUrl.trim(),
        },
      });
      if (metaError) {
        return { error: new Error(metaError.message) };
      }

      const trimmedEmail = fields.email.trim();
      const normalizedEmail = trimmedEmail.includes("@")
        ? trimmedEmail
        : normalizeLoginId(trimmedEmail);
      const current = (await supabase.auth.getUser()).data.user?.email ?? "";
      if (normalizedEmail && normalizedEmail !== current) {
        const { error: emailError } = await supabase.auth.updateUser({ email: normalizedEmail });
        if (emailError) {
          return { error: new Error(emailError.message) };
        }
      }

      return { error: null };
    },
    [supabase]
  );

  const sendPasswordResetEmail = useCallback(async () => {
    const email = (await supabase.auth.getUser()).data.user?.email;
    if (!email) {
      return { error: new Error("No email on this account.") };
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error ? new Error(error.message) : null };
  }, [supabase]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    devAuthError,
    signIn,
    signUp,
    signOut,
    updateDisplayName,
    updateLoginEmail,
    updatePassword,
    updatePersonalDetails,
    sendPasswordResetEmail,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
