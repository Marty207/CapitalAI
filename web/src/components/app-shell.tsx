"use client";

/**
 * Layout wrapper for logged-in pages: top nav + redirects to /login if no session.
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppBrand } from "@/components/app-brand";
import { useAuth } from "@/contexts/auth-context";
import { isDevAutoLogin } from "@/lib/dev-auth";
import { headerNavLinkActiveClass, headerNavLinkClass } from "@/lib/ui";

const navItems = [
  { href: "/dashboard", label: "Home" },
  { href: "/goals", label: "Goals" },
  { href: "/capito", label: "Capito" },
  { href: "/transactions", label: "Transactions" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [loading, session, router]);

  function handleSignOut() {
    if (!window.confirm("Are you sure you want to log out?")) return;
    signOut().then(() => router.replace("/login"));
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        {loading ? (isDevAutoLogin() ? "Dev sign-in…" : "Loading…") : "Redirecting to login…"}
      </div>
    );
  }

  return (
    <div className="app-gradient min-h-screen text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 shadow-[0_1px_0_rgb(255_255_255/0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
          <div className="flex shrink-0 items-center">
            <AppBrand href="/dashboard" size="md" />
          </div>

          <nav
            className="flex min-w-0 flex-1 items-center justify-end gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:justify-center sm:gap-1 [&::-webkit-scrollbar]:hidden"
            aria-label="Main"
          >
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active ? headerNavLinkActiveClass : headerNavLinkClass}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center border-l border-border pl-3 sm:pl-4">
            <button type="button" onClick={handleSignOut} className={headerNavLinkClass}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
