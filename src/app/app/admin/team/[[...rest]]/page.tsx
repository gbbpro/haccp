import { OrganizationProfile } from "@clerk/nextjs";
import { requireAdmin } from "@/lib/auth";
import { PageTitle } from "@/components/ui";

export default async function TeamPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle sub="Invite staff by email. Admins have full access; members (staff) record logs and corrective actions.">
        Team
      </PageTitle>
      <OrganizationProfile routing="path" path="/app/admin/team" />
    </>
  );
}
