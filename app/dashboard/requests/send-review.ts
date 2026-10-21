export async function sendReviewEmail(
  requestId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
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

  let result: { error?: unknown } | null = null;
  try {
    result = await response.json() as { error?: unknown };
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

  return { ok: true };
}

export function isEmailContact(contact: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.trim());
}
