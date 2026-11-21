import { redirect } from "next/navigation";

export default async function BusinessesPage() {
  redirect("/dashboard/settings#businesses-and-locations");
}
