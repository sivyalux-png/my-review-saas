import { redirect } from "next/navigation";
import { createAdminClient } from "../../../lib/supabase/admin";
import { createClient } from "../../../lib/supabase/server";
import { getEmailCredentialEncryptionStatus } from "../../../lib/email-provider";
import EmailProviderSettings from "../settings/email-provider-settings";

export default async function EmailSettingsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) throw error;

  const userId = data?.claims.sub;
  if (typeof userId !== "string") redirect("/login");

  const [{ data: profile, error: profileError }, { data: provider, error: providerError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("system_email_credits_remaining")
        .eq("id", userId)
        .maybeSingle(),
      createAdminClient()
        .from("email_provider_credentials")
        .select("provider, from_email")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  if (profileError) throw profileError;
  if (providerError) throw providerError;

  const encryptionStatus = getEmailCredentialEncryptionStatus();

  return (
    <div className="mx-auto max-w-[1380px] px-5 pb-12 pt-7 sm:px-8 sm:pt-9 lg:px-10">
      <header className="email-page-hero mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-300">
          Email setup
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          Connect your Resend account
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          Save your Resend API key and verified sender email here. Test emails
          use these saved details.
        </p>
      </header>
      <EmailProviderSettings
        initialProvider={provider?.provider === "resend" ? { fromEmail: provider.from_email } : null}
        encryptionConfigMessage={encryptionStatus.configured ? null : encryptionStatus.message}
        systemCreditsRemaining={profile?.system_email_credits_remaining ?? 0}
      />
    </div>
  );
}
