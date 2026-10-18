import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../../lib/supabase/server";

const requestIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function googleReviewUrl(value: unknown): URL | null {
  if (typeof value !== "string") return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const allowedHost =
      hostname === "google.com" ||
      hostname.endsWith(".google.com") ||
      hostname === "g.page" ||
      hostname === "maps.app.goo.gl";
    return url.protocol === "https:" && allowedHost ? url : null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const rating = Number(request.nextUrl.searchParams.get("rating"));

  if (!requestIdPattern.test(id) || (rating !== 4 && rating !== 5)) {
    return NextResponse.redirect(new URL("/", request.url), 302);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("submit_public_review_response", {
      p_request_id: id,
      p_rating: rating,
      p_feedback: null,
    });

    if (error) {
      console.error("Unable to record high public review rating before redirect.", error);
      const fallback = new URL(`/r/${id}?rating=${rating}&error=1`, request.url);
      return NextResponse.redirect(fallback, {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const result = Array.isArray(data) ? data[0] : null;
    if (!result || (result.google_review_url !== null && typeof result.google_review_url !== "string")) {
      console.error("Google review redirect returned an invalid RPC result.", data);
      const fallback = new URL(`/r/${id}?rating=${rating}&error=1`, request.url);
      return NextResponse.redirect(fallback, {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const destination = googleReviewUrl(result.google_review_url);
    if (destination) {
      return NextResponse.redirect(destination, {
        status: 302,
        headers: { "Cache-Control": "no-store" },
      });
    }

    return NextResponse.redirect(
      new URL(`/r/${id}?rating=${rating}&submitted=1`, request.url),
      { status: 302, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Unable to process Google review redirect.", error);
    return NextResponse.redirect(
      new URL(`/r/${id}?rating=${rating}&error=1`, request.url),
      { status: 302, headers: { "Cache-Control": "no-store" } },
    );
  }
}
