import "server-only";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getDb } from "@/db";
import { organizations } from "@/db/schema";

/**
 * Roles map onto Clerk's default organization roles:
 *   org:admin  → Admin (full access: plan, team, reports, billing)
 *   org:member → Staff (record monitoring logs and corrective actions)
 */
export type Role = "admin" | "staff";

export type Session = {
  userId: string;
  userName: string;
  orgId: string;
  role: Role;
};

/** Require a signed-in user with an active organization. */
export async function requireSession(): Promise<Session> {
  const { userId, orgId, orgRole } = await auth();
  if (!userId) redirect("/sign-in");
  if (!orgId) redirect("/onboarding");

  const user = await currentUser();
  const userName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    userId;

  return { userId, userName, orgId, role: orgRole === "org:admin" ? "admin" : "staff" };
}

/** Require an Admin. Staff are sent back to their task list. */
export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.role !== "admin") redirect("/app");
  return session;
}

/**
 * Make sure the Clerk organization has a row in our database. Called on
 * first visit; a Clerk webhook can replace this later.
 */
export async function ensureOrganization(orgId: string) {
  const db = getDb();
  const existing = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.id, orgId),
  });
  if (existing) return existing;

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({ organizationId: orgId });
  const [row] = await db
    .insert(organizations)
    .values({ id: orgId, name: org.name })
    .onConflictDoUpdate({ target: organizations.id, set: { name: org.name } })
    .returning();
  return row;
}
