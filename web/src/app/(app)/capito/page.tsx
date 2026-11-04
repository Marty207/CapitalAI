"use client";

/**
 * Capito — CapitalAI AI assistant tab (chat backed by FastAPI + DeepSeek).
 */

import { CapitoAvatar } from "@/components/capito-avatar";
import { CapitoChat } from "@/components/capito-chat";
import { pageTitleClass } from "@/lib/ui";

export default function CapitoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <header className="flex items-start gap-4">
        <CapitoAvatar size={64} className="hidden sm:block" />
        <div>
        <h1 className={pageTitleClass}>Capito</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI assistant for balances, goals, and spending — powered by DeepSeek and your linked data.
        </p>
        </div>
      </header>
      <CapitoChat />
    </div>
  );
}
