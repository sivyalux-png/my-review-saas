import { notFound, redirect } from "next/navigation";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  if (!requestIdPattern.test(token)) notFound();

  const destination = new URLSearchParams();
  for (const key of ["rating", "submitted", "error"] as const) {
    const value = Array.isArray(query[key]) ? query[key]?.[0] : query[key];
    if (typeof value === "string" && /^[1-5]$/.test(value) && key === "rating") {
      destination.set(key, value);
    } else if (typeof value === "string" && value === "1" && key !== "rating") {
      destination.set(key, value);
    }
  }
  const suffix = destination.size ? `?${destination.toString()}` : "";
  redirect(`/r/${token}${suffix}`);
}
