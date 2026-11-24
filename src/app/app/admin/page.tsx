import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import {
  getAdminStats,
  getOpenDeviations,
  getPlanWithCcps,
  getPrimaryLocation,
  getTasksWithLastEntry,
} from "@/lib/queries";
import { dueStatus } from "@/lib/schedule";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function AdminOverview() {
  const { orgId } = await requireAdmin();
  const location = await getPrimaryLocation(orgId);
  if (!location) {
    return (
      <PageTitle sub={<Link href="/app" className="text-brand underline">Set up your store first.</Link>}>
        Overview
      </PageTitle>
    );
  }

  const [stats, deviations, plan, tasks] = await Promise.all([
    getAdminStats(orgId),
    getOpenDeviations(orgId),
    getPlanWithCcps(orgId),
    getTasksWithLastEntry(orgId, location.id),
  ]);
  const overdue = tasks.filter((t) => dueStatus(t.task.frequency, t.last?.recordedAt ?? null) === "due");

  return (
    <>
      <PageTitle sub={location.name}>Overview</PageTitle>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Readings (24h)" value={stats.entries24h} />
        <Stat label="Deviations (24h)" value={stats.deviations24h} tone={stats.deviations24h ? "fail" : "ok"} />
        <Stat label="Open corrective actions" value={deviations.length} tone={deviations.length ? "fail" : "ok"} />
        <Stat label="Checks due now" value={overdue.length} tone={overdue.length ? "due" : "ok"} />
      </div>

      {plan && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{plan.plan.name}</h2>
              <p className="text-sm text-neutral-600">
                {plan.steps.length} process steps · {plan.ccpCount} critical control points · v{plan.plan.version}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={plan.plan.status === "active" ? "ok" : "due"}>{plan.plan.status}</Badge>
              <Link href="/app/admin/plan" className="text-sm font-semibold text-brand">
                View plan →
              </Link>
            </div>
          </div>
          {plan.plan.status === "draft" && (
            <p className="mt-3 text-sm text-amber-800">
              This starter plan is a draft. Review it against your menu and local health code before approving.
            </p>
          )}
        </Card>
      )}

      {overdue.length > 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold">Checks due</h2>
          <ul className="mt-2 text-sm">
            {overdue.map(({ task }) => (
              <li key={task.id} className="py-1">
                <Link href={`/app/log/${task.id}`} className="hover:text-brand">
                  {task.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "due" | "fail" }) {
  const color = tone === "fail" ? "text-red-700" : tone === "due" ? "text-amber-700" : "text-foreground";
  return (
    <Card>
      <p className="text-sm text-neutral-600">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
    </Card>
  );
}
