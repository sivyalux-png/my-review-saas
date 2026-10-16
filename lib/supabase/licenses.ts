import "server-only";

import { createHash, createHmac } from "node:crypto";

export function normalizeLicenseKey(key: string) {
  return key.trim().toUpperCase();
}

export function hashLicenseKey(key: string) {
  const secret = process.env.APPSUMO_LICENSE_HMAC_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "License validation is not configured. Set APPSUMO_LICENSE_HMAC_SECRET to a random secret of at least 32 bytes.",
    );
  }

  return createHmac("sha256", secret)
    .update(normalizeLicenseKey(key), "utf8")
    .digest("hex");
}

export function getLicenseKeyHashes(key: string) {
  const normalizedKey = normalizeLicenseKey(key);

  return [
    hashLicenseKey(normalizedKey),
    createHash("sha256").update(normalizedKey, "utf8").digest("hex"),
  ];
}

export const pendingLicenseCookieName = "pending_license_hash";
