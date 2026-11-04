/**
 * Shared Tailwind classes — all colors come from globals.css tokens.
 */

export const cardClass =
  "rounded-2xl border border-border bg-surface-elevated shadow-lg shadow-black/25 ring-1 ring-inset ring-white/[0.06]";

export const listClass =
  "divide-y divide-border rounded-2xl border border-border bg-surface/80 overflow-hidden backdrop-blur-sm";

export const inputClass =
  "mt-1.5 w-full rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-foreground placeholder:text-muted outline-none transition duration-200 focus:border-accent/45 focus:ring-2 focus:ring-accent/25";

export const btnPrimaryClass =
  "rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-[0_1px_0_rgb(255_255_255/0.2)_inset] transition duration-200 hover:bg-accent-hover hover:shadow-[0_0_20px_var(--accent-glow)] disabled:opacity-50";

export const btnSecondaryClass =
  "rounded-xl border border-border-strong bg-surface/90 px-4 py-2.5 text-sm font-semibold text-foreground backdrop-blur-sm transition duration-200 hover:border-accent/30 hover:bg-surface-hover disabled:opacity-50";

export const codeInlineClass =
  "rounded-md border border-border bg-surface px-1.5 py-0.5 font-mono text-xs text-accent";

export const pageTitleClass = "text-2xl font-semibold tracking-tight text-foreground";

export const sectionLabelClass =
  "text-[11px] font-semibold uppercase tracking-[0.14em] text-foreground";

/** Top app bar — same height/padding for tabs and Sign out */
export const headerNavLinkClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg px-3 py-1.5 text-sm leading-none text-muted-foreground transition hover:bg-surface-hover hover:text-foreground";

export const headerNavLinkActiveClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg bg-accent-muted px-3 py-1.5 text-sm font-semibold leading-none text-accent";

/** Inset list group (iOS / Stripe-style settings rows). */
export const settingsGroupClass =
  "overflow-hidden rounded-2xl border border-border bg-surface/50 divide-y divide-border";

/** Field inside a settings row — no extra box around each input. */
export const settingsFieldClass =
  "mt-1 w-full border-0 bg-transparent p-0 text-base text-foreground outline-none placeholder:text-muted focus:ring-0";

export const settingsRowClass = "px-4 py-3.5 sm:px-5";

/** Read-only label + value row (settings view mode). */
export const settingsValueRowClass =
  "flex items-center justify-between gap-4 text-sm sm:px-5 px-4 py-3.5";

export const settingsFooterRowClass =
  "flex flex-col gap-3 bg-surface/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5";

/** Full-width tappable row (logout, legal links). */
export const settingsLinkRowClass =
  "flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-foreground transition hover:bg-surface-hover sm:px-5";

export const settingsDangerRowClass =
  "flex w-full items-center justify-between px-4 py-3.5 text-left text-sm text-danger transition hover:bg-danger-bg sm:px-5";

export const successBannerClass =
  "rounded-xl border border-accent/30 bg-accent-muted px-4 py-3 text-sm text-accent";

/** SVG gauge strokes — read CSS variables set in globals.css */
export const gaugeColors = {
  fill: "var(--ring-gauge)",
  track: "var(--ring-track)",
  mutedFill: "var(--muted)",
};
