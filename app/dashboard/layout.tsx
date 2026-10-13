import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "../../lib/supabase/server";
import DashboardShell from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error && error.name !== "AuthSessionMissingError") {
    throw error;
  }

  if (!data?.claims.sub) {
    redirect("/login");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
