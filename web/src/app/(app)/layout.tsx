import { AppShell } from "@/components/app-shell";

/** Route group (app): pages that require login share the same shell/nav. */
export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
