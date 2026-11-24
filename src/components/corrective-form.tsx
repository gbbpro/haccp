"use client";

import { useActionState } from "react";
import { recordCorrectiveAction } from "@/app/app/actions";
import { buttonClass, inputClass } from "./ui";

const DISPOSITIONS = [
  ["discarded", "Discarded"],
  ["reheated", "Reheated / re-cooked"],
  ["recooled", "Moved / re-chilled"],
  ["held", "Held for evaluation"],
  ["released", "Released (no product affected)"],
  ["returned_to_supplier", "Rejected / returned to supplier"],
  ["other", "Other"],
] as const;

export function CorrectiveForm({ entryId, hint }: { entryId: string; hint: string | null }) {
  const [state, action, pending] = useActionState(recordCorrectiveAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="entryId" value={entryId} />
      {hint && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          <span className="font-semibold">Plan says:</span> {hint}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">What did you do?</span>
        <textarea name="actionTaken" rows={3} required className={inputClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">What happened to the product?</span>
        <select name="disposition" required className={inputClass} defaultValue="">
          <option value="" disabled>
            Choose…
          </option>
          {DISPOSITIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">How will you prevent it next time? (optional)</span>
        <textarea name="preventiveMeasure" rows={2} className={inputClass} />
      </label>
      {state?.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}
      <button disabled={pending} className={buttonClass + " w-full py-3"}>
        {pending ? "Saving…" : "Record corrective action"}
      </button>
    </form>
  );
}
