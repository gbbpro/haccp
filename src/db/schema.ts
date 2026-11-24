import {
  pgTable,
  pgEnum,
  text,
  uuid,
  integer,
  boolean,
  numeric,
  timestamp,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * Multi-tenancy: every business is a Clerk Organization. Its Clerk org id
 * (e.g. "org_2abc...") is the primary key of `organizations`, and every
 * tenant-owned row carries `org_id`. All queries MUST filter by org_id.
 */

// ---------- enums ----------

export const planStatus = pgEnum("plan_status", ["draft", "active", "archived"]);

export const hazardType = pgEnum("hazard_type", [
  "biological",
  "chemical",
  "physical",
  "allergen",
]);

export const riskLevel = pgEnum("risk_level", ["low", "medium", "high"]);

/** How a reading is compared to its critical limit. */
export const limitType = pgEnum("limit_type", [
  "min", // value must be >= min (e.g. cook to 165°F)
  "max", // value must be <= max (e.g. cold hold at 41°F or below)
  "range", // min <= value <= max
  "boolean", // pass / fail check (e.g. sanitizer test strip OK)
]);

export const taskFrequency = pgEnum("task_frequency", [
  "per_batch",
  "hourly",
  "every_2_hours",
  "every_4_hours",
  "per_shift",
  "daily",
  "weekly",
]);

export const productDisposition = pgEnum("product_disposition", [
  "discarded",
  "reheated",
  "recooled",
  "held",
  "released",
  "returned_to_supplier",
  "other",
]);

// ---------- tenants ----------

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(), // Clerk organization id
  name: text("name").notNull(),
  // Billing (Stripe) — filled in later
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const locations = pgTable(
  "locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    timezone: text("timezone").notNull().default("America/Denver"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("locations_org_idx").on(t.orgId)],
);

// ---------- the HACCP plan ----------

export const haccpPlans = pgTable(
  "haccp_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    status: planStatus("status").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    approvedBy: text("approved_by"), // Clerk user id
    approvedByName: text("approved_by_name"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("plans_org_idx").on(t.orgId)],
);

export const processSteps = pgTable(
  "process_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => haccpPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [index("steps_plan_idx").on(t.planId)],
);

export const hazards = pgTable(
  "hazards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stepId: uuid("step_id")
      .notNull()
      .references(() => processSteps.id, { onDelete: "cascade" }),
    type: hazardType("type").notNull(),
    description: text("description").notNull(),
    severity: riskLevel("severity").notNull(),
    likelihood: riskLevel("likelihood").notNull(),
    isSignificant: boolean("is_significant").notNull(),
    justification: text("justification"),
    controlMeasure: text("control_measure"),
  },
  (t) => [index("hazards_step_idx").on(t.stepId)],
);

export const ccps = pgTable(
  "ccps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    planId: uuid("plan_id")
      .notNull()
      .references(() => haccpPlans.id, { onDelete: "cascade" }),
    stepId: uuid("step_id")
      .notNull()
      .references(() => processSteps.id, { onDelete: "cascade" }),
    hazardId: uuid("hazard_id").references(() => hazards.id, { onDelete: "set null" }),
    code: text("code").notNull(), // e.g. "CCP-1"
    name: text("name").notNull(),
    limitType: limitType("limit_type").notNull(),
    minValue: numeric("min_value", { precision: 8, scale: 2, mode: "number" }),
    maxValue: numeric("max_value", { precision: 8, scale: 2, mode: "number" }),
    unit: text("unit"), // "°F", "minutes", "ppm"
    criticalLimit: text("critical_limit").notNull(), // human-readable statement
    monitoringProcedure: text("monitoring_procedure").notNull(),
    correctiveActionProcedure: text("corrective_action_procedure").notNull(),
    verificationProcedure: text("verification_procedure").notNull(),
  },
  (t) => [index("ccps_plan_idx").on(t.planId)],
);

// ---------- daily operations ----------

/**
 * A recurring check staff perform. Usually tied to a CCP, but can also be a
 * prerequisite-program check (cooler temps, sanitizer strength) with ccpId null.
 * Limits are copied from the CCP so a task is self-contained.
 */
export const monitoringTasks = pgTable(
  "monitoring_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    ccpId: uuid("ccp_id").references(() => ccps.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    instructions: text("instructions"),
    frequency: taskFrequency("frequency").notNull(),
    limitType: limitType("limit_type").notNull(),
    minValue: numeric("min_value", { precision: 8, scale: 2, mode: "number" }),
    maxValue: numeric("max_value", { precision: 8, scale: 2, mode: "number" }),
    unit: text("unit"),
    correctiveActionHint: text("corrective_action_hint"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("tasks_org_loc_idx").on(t.orgId, t.locationId)],
);

