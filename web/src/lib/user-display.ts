import type { User } from "@supabase/supabase-js";

/** Friendly name in header/settings — from metadata or email local part. */
export function getDisplayName(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata?.display_name;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  const email = user.email ?? "";
  const local = email.split("@")[0];
  return local || email;
}

export function getUsername(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata?.username;
  if (typeof meta === "string" && meta.trim()) return meta.trim();
  const email = user.email ?? "";
  return email.includes("@") ? email.split("@")[0] : email;
}

export function getPhone(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata?.phone;
  return typeof meta === "string" ? meta : "";
}

export function getAvatarUrl(user: User | null | undefined): string {
  if (!user) return "";
  const meta = user.user_metadata?.avatar_url;
  return typeof meta === "string" ? meta : "";
}

export function getInitials(user: User | null | undefined): string {
  const name = getDisplayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "?";
}
