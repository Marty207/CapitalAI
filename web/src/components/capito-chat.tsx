"use client";

/**
 * Capito chat — POST /api/v1/capito/chat; can offer to create a savings goal from the reply.
 */

import { FormEvent, useEffect, useRef, useState } from "react";
import { CapitoAvatar } from "@/components/capito-avatar";
import { api } from "@/lib/api";
import { btnPrimaryClass, btnSecondaryClass, cardClass, inputClass, sectionLabelClass } from "@/lib/ui";

export type GoalSuggestion = {
  title: string;
  targetAmount: number;
};

export type ChatTurn = {
  role: "user" | "assistant";
  content: string;
  goalSuggestion?: GoalSuggestion;
  /** User already accepted or declined this suggestion */
  goalSuggestionHandled?: boolean;
};

const STARTERS = [
  "I'm saving for a car down payment. How long might that take?",
  "Summarize my recent spending.",
  "Am I on track for my savings goals?",
];

function isAffirmative(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(yes|yeah|yep|yup|sure|ok|okay|please|create it|go ahead|do it|sounds good)\b/.test(t);
}

function isNegative(text: string): boolean {
  const t = text.trim().toLowerCase();
  return /^(no|nah|nope|not now|skip|cancel)\b/.test(t);
}

function pendingSuggestionIndex(turns: ChatTurn[]): number {
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i];
    if (t.role === "assistant" && t.goalSuggestion && !t.goalSuggestionHandled) {
      return i;
    }
  }
  return -1;
}

/** Shown while Capito is waiting on the API — avatar + typing dots. */
function CapitoThinking({ avatarSize = 32 }: { avatarSize?: number }) {
  return (
    <div className="flex justify-start gap-2" role="status" aria-live="polite">
      <CapitoAvatar
        size={avatarSize}
        className="mt-0.5 animate-pulse motion-reduce:animate-none"
      />
      <div className="flex max-w-[85%] flex-col gap-1.5 rounded-2xl rounded-bl-md border border-border bg-surface/90 px-4 py-3">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent/80 [animation-delay:0ms] motion-reduce:animate-none" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent/80 [animation-delay:150ms] motion-reduce:animate-none" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-accent/80 [animation-delay:300ms] motion-reduce:animate-none" />
        </span>
        <p className="text-xs text-muted-foreground">Capito is thinking…</p>
      </div>
    </div>
  );
}

function GoalSuggestionCard({
  suggestion,
  busy,
  onSave,
  onDismiss,
}: {
  suggestion: GoalSuggestion;
  busy: boolean;
  onSave: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-accent/30 bg-accent/5 p-3">
      <p className="text-xs font-medium text-foreground">Suggested goal</p>
      <p className="mt-1 text-sm text-foreground">
        {suggestion.title}{" "}
        <span className="text-muted-foreground">
          · ${suggestion.targetAmount.toLocaleString()} target
        </span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" disabled={busy} onClick={onSave} className={`${btnPrimaryClass} text-xs`}>
          {busy ? "Saving…" : "Save to Goals"}
        </button>
        <button type="button" disabled={busy} onClick={onDismiss} className={`${btnSecondaryClass} text-xs`}>
          Not now
        </button>
      </div>
    </div>
  );
}

