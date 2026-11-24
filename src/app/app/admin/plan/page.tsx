import { requireAdmin } from "@/lib/auth";
import { getPlanWithCcps } from "@/lib/queries";
import { Badge, Card, PageTitle } from "@/components/ui";

export default async function PlanPage() {
  const { orgId } = await requireAdmin();
  const data = await getPlanWithCcps(orgId);
  if (!data) return <PageTitle sub="Set up your store to load a starter plan.">HACCP plan</PageTitle>;
  const { plan, steps } = data;

  return (
    <>
      <PageTitle sub={plan.description}>
        {plan.name} <Badge tone={plan.status === "active" ? "ok" : "due"}>{plan.status}</Badge>
      </PageTitle>

      <ol className="space-y-4">
        {steps.map((step, i) => (
          <li key={step.id}>
            <Card>
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-lg font-semibold">
                  {i + 1}. {step.name}
                </h2>
                {step.ccps.map((c) => (
                  <Badge key={c.id} tone="fail">
                    {c.code}
                  </Badge>
                ))}
              </div>
              {step.description && <p className="text-sm text-neutral-600">{step.description}</p>}

              <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">Hazards</h3>
              <ul className="mt-1 space-y-1 text-sm">
                {step.hazards.map((h) => (
                  <li key={h.id}>
                    <span className="font-medium capitalize">{h.type}:</span> {h.description}{" "}
                    {h.isSignificant ? <Badge tone="fail">significant</Badge> : <Badge tone="neutral">controlled by PRP</Badge>}
                  </li>
                ))}
              </ul>

              {step.ccps.map((c) => (
                <dl key={c.id} className="mt-3 grid gap-x-4 gap-y-1 rounded-lg bg-neutral-50 p-3 text-sm sm:grid-cols-[10rem_1fr]">
                  <dt className="font-medium">Critical limit</dt>
                  <dd>{c.criticalLimit}</dd>
                  <dt className="font-medium">Monitoring</dt>
                  <dd>{c.monitoringProcedure}</dd>
                  <dt className="font-medium">Corrective action</dt>
                  <dd>{c.correctiveActionProcedure}</dd>
                  <dt className="font-medium">Verification</dt>
                  <dd>{c.verificationProcedure}</dd>
                </dl>
              ))}
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
