import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getDeviation, getPrimaryLocation } from "@/lib/queries";
import { describeLimit } from "@/lib/limits";
import { Card, PageTitle, formatReading, formatTime } from "@/components/ui";
import { CorrectiveForm } from "@/components/corrective-form";

export default async function Deviation({ params }: PageProps<"/app/deviations/[entryId]">) {
  const { entryId } = await params;
  const { orgId } = await requireSession();
  const d = await getDeviation(orgId, entryId);
  if (!d || d.entry.withinLimits) notFound();
  const tz = (await getPrimaryLocation(orgId))?.timezone;

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle sub={`${d.task.name} · ${formatTime(d.entry.recordedAt, tz)} · ${d.entry.recordedByName}`}>
        Out of limit
      </PageTitle>
      <Card className="mb-4 border-red-200 bg-red-50">
        <p className="text-3xl font-bold text-red-800">{formatReading(d.entry, d.task.unit)}</p>
        <p className="text-sm text-red-900">Critical limit {describeLimit(d.task)}</p>
      </Card>

      {d.actions.length > 0 ? (
        <Card>
          <h2 className="font-semibold">Corrective action recorded</h2>
          {d.actions.map((a) => (
            <div key={a.id} className="mt-2 text-sm">
              <p>{a.actionTaken}</p>
              <p className="text-neutral-500">
                {a.disposition.replaceAll("_", " ")} · {a.takenByName} · {formatTime(a.takenAt, tz)}
              </p>
            </div>
          ))}
        </Card>
      ) : (
        <Card>
          <CorrectiveForm entryId={d.entry.id} hint={d.task.correctiveActionHint} />
        </Card>
      )}
    </div>
  );
}