export function CapitoChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy]);

  /** Save suggestion to Postgres (Goals tab) — primary path is POST /capito/save-goal. */
  async function saveSuggestionToGoals(suggestion: GoalSuggestion, suggestionTurnIndex: number) {
    setBusy(true);
    setError(null);
    setTurns((prev) =>
      prev.map((t, i) => (i === suggestionTurnIndex ? { ...t, goalSuggestionHandled: true } : t))
    );
    try {
      const { reply } = await api.capitoSaveGoal(suggestion);
      setTurns((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      try {
        await api.createGoal({
          title: suggestion.title,
          targetAmount: suggestion.targetAmount,
          currentAmount: 0,
          trackingMode: "manual",
        });
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `I saved "${suggestion.title}" ($${suggestion.targetAmount.toLocaleString()} target) to your Goals tab.`,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not save that goal.");
        setTurns((prev) =>
          prev.map((t, i) =>
            i === suggestionTurnIndex ? { ...t, goalSuggestionHandled: false } : t
          )
        );
      }
    } finally {
      setBusy(false);
    }
  }

  /** Typed "yes" after a suggestion — same save path, with a user line in the thread. */
  async function capitoCreatesGoal(
    suggestion: GoalSuggestion,
    suggestionTurnIndex: number,
    userLine: string
  ) {
    setTurns((prev) => [...prev, { role: "user", content: userLine }]);
    await saveSuggestionToGoals(suggestion, suggestionTurnIndex);
  }

  function declineSuggestion(suggestionTurnIndex: number) {
    setTurns((prev) =>
      prev.map((t, i) => (i === suggestionTurnIndex ? { ...t, goalSuggestionHandled: true } : t))
    );
    setTurns((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "No problem. Ask anytime if you want to set up a goal later.",
      },
    ]);
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;

    setError(null);
    const pendingIdx = pendingSuggestionIndex(turns);
    const pending = pendingIdx >= 0 ? turns[pendingIdx].goalSuggestion : undefined;

    if (pending && isAffirmative(trimmed)) {
      setDraft("");
      await capitoCreatesGoal(pending, pendingIdx, trimmed);
      return;
    }

    if (pending && isNegative(trimmed)) {
      setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
      setDraft("");
      declineSuggestion(pendingIdx);
      return;
    }

    setTurns((prev) => [...prev, { role: "user", content: trimmed }]);
    setDraft("");
    setBusy(true);

    try {
      const history = turns.map(({ role, content }) => ({ role, content }));
      const { reply, goal_suggestion } = await api.capitoChat(trimmed, history);

      let goalSuggestion: GoalSuggestion | undefined;
      if (goal_suggestion?.title) {
        const target = Number(goal_suggestion.target_amount);
        if (Number.isFinite(target) && target > 0) {
          goalSuggestion = { title: goal_suggestion.title, targetAmount: target };
        }
      }

      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: reply,
          goalSuggestion,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Capito could not respond.");
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void sendMessage(draft);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={scrollRef}
        className={`${cardClass} flex max-h-[min(60vh,520px)] min-h-[280px] flex-col gap-3 overflow-y-auto p-4`}
      >
        {turns.length === 0 && !busy ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
            <CapitoAvatar size={72} className="drop-shadow-[0_8px_24px_rgb(0_0_0/0.35)]" />
            <div>
              <p className="font-semibold text-foreground">Hi, I&apos;m Capito</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Ask about balances, goals, or how long it might take to save for something.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {STARTERS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage(prompt)}
                  className="rounded-full border border-border bg-surface/80 px-3 py-1.5 text-xs text-foreground transition hover:border-accent/40 hover:bg-surface-hover disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : turns.length === 0 && busy ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
            <CapitoAvatar
              size={72}
              className="animate-pulse drop-shadow-[0_8px_24px_rgb(0_0_0/0.35)] motion-reduce:animate-none"
            />
            <CapitoThinking avatarSize={40} />
          </div>
        ) : (
          turns.map((turn, i) => (
            <div
              key={`${i}-${turn.role}`}
              className={turn.role === "user" ? "flex justify-end" : "flex justify-start gap-2"}
            >
              {turn.role === "assistant" ? (
                <CapitoAvatar size={32} className="mt-0.5" aria-hidden />
              ) : null}
              <div
                className={
                  turn.role === "user"
                    ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm text-accent-foreground"
                    : "max-w-[85%] rounded-2xl rounded-bl-md border border-border bg-surface/90 px-3.5 py-2.5 text-sm text-foreground whitespace-pre-wrap"
                }
              >
                {turn.content}
                {turn.role === "assistant" &&
                turn.goalSuggestion &&
                !turn.goalSuggestionHandled ? (
                  <GoalSuggestionCard
                    suggestion={turn.goalSuggestion}
                    busy={busy}
                    onSave={() => void saveSuggestionToGoals(turn.goalSuggestion!, i)}
                    onDismiss={() => declineSuggestion(i)}
                  />
                ) : null}
              </div>
            </div>
          ))
        )}
        {busy && turns.length > 0 ? <CapitoThinking /> : null}
      </div>

      {error ? (
        <p className="rounded-xl border border-danger/40 bg-danger-bg px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-2">
        <label htmlFor="capito-input" className={sectionLabelClass}>
          Message Capito
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="capito-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Capito anything about your finances…"
            className={`${inputClass} flex-1`}
            disabled={busy}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !draft.trim()}
            className={`${btnPrimaryClass} shrink-0`}
          >
            {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </form>
    </div>
  );
}
