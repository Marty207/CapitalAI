"use client";

/**
 * Dedicated Goals tab — savings targets (Supabase via /api/v1/goals).
 */

import { GoalsSection } from "@/components/goals-section";
import { useAuth } from "@/contexts/auth-context";
import { pageTitleClass } from "@/lib/ui";

export default function GoalsPage() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitleClass}>Goals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track progress toward savings targets using your linked accounts or a fixed amount.
        </p>
      </div>
      <GoalsSection userId={user.id} />
    </div>
  );
}
