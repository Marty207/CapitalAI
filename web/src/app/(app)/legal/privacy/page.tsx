import Link from "next/link";
import { pageTitleClass, sectionLabelClass } from "@/lib/ui";

/** Placeholder legal copy — replace with your lawyer-approved Privacy Policy before production. */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-lg space-y-6 pb-8">
      <Link href="/settings" className="text-sm text-accent hover:underline">
        ← Settings
      </Link>
      <h1 className={pageTitleClass}>Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: October 2026</p>
      <section className="space-y-3 text-sm text-muted-foreground">
        <h2 className={sectionLabelClass}>What we store</h2>
        <p>
          Account credentials are handled by Supabase Auth. Bank link data and transactions are
          stored in your Supabase Postgres database and synced through Plaid according to their
          policies.
        </p>
        <p>
          This is a development placeholder. A production policy should describe data retention,
          third parties (Plaid, Supabase), your rights, and contact information.
        </p>
      </section>
    </article>
  );
}
