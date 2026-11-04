import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Account, Goal, GoalTrackingMode, Transaction } from "@/lib/types";

/** Dev URLs that should use the Next.js proxy instead of cross-origin fetch. */
const LOCAL_DIRECT_API =
  /^https?:\/\/(127\.0\.0\.1|localhost):8000\/api\/v1\/?$/i;

/**
 * Browser calls `/api/proxy` (rewritten to FastAPI in next.config.ts) to avoid CORS.
 * Server-side code still uses NEXT_PUBLIC_API_URL or localhost:8000.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    if (fromEnv === "/api/proxy") return "/api/proxy";
    if (!fromEnv || LOCAL_DIRECT_API.test(fromEnv)) return "/api/proxy";
    if (fromEnv.startsWith("/")) return fromEnv;
    return fromEnv;
  }
  return fromEnv ?? "http://127.0.0.1:8000/api/v1";
}

const BACKEND_START_HINT =
  "Start the API in another terminal: cd web && npm run dev:backend — then refresh this page (restart npm run dev if you changed next.config.ts).";

type GoalApiRow = {
  id: string;
  title: string;
  target_amount: number | string;
  current_amount: number | string;
  tracking_mode: GoalTrackingMode;
  account_id: string | null;
  created_at: string;
};

function mapGoalFromApi(row: GoalApiRow): Goal {
  return {
    id: row.id,
    title: row.title,
    targetAmount: Number(row.target_amount),
    currentAmount: Number(row.current_amount),
    trackingMode: row.tracking_mode,
    accountId: row.account_id ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * Attach the Supabase access token so the backend can identify the user
 * (backend/app/core/security.py validates this JWT).
 */
async function authHeaders(): Promise<HeadersInit> {
  const { data } = await getSupabaseBrowserClient().auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const apiBase = getApiBaseUrl();
  const headers = await authHeaders();
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });
  } catch {
    throw new Error(`Can't reach the API (${apiBase}). ${BACKEND_START_HINT}`);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ detail: response.statusText }));
    const detail = body.detail;
    const message =
      typeof detail === "string"
        ? detail
        : response.status >= 500
          ? "Server error — is the backend running on port 8000?"
          : "Request failed";
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

export const api = {
  getPlaidConfig: () =>
    request<{
      environment: "sandbox" | "production";
      oauth_redirect_configured: boolean;
    }>("/plaid/config"),

  createLinkToken: () =>
    request<{ link_token: string; expiration: string }>("/plaid/link-token", {
      method: "POST",
    }),

  exchangePublicToken: (publicToken: string) =>
    request<{ item_id: string; accounts_linked: number }>("/plaid/exchange-token", {
      method: "POST",
      body: JSON.stringify({ public_token: publicToken }),
    }),

  syncTransactions: () =>
    request<{ added: number; modified: number; removed: number }>("/plaid/sync", {
      method: "POST",
    }),

  getAccounts: () => request<Account[]>("/accounts"),

  /** Savings goals — stored in Supabase Postgres via FastAPI. */
  getGoals: async (): Promise<Goal[]> => {
    const rows = await request<GoalApiRow[]>("/goals");
    return rows.map(mapGoalFromApi);
  },

  createGoal: (body: {
    title: string;
    targetAmount: number;
    currentAmount: number;
    trackingMode: GoalTrackingMode;
    accountId?: string;
  }) =>
    request<GoalApiRow>("/goals", {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        target_amount: body.targetAmount,
        current_amount: body.currentAmount,
        tracking_mode: body.trackingMode,
        account_id: body.accountId ?? null,
      }),
    }).then(mapGoalFromApi),

  patchGoalAmount: (goalId: string, currentAmount: number) =>
    request<GoalApiRow>(`/goals/${goalId}`, {
      method: "PATCH",
      body: JSON.stringify({ current_amount: currentAmount }),
    }).then(mapGoalFromApi),

  deleteGoal: (goalId: string) =>
    request<null>(`/goals/${goalId}`, { method: "DELETE" }),

  /** Permanent account delete (requires SUPABASE_SERVICE_ROLE_KEY on backend). */
  deleteAccount: () => request<null>("/account", { method: "DELETE" }),

  getTransactions: (options?: { limit?: number; accountId?: string }) => {
    const limit = options?.limit ?? 50;
    const params = new URLSearchParams({ limit: String(limit) });
    if (options?.accountId) {
      params.set("account_id", options.accountId);
    }
    return request<Transaction[]>(`/transactions?${params.toString()}`);
  },

  /** Capito AI assistant (DeepSeek on server) — loads accounts/goals/transactions context. */
  capitoChat: (
    message: string,
    history: { role: "user" | "assistant"; content: string }[],
    options?: { confirmGoal?: { title: string; targetAmount: number } }
  ) =>
    request<{
      reply: string;
      assistant_name: string;
      goal_suggestion: { title: string; target_amount: number | string } | null;
    }>("/capito/chat", {
      method: "POST",
      body: JSON.stringify({
        message,
        history,
        confirm_goal: options?.confirmGoal
          ? {
              title: options.confirmGoal.title,
              target_amount: options.confirmGoal.targetAmount,
            }
          : null,
      }),
    }),

  /** Save a Capito suggestion to the Goals tab (POST /capito/save-goal). */
  capitoSaveGoal: (body: { title: string; targetAmount: number }) =>
    request<{ reply: string; assistant_name: string }>("/capito/save-goal", {
      method: "POST",
      body: JSON.stringify({
        title: body.title,
        target_amount: body.targetAmount,
      }),
    }),
};
