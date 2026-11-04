/** Shape of account rows returned by GET /api/v1/accounts */
export type Account = {
  id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | string | null;
  available_balance: number | string | null;
  iso_currency_code: string | null;
  is_active: boolean;
};

export type GoalTrackingMode = "manual" | "total_cash" | "account";

/** Shape of goal rows returned by GET /api/v1/goals */
export type Goal = {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  trackingMode: GoalTrackingMode;
  accountId?: string;
  createdAt: string;
};

/** Shape of transaction rows returned by GET /api/v1/transactions */
export type Transaction = {
  id: string;
  account_id: string;
  amount: number | string;
  date: string;
  name: string;
  merchant_name: string | null;
  category_primary: string | null;
  pending: boolean;
};
