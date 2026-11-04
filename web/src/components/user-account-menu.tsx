"use client";

/** Brand + signed-in identity in the header (account changes live on Settings only). */

import type { User } from "@supabase/supabase-js";
import { getDisplayName } from "@/lib/user-display";

type UserAccountMenuProps = {
  user: User;
  /** Header bar — name only; full block on Settings if needed later */
  compact?: boolean;
};

export function UserAccountMenu({ user, compact }: UserAccountMenuProps) {
  const name = getDisplayName(user);
  const email = user.email ?? "";

  if (compact) {
    return (
      <div className="min-w-0 max-w-[9rem] text-right lg:max-w-[11rem]">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground">{name}</p>
      {email ? (
        <p className="truncate text-xs text-muted-foreground">{email}</p>
      ) : null}
    </div>
  );
}
