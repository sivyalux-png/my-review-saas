export async function sendReviewEmail(
  requestId: string,
): Promise<
  | { ok: true; creditsRemaining: number }
  | { ok: false; message: string }
> {
  let response: Response;
  try {
    response = await fetch("/api/send-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });
  } catch (error) {
    console.error("Unable to reach the review email endpoint.", error);
    return { ok: false, message: "The request was created, but we couldn't send its email. Please try again later." };
  }

  let result: { error?: unknown; creditsRemaining?: unknown } | null = null;
  try {
    result = await response.json() as { error?: unknown; creditsRemaining?: unknown };
  } catch (error) {
    console.error("The review email endpoint returned an invalid response.", error);
  }

  if (!response.ok) {
    return {
      ok: false,
      message: typeof result?.error === "string"
        ? `The request was created, but the email wasn't sent: ${result.error}`
        : "The request was created, but the email wasn't sent. Please try again later.",
    };
  }

  if (typeof result?.creditsRemaining !== "number" || !Number.isInteger(result.creditsRemaining)) {
    console.error("The review email endpoint returned an invalid credit balance.", result);
    return {
      ok: false,
      message: "The email was sent, but we couldn't confirm the updated credit balance. Refresh the page.",
    };
  }
  return { ok: true, creditsRemaining: result.creditsRemaining };
}
