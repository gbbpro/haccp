"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { locations, logEntries, correctiveActions } from "@/db/schema";
import { requireAdmin, requireSession, ensureOrganization } from "@/lib/auth";
import { getPrimaryLocation, getTask, getDeviation } from "@/lib/queries";
import { isWithinLimits } from "@/lib/limits";
import { applyTemplate } from "@/lib/templates/apply";
import { smallRestaurantTemplate } from "@/lib/templates/small-restaurant";

/** Admin: create the store and load the starter plan. */
export async function setUpStore(formData: FormData) {
  const { orgId } = await requireAdmin();
  const org = await ensureOrganization(orgId);
  if (await getPrimaryLocation(orgId)) redirect("/app");

  const name = z.string().trim().min(1).max(120).catch(org.name).parse(formData.get("name"));
  const timezone = z.string().min(1).catch("America/Denver").parse(formData.get("timezone"));

  const db = getDb();
  const [location] = await db.insert(locations).values({ orgId, name, timezone }).returning();
  await applyTemplate(db, { orgId, locationId: location.id, template: smallRestaurantTemplate });
  redirect("/app");
}

const readingSchema = z.object({
  taskId: z.uuid(),
  value: z.coerce.number().finite().optional(),
  passed: z.enum(["yes", "no"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type ActionState = { error?: string } | undefined;

/** Staff or admin: record a monitoring reading. */
export async function recordReading(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const parsed = readingSchema.safeParse({
    taskId: formData.get("taskId"),
    value: formData.get("value") || undefined,
    passed: formData.get("passed") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Please enter a valid reading." };

  const task = await getTask(session.orgId, parsed.data.taskId);
  if (!task) return { error: "Task not found." };

  const reading =
    task.limitType === "boolean"
      ? { value: null, passed: parsed.data.passed === undefined ? null : parsed.data.passed === "yes" }
      : { value: parsed.data.value ?? null, passed: null };
  if (task.limitType === "boolean" ? reading.passed === null : reading.value === null)
    return { error: "Please enter a reading." };

  const withinLimits = isWithinLimits(task, reading);
  const [entry] = await getDb()
    .insert(logEntries)
    .values({
      orgId: session.orgId,
      locationId: task.locationId,
      taskId: task.id,
      ...reading,
      withinLimits,
      notes: parsed.data.notes,
      recordedBy: session.userId,
      recordedByName: session.userName,
    })
    .returning({ id: logEntries.id });

  revalidatePath("/app");
  // Out of limits → a corrective action is required before moving on.
  redirect(withinLimits ? "/app?saved=1" : `/app/deviations/${entry.id}`);
}

const correctiveSchema = z.object({
  entryId: z.uuid(),
  actionTaken: z.string().trim().min(3, "Describe what was done.").max(2000),
  disposition: z.enum([
    "discarded",
    "reheated",
    "recooled",
    "held",
    "released",
    "returned_to_supplier",
    "other",
  ]),
  preventiveMeasure: z.string().trim().max(2000).optional(),
});

export async function recordCorrectiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const parsed = correctiveSchema.safeParse({
    entryId: formData.get("entryId"),
    actionTaken: formData.get("actionTaken"),
    disposition: formData.get("disposition"),
    preventiveMeasure: formData.get("preventiveMeasure") || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input." };

  const deviation = await getDeviation(session.orgId, parsed.data.entryId);
  if (!deviation || deviation.entry.withinLimits) return { error: "Deviation not found." };

  await getDb().insert(correctiveActions).values({
    orgId: session.orgId,
    logEntryId: deviation.entry.id,
    actionTaken: parsed.data.actionTaken,
    disposition: parsed.data.disposition,
    preventiveMeasure: parsed.data.preventiveMeasure,
    takenBy: session.userId,
    takenByName: session.userName,
  });

  revalidatePath("/app");
  redirect("/app?corrected=1");
}
