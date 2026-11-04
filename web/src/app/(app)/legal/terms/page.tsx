import Link from "next/link";
import { pageTitleClass, sectionLabelClass } from "@/lib/ui";

/** Placeholder legal copy — replace with your lawyer-approved Terms before production. */
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-lg space-y-6 pb-8">
      <Link href="/settings" className="text-sm text-accent hover:underline">
        ← Settings
      </Link>
      <h1 className={pageTitleClass}>Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: October 2026</p>
      <section className="space-y-3 text-sm text-muted-foreground">
        <h2 className={sectionLabelClass}>Summary</h2>
        <p>
          CapitalAI helps you view linked account balances and transactions via Plaid. By using
          the service, you agree to use it responsibly and provide accurate information when
          signing up.
        </p>
        <p>
          This is a development placeholder. Before launching publicly, replace this page with
          formal terms covering eligibility, data use, disclaimers (not financial advice), and
          limitation of liability.
        </p>
      </section>
    </article>
  );
}
