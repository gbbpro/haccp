import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-neutral-200 bg-white p-4 ${className}`}>{children}</div>;
}

const BADGE = {
  ok: "bg-emerald-100 text-emerald-800",
  due: "bg-amber-100 text-amber-800",
  fail: "bg-red-100 text-red-800",
  neutral: "bg-neutral-100 text-neutral-700",
} as const;

export function Badge({ tone, children }: { tone: keyof typeof BADGE; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE[tone]}`}>
      {children}
    </span>
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold tracking-tight">{children}</h1>
      {sub && <p className="mt-1 text-neutral-600">{sub}</p>}
    </div>
  );
}

export const buttonClass =
  "inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-50";

export const inputClass =
  "w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

export function formatTime(d: Date, timeZone?: string) {
  return d.toLocaleString("en-US", {
    timeZone,
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatReading(
  e: { value: number | null; passed: boolean | null },
  unit: string | null,
) {
  if (e.passed !== null) return e.passed ? "Pass" : "Fail";
  return e.value !== null ? `${e.value}${unit ?? ""}` : "—";
}
