/**
 * CapitalAI header brand — image from repo root CapitalAI_Logo.png (synced to web/public on dev).
 */

import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

/** Same filename as repo root; sync-logo.mjs copies it before npm run dev. */
const LOGO_SRC = "/CapitalAI_Logo.png";

type AppBrandProps = {
  href?: string;
  size?: "sm" | "md";
};

export function AppBrand({ href = "/dashboard", size = "md" }: AppBrandProps) {
  const px = size === "md" ? 40 : 36;
  const textClass = size === "md" ? "text-base leading-none" : "text-sm leading-none";
  const imgClass = size === "md" ? "h-9 w-9" : "h-8 w-8";

  return (
    <Link
      href={href}
      aria-label={`${APP_NAME} home`}
      className="group flex h-9 shrink-0 items-center gap-2.5 rounded-lg outline-none ring-accent/40 focus-visible:ring-2"
    >
      <Image
        src={LOGO_SRC}
        alt={APP_NAME}
        width={px}
        height={px}
        unoptimized
        className={`${imgClass} shrink-0 object-contain`}
        priority
      />
      <span className={`${textClass} font-semibold tracking-tight text-foreground`}>
        Capital<span className="text-accent">AI</span>
      </span>
    </Link>
  );
}
