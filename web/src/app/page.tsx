import type { Metadata } from "next";
import { LandingPage } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "CapitalAI",
  description: "Personal finance app with linked accounts, savings goals, and Capito.",
};

/** Public landing — authenticated users are redirected to /dashboard inside LandingPage. */
export default function HomePage() {
  return <LandingPage />;
}
