import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    const detail = error.detail;
    const message =
      typeof detail === "string"
        ? detail
        : typeof detail === "object" && detail !== null
          ? JSON.stringify(detail)
          : Array.isArray(detail)
            ? detail.map((d: { msg?: string }) => d.msg).join(", ")
            : response.status >= 500
              ? "Server error — is the database connected?"
              : "Request failed";
    throw new Error(message);
  }

  return response.json();
}

export interface Account {
  id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string | null;
  is_active: boolean;
}

export interface Transaction {
  id: string;
  account_id: string;
  amount: number;
  date: string;
  name: string;
  merchant_name: string | null;
  category: string[] | null;
  category_primary: string | null;
  pending: boolean;
  payment_channel: string | null;
}

export const api = {
  createLinkToken: () =>
    request<{ link_token: string; expiration: string }>("/plaid/link-token", {
      method: "POST",
    }),

  exchangePublicToken: (publicToken: string) =>
    request<{ item_id: string; institution_name: string | null; accounts_linked: number }>(
      "/plaid/exchange-token",
      {
        method: "POST",
        body: JSON.stringify({ public_token: publicToken }),
      }
    ),

  syncTransactions: () =>
    request<{ added: number; modified: number; removed: number; accounts_updated: number }>(
      "/plaid/sync",
      { method: "POST" }
    ),

  getAccounts: () => request<Account[]>("/accounts"),

  getTransactions: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString();
    return request<Transaction[]>(`/transactions${qs ? `?${qs}` : ""}`);
  },
};
