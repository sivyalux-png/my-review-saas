"use client";

import { useState } from "react";
import {
  disconnectEmailProvider,
  saveEmailProvider,
  sendProviderTestEmail,
} from "./email-actions";

const inputClass = "mt-1.5 h-11 w-full rounded-[5px] border border-zinc-800 bg-[#09090b] px-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-emerald-400/60";

export default function EmailProviderSettings({
  initialProvider,
  encryptionConfigMessage,
  systemCreditsRemaining,
}: {
  initialProvider: { fromEmail: string } | null;
  encryptionConfigMessage: string | null;
  systemCreditsRemaining: number;
}) {
  const [fromEmail, setFromEmail] = useState(initialProvider?.fromEmail ?? "");
  const [resendApiKey, setResendApiKey] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [connectedResend, setConnectedResend] = useState(initialProvider !== null);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      const result = await saveEmailProvider({ fromEmail, resendApiKey });
      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        setConnectedResend(true);
        setResendApiKey("");
      }
    } catch (error) {
      console.error("Unable to save Resend settings.", error);
      setIsError(true);
      setMessage("We couldn't save your email settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function sendTest() {
    setMessage("");
    setIsTesting(true);
    try {
      const result = await sendProviderTestEmail();
      setIsError(!result.ok);
      setMessage(result.message);
    } catch (error) {
      console.error("Unable to send test email.", error);
      setIsError(true);
      setMessage("We couldn't send a test email. Please try again.");
    } finally {
      setIsTesting(false);
    }
  }

  async function disconnect() {
    setMessage("");
    setIsDisconnecting(true);
    try {
      const result = await disconnectEmailProvider();
      setIsError(!result.ok);
      setMessage(result.message);
      if (result.ok) {
        setConnectedResend(false);
        setFromEmail("");
        setResendApiKey("");
      }
    } catch (error) {
      console.error("Unable to disconnect Resend.", error);
      setIsError(true);
      setMessage("We couldn't disconnect your email settings. Please try again.");
    } finally {
      setIsDisconnecting(false);
    }
  }

  return (
    <section
      aria-labelledby="email-provider-heading"
      className="settings-section mx-auto mb-12 mt-4 max-w-[1380px] rounded-[6px] border border-zinc-800 bg-[#101013] p-4 sm:p-5"
    >
      <div className="settings-section-heading mb-5 border-b border-zinc-800 pb-4">
        <p className="settings-section-eyebrow settings-section-blue">RESEND EMAIL SENDER</p>
        <h2 className="mt-2 text-base font-medium" id="email-provider-heading">Connect Resend</h2>
        <p className="mt-1 text-sm leading-6 text-zinc-400">
          Add your Resend details once to send emails directly from your business.
        </p>
        <p className="mt-2 text-xs text-emerald-200">
          {connectedResend
            ? `Resend is connected · ${fromEmail}`
            : `Resend is not connected · ${systemCreditsRemaining} free system emails remain for review requests`}
        </p>
      </div>

      {encryptionConfigMessage && (
        <div className="mb-5 rounded-[5px] border border-amber-400/30 bg-amber-400/[0.06] p-4 text-xs leading-5 text-amber-100" role="alert">
          <p className="font-semibold">Email credential encryption needs setup</p>
          <p className="mt-1">{encryptionConfigMessage}</p>
          <p className="mt-2">Generate a secure 32-byte key from your project folder:</p>
          <code className="mt-2 block overflow-x-auto rounded bg-black/30 p-2 text-[11px]">
            node -e &quot;console.log(require(&apos;node:crypto&apos;).randomBytes(32).toString(&apos;base64&apos;))&quot;
          </code>
          <p className="mt-2">
            Copy the output as the <code>EMAIL_CREDENTIALS_ENCRYPTION_KEY</code>{" "}
            value in your server environment. Locally, use the project-root{" "}
            <code>.env.local</code> and restart the dev server; in production,
            use your host&apos;s server-only environment variables and redeploy.
            A 64-character hexadecimal key also works. Keep it private and do
            not change it after saving credentials.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(250px,0.8fr)]">
        <form className="space-y-4" onSubmit={save}>
          <label className="block text-sm font-medium text-zinc-200" htmlFor="resend-api-key">
            Resend API key
            <input
              autoComplete="new-password"
              className={inputClass}
              id="resend-api-key"
              onChange={(event) => setResendApiKey(event.target.value)}
              placeholder={connectedResend ? "Paste a new key to replace the saved one" : "Paste your Resend API key"}
              required
              type="password"
              value={resendApiKey}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              Your key is encrypted and never shown again.
            </span>
          </label>

          <label className="block text-sm font-medium text-zinc-200" htmlFor="sender-email">
            Sender email
            <input
              autoComplete="email"
              className={inputClass}
              id="sender-email"
              onChange={(event) => setFromEmail(event.target.value)}
              placeholder="reviews@yourdomain.com"
              required
              type="email"
              value={fromEmail}
            />
            <span className="mt-1 block text-xs font-normal text-zinc-500">
              Use an email address on the domain you verified in Resend.
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              className="rounded-[5px] bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 disabled:opacity-50"
              disabled={isSaving || Boolean(encryptionConfigMessage)}
              type="submit"
            >
              {isSaving ? "Saving…" : "Save email settings"}
            </button>
            <button
              className="rounded-[5px] border border-zinc-700 px-4 py-2.5 text-xs font-medium text-zinc-200 disabled:opacity-50"
              disabled={isTesting || !connectedResend || Boolean(encryptionConfigMessage)}
              onClick={() => void sendTest()}
              type="button"
            >
              {isTesting ? "Sending…" : "Send Test Email"}
            </button>
            {connectedResend && (
              <button
                className="rounded-[5px] border border-zinc-700 px-4 py-2.5 text-xs font-medium text-zinc-300 disabled:opacity-50"
                disabled={isDisconnecting}
                onClick={() => void disconnect()}
                type="button"
              >
                {isDisconnecting ? "Disconnecting…" : "Disconnect"}
              </button>
            )}
          </div>
          {message && (
            <p
              aria-live="polite"
              className={`text-xs leading-5 ${isError ? "text-rose-300" : "text-emerald-300"}`}
              role={isError ? "alert" : "status"}
            >
              {message}
            </p>
          )}
        </form>

        <aside className="rounded-[6px] border border-zinc-800 bg-zinc-950/70 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Need a Resend API key?</h3>
          <ol className="mt-3 space-y-3 text-xs leading-5 text-zinc-400">
            <li><span className="mr-2 font-semibold text-emerald-300">1.</span>Create a free account at resend.com.</li>
            <li><span className="mr-2 font-semibold text-emerald-300">2.</span>Verify your sending domain in Resend.</li>
            <li><span className="mr-2 font-semibold text-emerald-300">3.</span>Create an API key and paste it here.</li>
          </ol>
          <p className="mt-4 text-xs leading-5 text-zinc-500">
            Test emails are sent only with the saved, encrypted Resend key and
            sender address. They never fall back to the system sender.
          </p>
        </aside>
      </div>
    </section>
  );
}
