/**
 * Local-only shortcut: auto sign-in so you can skip the login screen while building UI.
 * Still uses Supabase — the backend needs a real JWT for Plaid/accounts.
 * Set NEXT_PUBLIC_DEV_AUTO_LOGIN=false before shipping.
 */

/** Supabase Auth uses email internally; plain usernames become username@YOUR_DOMAIN */
const LOGIN_DOMAIN =
  process.env.NEXT_PUBLIC_DEV_LOGIN_DOMAIN ?? "financeai.test";

export function isDevAutoLogin(): boolean {
  return process.env.NEXT_PUBLIC_DEV_AUTO_LOGIN === "true";
}

/** Turn "devlogin" or "you@gmail.com" into what Supabase expects. */
export function normalizeLoginId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.includes("@")) return trimmed;
  return `${trimmed}@${LOGIN_DOMAIN}`;
}

export function devCredentials() {
  const login =
    process.env.NEXT_PUBLIC_DEV_LOGIN ??
    process.env.NEXT_PUBLIC_DEV_EMAIL ??
    "devlogin";
  const password = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? "0000";
  return {
    login,
    password,
    email: normalizeLoginId(login),
  };
}
