/**
 * Seeds a sample store with the starter HACCP plan and a day of example logs.
 *
 *   npm run db:seed -- --org org_XXXXXXXX --name "Main Street Café"
 *
 * Use the Clerk organization id of the org you created in the app (Clerk
 * dashboard → Organizations). Re-running for the same org is a no-op.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { organizations, locations, monitoringTasks, logEntries, haccpPlans } from "@/db/schema";
import { applyTemplate } from "@/lib/templates/apply";
import { smallRestaurantTemplate } from "@/lib/templates/small-restaurant";
import { isWithinLimits } from "@/lib/limits";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const orgId = arg("org");
  const name = arg("name") ?? "Main Street Café";
  if (!orgId) throw new Error('Usage: npm run db:seed -- --org org_XXXX [--name "Store name"]');

  const db = getDb();

  const existing = await db.select().from(haccpPlans).where(eq(haccpPlans.orgId, orgId)).limit(1);
  if (existing.length) {
    console.log(`Org ${orgId} already has a plan — nothing to do.`);
    return;
  }

  await db.insert(organizations).values({ id: orgId, name }).onConflictDoNothing();
  const [location] = await db
    .insert(locations)
    .values({ orgId, name, address: "123 Main St", timezone: "America/Denver" })
    .returning();

  const { planId, taskCount } = await applyTemplate(db, {
    orgId,
    locationId: location.id,
    template: smallRestaurantTemplate,
  });

  // A day of example readings so dashboards aren't empty.
  const tasks = await db.select().from(monitoringTasks).where(eq(monitoringTasks.locationId, location.id));
  const now = Date.now();
  const sample = (t: (typeof tasks)[number]) => {
    if (t.limitType === "boolean") return { passed: true };
    if (t.limitType === "min") return { value: (t.minValue ?? 0) + 4 };
    if (t.limitType === "max") return { value: (t.maxValue ?? 0) - 3 };
    return { value: ((t.minValue ?? 0) + (t.maxValue ?? 0)) / 2 };
  };
  const rows = tasks.flatMap((t, i) =>
    [8, 4].map((hoursAgo) => {
      const reading = sample(t);
      return {
        orgId,
        locationId: location.id,
        taskId: t.id,
        ...reading,
        withinLimits: isWithinLimits(t, reading),
        recordedBy: "seed",
        recordedByName: "Sample Data",
        recordedAt: new Date(now - hoursAgo * 3_600_000 - i * 60_000),
      };
    }),
  );
  await db.insert(logEntries).values(rows);

  console.log(`Seeded "${name}" (${orgId}): plan ${planId}, ${taskCount} tasks, ${rows.length} log entries.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
