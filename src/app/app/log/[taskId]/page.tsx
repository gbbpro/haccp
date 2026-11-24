import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getTask, getRecentEntries, getPrimaryLocation } from "@/lib/queries";
import { describeLimit } from "@/lib/limits";
import { FREQUENCY_LABEL } from "@/lib/schedule";
import { Badge, Card, PageTitle, formatReading, formatTime } from "@/components/ui";
import { ReadingForm } from "@/components/reading-form";

export default async function LogTask({ params }: PageProps<"/app/log/[taskId]">) {
  const { taskId } = await params;
  const { orgId } = await requireSession();
  const task = await getTask(orgId, taskId);
  if (!task) notFound();
  const [entries, location] = await Promise.all([getRecentEntries(orgId, task.id), getPrimaryLocation(orgId)]);
  const tz = location?.timezone;

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle sub={`${FREQUENCY_LABEL[task.frequency]} · Critical limit ${describeLimit(task)}`}>
        {task.name}
      </PageTitle>
      {task.instructions && <p className="mb-4 text-neutral-700">{task.instructions}</p>}
      <Card>
        <ReadingForm taskId={task.id} limitType={task.limitType} unit={task.unit} />
      </Card>

      <h2 className="mb-2 mt-8 font-semibold">Recent readings</h2>
      {entries.length === 0 ? (
        <p className="text-sm text-neutral-500">No readings yet.</p>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-neutral-100">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between px-4 py-2 text-sm">
                <span>
                  <span className="font-semibold">{formatReading(e, task.unit)}</span>{" "}
                  <span className="text-neutral-500">
                    {formatTime(e.recordedAt, tz)} · {e.recordedByName}
                  </span>
                </span>
                {e.withinLimits ? <Badge tone="ok">OK</Badge> : <Badge tone="fail">Out of limit</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
