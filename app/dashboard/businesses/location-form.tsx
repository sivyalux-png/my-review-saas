"use client";

import { useActionState } from "react";
import { createBusinessLocation } from "./actions";

export default function LocationForm({ canAdd }: { canAdd: boolean }) {
  const [state, action, isPending] = useActionState(createBusinessLocation, {});

  return (
    <form action={action} className="mt-5 space-y-3">
      <label className="block text-[11px] font-medium text-zinc-300" htmlFor="businessName">
        New business or location
        <input
          autoComplete="organization"
          className="mt-2 h-11 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none focus:border-emerald-400"
          id="businessName"
          maxLength={160}
          name="businessName"
          placeholder="e.g. Downtown location"
          required
        />
      </label>
      <button
        className="rounded-md bg-emerald-400 px-4 py-2.5 text-xs font-semibold text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canAdd || isPending}
        type="submit"
      >
        {isPending ? "Adding location…" : "Add location"}
      </button>
      {!canAdd && <p className="text-[11px] text-amber-200">You have reached the location limit for your plan.</p>}
      {state.error && <p aria-live="polite" className="text-[11px] text-rose-300" role="alert">{state.error}</p>}
      {state.success && <p aria-live="polite" className="text-[11px] text-emerald-300" role="status">{state.success}</p>}
    </form>
  );
}
