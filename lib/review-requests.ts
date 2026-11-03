export type EmailDeliveryStatus = "queued" | "sending" | "sent" | "failed";

export type ReviewRequestStatus =
  | "queued"
  | "sent"
  | "completed"
  | "private_feedback_submitted"
  | "cancelled";

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}
