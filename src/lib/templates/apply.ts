import { randomUUID } from "node:crypto";
import type { getDb } from "@/db";
import {
  haccpPlans,
  processSteps,
  hazards,
  ccps,
  monitoringTasks,
} from "@/db/schema";
import type { PlanTemplate } from "./small-restaurant";

type DB = ReturnType<typeof getDb>;

/**
 * Creates a draft HACCP plan plus its monitoring tasks from a template.
 * IDs are generated up front so everything is inserted in one atomic batch.
 */
export async function applyTemplate(
  db: DB,
  { orgId, locationId, template }: { orgId: string; locationId: string; template: PlanTemplate },
) {
  const planId = randomUUID();
  const stepRows: (typeof processSteps.$inferInsert)[] = [];
  const hazardRows: (typeof hazards.$inferInsert)[] = [];
  const ccpRows: (typeof ccps.$inferInsert)[] = [];
  const taskRows: (typeof monitoringTasks.$inferInsert)[] = [];
  let taskOrder = 0;

  template.steps.forEach((step, i) => {
    const stepId = randomUUID();
    stepRows.push({ id: stepId, orgId, planId, name: step.name, description: step.description, sortOrder: i });

    const hazardIds = step.hazards.map((h) => {
      const id = randomUUID();
      hazardRows.push({ id, orgId, stepId, ...h });
      return id;
    });

    for (const t of step.tasks ?? []) {
      taskRows.push({ orgId, locationId, ccpId: null, sortOrder: taskOrder++, ...t });
    }

    if (step.ccp) {
      const { tasks, hazardIndex, ...ccp } = step.ccp;
      const ccpId = randomUUID();
      ccpRows.push({ id: ccpId, orgId, planId, stepId, hazardId: hazardIds[hazardIndex], ...ccp });
      for (const t of tasks) {
        taskRows.push({ orgId, locationId, ccpId, sortOrder: taskOrder++, ...t });
      }
    }
  });

  await db.batch([
    db.insert(haccpPlans).values({
      id: planId,
      orgId,
      locationId,
      name: template.name,
      description: template.description,
      status: "draft",
    }),
    db.insert(processSteps).values(stepRows),
    db.insert(hazards).values(hazardRows),
    db.insert(ccps).values(ccpRows),
    db.insert(monitoringTasks).values(taskRows),
  ]);

  return { planId, taskCount: taskRows.length };
}
