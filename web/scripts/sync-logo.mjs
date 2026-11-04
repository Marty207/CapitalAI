/**
 * Copies CapitalAI_Logo.png from repo root into web/public (Next.js static files).
 * Runs before dev/build so the header always matches the file in the project root.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const rootLogo = path.join(here, "..", "..", "CapitalAI_Logo.png");
const publicDir = path.join(here, "..", "public");
const dest = path.join(publicDir, "CapitalAI_Logo.png");
const destAlias = path.join(publicDir, "logo.png");

if (!fs.existsSync(rootLogo)) {
  console.warn("[sync-logo] Missing repo root CapitalAI_Logo.png — skip");
  process.exit(0);
}

fs.mkdirSync(publicDir, { recursive: true });
fs.copyFileSync(rootLogo, dest);
fs.copyFileSync(rootLogo, destAlias);
console.log("[sync-logo] Copied CapitalAI_Logo.png → web/public/");
