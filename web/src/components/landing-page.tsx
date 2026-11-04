"use client";

/**
 * Public landing at `/`. CTAs go to /login; signed in users go to /dashboard.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppBrand } from "@/components/app-brand";
import { CapitoAvatar } from "@/components/capito-avatar";
import { useAuth } from "@/contexts/auth-context";
import {
  btnPrimaryClass,
  btnSecondaryClass,
  cardClass,
  sectionLabelClass,
} from "@/lib/ui";

const EXAMPLE_QUESTIONS = [
  "I'm saving for a down payment on a car. How can I get there faster?",
  "Am I on track for my emergency fund goal?",
  "Where did most of my money go last month?",
  "Can I afford to save $200 more each month based on my spending?",
  "What subscriptions or recurring charges am I paying?",
  "How much cash do I have across all my accounts right now?",
];

const FEATURES = [
  {
    title: "Linked accounts",
    body: "Plaid connects your bank. Balances and transactions live in your dashboard and Supabase database.",
  },
  {
    title: "Savings goals",
    body: "Set targets and watch progress bars update, manually or from linked cash.",
  },
  {
    title: "Capito",
    body: "Ask in plain language. Answers come from your balances, goals, and transactions only.",
  },
  {
    title: "Your login only",
    body: "Nothing is shared across users. Capito does not browse the internet.",
  },
];

const STEPS = [
  "Create an account",
  "Link a bank with Plaid",
  "Add goals if you want",
  "Ask Capito Anything",
];

export function LandingPage() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && session) {
      router.replace("/dashboard");
    }
  }, [loading, session, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Loading
      </div>
    );
  }

  if (session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Opening dashboard
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 shadow-[0_1px_0_rgb(255_255_255/0.04)] backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <AppBrand href="/" size="md" />
          <div className="flex shrink-0 items-center gap-2">
            <Link href="/login" className={`${btnSecondaryClass} px-3 py-2 text-sm`}>
              Sign in
            </Link>
            <Link href="/login" className={`${btnPrimaryClass} hidden px-3 py-2 text-sm sm:inline-flex`}>
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
        {/* Hero */}
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
          <div className="space-y-6">
            <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight sm:text-[2.75rem]">
              Ask <span className="text-accent">Capito</span> anything about your money.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-muted-foreground">
              Link your bank, track what you are saving for, and get clear answers from an assistant
              that actually knows your numbers.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/login" className={btnPrimaryClass}>
                Start free
              </Link>
              <Link href="/login" className={btnSecondaryClass}>
                I have an account
              </Link>
            </div>
          </div>

          <div className={`${cardClass} relative mx-auto w-full max-w-sm p-8 lg:max-w-none`}>
            <div className="absolute inset-x-8 top-0 h-px bg-accent/50" aria-hidden />
            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent">
                Meet Capito
              </p>
              <CapitoAvatar size={128} className="mt-4 drop-shadow-[0_16px_40px_rgb(0_0_0/0.45)]" />
              <p className="mt-5 text-base font-semibold leading-snug text-foreground">
                Ask Capito anything, and let it help you with your finances, goals, spending, and
                linked accounts.
              </p>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section className="mt-20 sm:mt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Try asking</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Examples only. You can phrase it however you want.
              </p>
            </div>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <li
                key={q}
                className="rounded-xl border border-border bg-surface/80 px-4 py-3.5 text-sm text-foreground transition hover:border-accent/35 hover:bg-surface-hover"
              >
                <span className="text-accent">&ldquo;</span>
                {q}
                <span className="text-accent">&rdquo;</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Features */}
        <section className="mt-20 sm:mt-24">
          <h2 className={sectionLabelClass}>What you get</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className={`${cardClass} p-5`}>
                <h3 className="font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section className="mt-20 sm:mt-24">
          <h2 className={sectionLabelClass}>How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className="rounded-xl border border-border bg-surface px-4 py-5"
              >
                <span className="text-2xl font-semibold tabular-nums text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Capito CTA */}
        <section className="mt-20 sm:mt-24">
          <div className={`${cardClass} flex flex-col items-center px-6 py-10 text-center sm:px-10`}>
            <CapitoAvatar size={72} className="mb-4" />
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Have <span className="text-accent">Capito</span> help with your finances
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              Sign in, link your accounts, and ask questions about spending, goals, and balances
              anytime.
            </p>
            <Link href="/login" className={`${btnPrimaryClass} mt-6`}>
              Get started
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6">
        <p className="text-center text-xs text-muted">CapitalAI @2026</p>
      </footer>
    </div>
  );
}
