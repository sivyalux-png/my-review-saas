import { randomBytes, createHmac } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hmacSecret = process.env.APPSUMO_LICENSE_HMAC_SECRET;

if (!supabaseUrl || !serviceRoleKey || !hmacSecret) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and APPSUMO_LICENSE_HMAC_SECRET in .env.local.",
  );
}

if (Buffer.byteLength(hmacSecret, "utf8") < 32) {
  throw new Error("APPSUMO_LICENSE_HMAC_SECRET must be at least 32 bytes.");
}

const licenseKey = `TEST-${randomBytes(20).toString("hex").toUpperCase()}`;
const keyHash = createHmac("sha256", hmacSecret)
  .update(licenseKey, "utf8")
  .digest("hex");
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});

const { error } = await supabase.from("licenses").insert({
  key_hash: keyHash,
  key_last4: licenseKey.slice(-4),
  source: "test",
  tier: "AppSumo Plus",
});

if (error) {
  throw new Error(`Unable to create test license: ${error.message}`);
}

console.log("Test license created. Copy it now; it cannot be recovered later:");
console.log(licenseKey);