/**
 * Monitoring records. APPEND-ONLY: a database trigger blocks UPDATE and
 * DELETE (see drizzle/0001_append_only_records.sql). A correction is a new
 * row that points at the row it replaces via `supersedes_id`.
 * Names are denormalized so records stay readable if a user is removed.
 */
export const logEntries = pgTable(
  "log_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    taskId: uuid("task_id")
      .notNull()
      .references(() => monitoringTasks.id, { onDelete: "restrict" }),
    value: numeric("value", { precision: 8, scale: 2, mode: "number" }),
    passed: boolean("passed"), // for boolean checks
    withinLimits: boolean("within_limits").notNull(),
    notes: text("notes"),
    recordedBy: text("recorded_by").notNull(), // Clerk user id
    recordedByName: text("recorded_by_name").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    supersedesId: uuid("supersedes_id").references((): AnyPgColumn => logEntries.id),
    correctionReason: text("correction_reason"),
  },
  (t) => [
    index("logs_org_task_time_idx").on(t.orgId, t.taskId, t.recordedAt),
    index("logs_org_time_idx").on(t.orgId, t.recordedAt),
  ],
);

/** Required whenever a log entry is outside its critical limit. Append-only. */
export const correctiveActions = pgTable(
  "corrective_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    logEntryId: uuid("log_entry_id")
      .notNull()
      .references(() => logEntries.id, { onDelete: "restrict" }),
    actionTaken: text("action_taken").notNull(),
    disposition: productDisposition("disposition").notNull(),
    preventiveMeasure: text("preventive_measure"),
    takenBy: text("taken_by").notNull(),
    takenByName: text("taken_by_name").notNull(),
    takenAt: timestamp("taken_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ca_org_idx").on(t.orgId), index("ca_log_idx").on(t.logEntryId)],
);

/** Manager/admin review & sign-off of records for a period. Append-only. */
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: text("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => locations.id, { onDelete: "cascade" }),
    periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
    periodEnd: timestamp("period_end", { withTimezone: true }).notNull(),
    notes: text("notes"),
    verifiedBy: text("verified_by").notNull(),
    verifiedByName: text("verified_by_name").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("verif_org_idx").on(t.orgId)],
);

// ---------- relations (for db.query) ----------

export const organizationsRelations = relations(organizations, ({ many }) => ({
  locations: many(locations),
  plans: many(haccpPlans),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  organization: one(organizations, { fields: [locations.orgId], references: [organizations.id] }),
  plans: many(haccpPlans),
  tasks: many(monitoringTasks),
}));

export const haccpPlansRelations = relations(haccpPlans, ({ one, many }) => ({
  location: one(locations, { fields: [haccpPlans.locationId], references: [locations.id] }),
  steps: many(processSteps),
  ccps: many(ccps),
}));

export const processStepsRelations = relations(processSteps, ({ one, many }) => ({
  plan: one(haccpPlans, { fields: [processSteps.planId], references: [haccpPlans.id] }),
  hazards: many(hazards),
  ccps: many(ccps),
}));

export const hazardsRelations = relations(hazards, ({ one }) => ({
  step: one(processSteps, { fields: [hazards.stepId], references: [processSteps.id] }),
}));

export const ccpsRelations = relations(ccps, ({ one, many }) => ({
  plan: one(haccpPlans, { fields: [ccps.planId], references: [haccpPlans.id] }),
  step: one(processSteps, { fields: [ccps.stepId], references: [processSteps.id] }),
  hazard: one(hazards, { fields: [ccps.hazardId], references: [hazards.id] }),
  tasks: many(monitoringTasks),
}));

export const monitoringTasksRelations = relations(monitoringTasks, ({ one, many }) => ({
  location: one(locations, { fields: [monitoringTasks.locationId], references: [locations.id] }),
  ccp: one(ccps, { fields: [monitoringTasks.ccpId], references: [ccps.id] }),
  entries: many(logEntries),
}));

export const logEntriesRelations = relations(logEntries, ({ one, many }) => ({
  task: one(monitoringTasks, { fields: [logEntries.taskId], references: [monitoringTasks.id] }),
  correctiveActions: many(correctiveActions),
}));

export const correctiveActionsRelations = relations(correctiveActions, ({ one }) => ({
  logEntry: one(logEntries, {
    fields: [correctiveActions.logEntryId],
    references: [logEntries.id],
  }),
}));

export type MonitoringTask = typeof monitoringTasks.$inferSelect;
export type LogEntry = typeof logEntries.$inferSelect;
