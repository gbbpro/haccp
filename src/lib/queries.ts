import "server-only";
import { and, asc, desc, eq, notExists, gte } from "drizzle-orm";
import { getDb } from "@/db";
import {
  locations,
  monitoringTasks,
  logEntries,
  correctiveActions,
  haccpPlans,
  processSteps,
} from "@/db/schema";

/** The org's store. Multi-location is a later feature; for now, the first one. */
export async function getPrimaryLocation(orgId: string) {
  const [loc] = await getDb()
    .select()
    .from(locations)
    .where(eq(locations.orgId, orgId))
    .orderBy(asc(locations.createdAt))
    .limit(1);
  return loc ?? null;
}

export async function getTasksWithLastEntry(orgId: string, locationId: string) {
  const db = getDb();
  const [tasks, last] = await Promise.all([
    db
      .select()
      .from(monitoringTasks)
      .where(
        and(
          eq(monitoringTasks.orgId, orgId),
          eq(monitoringTasks.locationId, locationId),
          eq(monitoringTasks.isActive, true),
        ),
      )
      .orderBy(asc(monitoringTasks.sortOrder)),
    db
      .selectDistinctOn([logEntries.taskId])
      .from(logEntries)
      .where(and(eq(logEntries.orgId, orgId), eq(logEntries.locationId, locationId)))
      .orderBy(logEntries.taskId, desc(logEntries.recordedAt)),
  ]);
  const byTask = new Map(last.map((e) => [e.taskId, e]));
  return tasks.map((t) => ({ task: t, last: byTask.get(t.id) ?? null }));
}

export async function getTask(orgId: string, taskId: string) {
  const [task] = await getDb()
    .select()
    .from(monitoringTasks)
    .where(and(eq(monitoringTasks.orgId, orgId), eq(monitoringTasks.id, taskId)))
    .limit(1);
  return task ?? null;
}

export async function getRecentEntries(orgId: string, taskId: string, limit = 10) {
  return getDb()
    .select()
    .from(logEntries)
    .where(and(eq(logEntries.orgId, orgId), eq(logEntries.taskId, taskId)))
    .orderBy(desc(logEntries.recordedAt))
    .limit(limit);
}

/** Out-of-limit readings that don't have a corrective action yet. */
export async function getOpenDeviations(orgId: string) {
  const db = getDb();
  return db
    .select({ entry: logEntries, task: monitoringTasks })
    .from(logEntries)
    .innerJoin(monitoringTasks, eq(monitoringTasks.id, logEntries.taskId))
    .where(
      and(
        eq(logEntries.orgId, orgId),
        eq(logEntries.withinLimits, false),
        notExists(
          db
            .select({ id: correctiveActions.id })
            .from(correctiveActions)
            .where(eq(correctiveActions.logEntryId, logEntries.id)),
        ),
      ),
    )
    .orderBy(desc(logEntries.recordedAt));
}

export async function getDeviation(orgId: string, entryId: string) {
  const db = getDb();
  const [row] = await db
    .select({ entry: logEntries, task: monitoringTasks })
    .from(logEntries)
    .innerJoin(monitoringTasks, eq(monitoringTasks.id, logEntries.taskId))
    .where(and(eq(logEntries.orgId, orgId), eq(logEntries.id, entryId)))
    .limit(1);
  if (!row) return null;
  const actions = await db
    .select()
    .from(correctiveActions)
    .where(and(eq(correctiveActions.orgId, orgId), eq(correctiveActions.logEntryId, entryId)));
  return { ...row, actions };
}

export async function getAdminStats(orgId: string) {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 3_600_000);
  const recent = await db
    .select({ withinLimits: logEntries.withinLimits })
    .from(logEntries)
    .where(and(eq(logEntries.orgId, orgId), gte(logEntries.recordedAt, since)));
  return {
    entries24h: recent.length,
    deviations24h: recent.filter((r) => !r.withinLimits).length,
  };
}

export async function getPlanWithCcps(orgId: string) {
  const db = getDb();
  const [plan] = await db
    .select()
    .from(haccpPlans)
    .where(eq(haccpPlans.orgId, orgId))
    .orderBy(desc(haccpPlans.createdAt))
    .limit(1);
  if (!plan) return null;
  const steps = await db.query.processSteps.findMany({
    where: and(eq(processSteps.orgId, orgId), eq(processSteps.planId, plan.id)),
    orderBy: asc(processSteps.sortOrder),
    with: { hazards: true, ccps: true },
  });
  const ccpCount = steps.reduce((n, s) => n + s.ccps.length, 0);
  return { plan, steps, ccpCount };
}
