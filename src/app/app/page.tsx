import Link from "next/link";
import { requireSession, ensureOrganization } from "@/lib/auth";
import { getPrimaryLocation, getTasksWithLastEntry, getOpenDeviations } from "@/lib/queries";
import { describeLimit } from "@/lib/limits";
import { dueStatus, FREQUENCY_LABEL } from "@/lib/schedule";
import { Badge, Card, PageTitle, buttonClass, inputClass, formatReading, formatTime } from "@/components/ui";
import { setUpStore } from "./actions";

export default async function Today({ searchParams }: PageProps<"/app">) {
  const { orgId, role } = await requireSession();
  const org = await ensureOrganization(orgId);
  const location = await getPrimaryLocation(orgId);
  const params = await searchParams;

  if (!location) {
    return role === "admin" ? (
      <div className="mx-auto max-w-lg">
        <PageTitle sub="We'll create your store and load a starter HACCP plan you can review and adapt.">
          Set up your store
        </PageTitle>
        <Card>
          <form action={setUpStore} className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Store name</span>
              <input name="name" defaultValue={org.name} className={inputClass} required />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">Time zone</span>
              <select name="timezone" defaultValue="America/Denver" className={inputClass}>
                <option value="America/New_York">Eastern</option>
                <option value="America/Chicago">Central</option>
                <option value="America/Denver">Mountain</option>
                <option value="America/Phoenix">Arizona</option>
                <option value="America/Los_Angeles">Pacific</option>
                <option value="America/Anchorage">Alaska</option>
                <option value="Pacific/Honolulu">Hawaii</option>
              </select>
            </label>
            <button className={buttonClass}>Create store with starter plan</button>
          </form>
        </Card>
      </div>
    ) : (
      <PageTitle sub="Your admin hasn't set up the store yet. Check back soon.">Nothing to log yet</PageTitle>
    );
  }

  const [rows, deviations] = await Promise.all([
    getTasksWithLastEntry(orgId, location.id),
    getOpenDeviations(orgId),
  ]);
  const now = new Date();
  const withStatus = rows.map((r) => ({ ...r, status: dueStatus(r.task.frequency, r.last?.recordedAt ?? null, now) }));
  const dueCount = withStatus.filter((r) => r.status === "due").length;

  return (
    <>
      <PageTitle sub={`${location.name} · ${dueCount} check${dueCount === 1 ? "" : "s"} due`}>Today</PageTitle>

      {params.saved && <Notice tone="ok">Reading saved.</Notice>}
      {params.corrected && <Notice tone="ok">Corrective action recorded.</Notice>}

      {deviations.length > 0 && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <h2 className="font-semibold text-red-900">Needs corrective action</h2>
          <ul className="mt-2 divide-y divide-red-100">
            {deviations.map(({ entry, task }) => (
              <li key={entry.id} className="flex items-center justify-between gap-4 py-2">
                <div>
                  <p className="font-medium">{task.name}</p>
                  <p className="text-sm text-red-800">
                    {formatReading(entry, task.unit)} (limit {describeLimit(task)}) ·{" "}
                    {formatTime(entry.recordedAt, location.timezone)} · {entry.recordedByName}
                  </p>
                </div>
                <Link href={`/app/deviations/${entry.id}`} className={buttonClass + " bg-red-700 hover:bg-red-800"}>
                  Resolve
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {withStatus.map(({ task, last, status }) => (
          <Link key={task.id} href={`/app/log/${task.id}`} className="group">
            <Card className="h-full transition group-hover:border-brand">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold">{task.name}</h3>
                {status === "due" ? (
                  <Badge tone="due">Due</Badge>
                ) : status === "ok" ? (
                  <Badge tone="ok">Done</Badge>
                ) : (
                  <Badge tone="neutral">As needed</Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-neutral-600">
                {FREQUENCY_LABEL[task.frequency]} · Limit {describeLimit(task)}
                {task.ccpId && " · CCP"}
              </p>
              <p className="mt-3 text-sm">
                {last ? (
                  <>
                    Last: <span className={last.withinLimits ? "" : "font-semibold text-red-700"}>
                      {formatReading(last, task.unit)}
                    </span>{" "}
                    <span className="text-neutral-500">
                      {formatTime(last.recordedAt, location.timezone)} · {last.recordedByName}
                    </span>
                  </>
                ) : (
                  <span className="text-neutral-500">No readings yet</span>
                )}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}

function Notice({ tone, children }: { tone: "ok"; children: React.ReactNode }) {
  return (
    <div className={`mb-4 rounded-lg px-4 py-2 text-sm font-medium ${tone === "ok" ? "bg-emerald-50 text-emerald-800" : ""}`}>
      {children}
    </div>
  );
}
