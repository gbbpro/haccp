CREATE TYPE "public"."hazard_type" AS ENUM('biological', 'chemical', 'physical', 'allergen');--> statement-breakpoint
CREATE TYPE "public"."limit_type" AS ENUM('min', 'max', 'range', 'boolean');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('draft', 'active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."product_disposition" AS ENUM('discarded', 'reheated', 'recooled', 'held', 'released', 'returned_to_supplier', 'other');--> statement-breakpoint
CREATE TYPE "public"."risk_level" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."task_frequency" AS ENUM('per_batch', 'hourly', 'every_2_hours', 'every_4_hours', 'per_shift', 'daily', 'weekly');--> statement-breakpoint
CREATE TABLE "ccps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"step_id" uuid NOT NULL,
	"hazard_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"limit_type" "limit_type" NOT NULL,
	"min_value" numeric(8, 2),
	"max_value" numeric(8, 2),
	"unit" text,
	"critical_limit" text NOT NULL,
	"monitoring_procedure" text NOT NULL,
	"corrective_action_procedure" text NOT NULL,
	"verification_procedure" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "corrective_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"log_entry_id" uuid NOT NULL,
	"action_taken" text NOT NULL,
	"disposition" "product_disposition" NOT NULL,
	"preventive_measure" text,
	"taken_by" text NOT NULL,
	"taken_by_name" text NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "haccp_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"location_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "plan_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"approved_by" text,
	"approved_by_name" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hazards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"step_id" uuid NOT NULL,
	"type" "hazard_type" NOT NULL,
	"description" text NOT NULL,
	"severity" "risk_level" NOT NULL,
	"likelihood" "risk_level" NOT NULL,
	"is_significant" boolean NOT NULL,
	"justification" text,
	"control_measure" text
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"timezone" text DEFAULT 'America/Denver' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"location_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"value" numeric(8, 2),
	"passed" boolean,
	"within_limits" boolean NOT NULL,
	"notes" text,
	"recorded_by" text NOT NULL,
	"recorded_by_name" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"supersedes_id" uuid,
	"correction_reason" text
);
--> statement-breakpoint
CREATE TABLE "monitoring_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"location_id" uuid NOT NULL,
	"ccp_id" uuid,
	"name" text NOT NULL,
	"instructions" text,
	"frequency" "task_frequency" NOT NULL,
	"limit_type" "limit_type" NOT NULL,
	"min_value" numeric(8, 2),
	"max_value" numeric(8, 2),
	"unit" text,
	"corrective_action_hint" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stripe_customer_id" text,
	"subscription_status" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "process_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"org_id" text NOT NULL,
	"location_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"notes" text,
	"verified_by" text NOT NULL,
	"verified_by_name" text NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ccps" ADD CONSTRAINT "ccps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ccps" ADD CONSTRAINT "ccps_plan_id_haccp_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."haccp_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ccps" ADD CONSTRAINT "ccps_step_id_process_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."process_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ccps" ADD CONSTRAINT "ccps_hazard_id_hazards_id_fk" FOREIGN KEY ("hazard_id") REFERENCES "public"."hazards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "corrective_actions" ADD CONSTRAINT "corrective_actions_log_entry_id_log_entries_id_fk" FOREIGN KEY ("log_entry_id") REFERENCES "public"."log_entries"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_plans" ADD CONSTRAINT "haccp_plans_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "haccp_plans" ADD CONSTRAINT "haccp_plans_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hazards" ADD CONSTRAINT "hazards_step_id_process_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."process_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_task_id_monitoring_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."monitoring_tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "log_entries" ADD CONSTRAINT "log_entries_supersedes_id_log_entries_id_fk" FOREIGN KEY ("supersedes_id") REFERENCES "public"."log_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_tasks" ADD CONSTRAINT "monitoring_tasks_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_tasks" ADD CONSTRAINT "monitoring_tasks_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "monitoring_tasks" ADD CONSTRAINT "monitoring_tasks_ccp_id_ccps_id_fk" FOREIGN KEY ("ccp_id") REFERENCES "public"."ccps"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_steps" ADD CONSTRAINT "process_steps_plan_id_haccp_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."haccp_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ccps_plan_idx" ON "ccps" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "ca_org_idx" ON "corrective_actions" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "ca_log_idx" ON "corrective_actions" USING btree ("log_entry_id");--> statement-breakpoint
CREATE INDEX "plans_org_idx" ON "haccp_plans" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "hazards_step_idx" ON "hazards" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "locations_org_idx" ON "locations" USING btree ("org_id");--> statement-breakpoint
CREATE INDEX "logs_org_task_time_idx" ON "log_entries" USING btree ("org_id","task_id","recorded_at");--> statement-breakpoint
CREATE INDEX "logs_org_time_idx" ON "log_entries" USING btree ("org_id","recorded_at");--> statement-breakpoint
CREATE INDEX "tasks_org_loc_idx" ON "monitoring_tasks" USING btree ("org_id","location_id");--> statement-breakpoint
CREATE INDEX "steps_plan_idx" ON "process_steps" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "verif_org_idx" ON "verifications" USING btree ("org_id");