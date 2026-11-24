"use client";

import { useActionState } from "react";
import { recordReading } from "@/app/app/actions";
import { buttonClass, inputClass } from "./ui";

export function ReadingForm({
  taskId,
  limitType,
  unit,
}: {
  taskId: string;
  limitType: "min" | "max" | "range" | "boolean";
  unit: string | null;
}) {
  const [state, action, pending] = useActionState(recordReading, undefined);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="taskId" value={taskId} />
      {limitType === "boolean" ? (
        <fieldset className="flex gap-3">
          <legend className="mb-2 text-sm font-medium">Result</legend>
          {[
            ["yes", "Pass"],
            ["no", "Fail"],
          ].map(([v, label]) => (
            <label key={v} className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-3 has-[:checked]:border-brand has-[:checked]:bg-teal-50">
              <input type="radio" name="passed" value={v} required className="accent-teal-700" />
              <span className="font-semibold">{label}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Reading{unit ? ` (${unit})` : ""}</span>
          <input
            name="value"
            type="number"
            inputMode="decimal"
            step="0.1"
            required
            autoFocus
            className={inputClass + " text-2xl font-semibold"}
          />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-sm font-medium">Notes (optional)</span>
        <textarea name="notes" rows={2} className={inputClass} />
      </label>
      {state?.error && <p className="text-sm font-medium text-red-700">{state.error}</p>}
      <button disabled={pending} className={buttonClass + " w-full py-3 text-lg"}>
        {pending ? "Saving…" : "Save reading"}
      </button>
    </form>
  );
}
