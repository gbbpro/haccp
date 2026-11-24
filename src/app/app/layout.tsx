import Link from "next/link";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import { requireSession } from "@/lib/auth";

// Every /app route is per-user and session-gated, so let it render on the
// server per request rather than prerendering a static shell.
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { role } = await requireSession();
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3">
          <Link href="/app" className="text-lg font-bold text-brand">
            HACCP
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-neutral-700">
            <Link href="/app" className="hover:text-brand">
              Today
            </Link>
            {role === "admin" && (
              <>
                <Link href="/app/admin" className="hover:text-brand">
                  Overview
                </Link>
                <Link href="/app/admin/plan" className="hover:text-brand">
                  Plan
                </Link>
                <Link href="/app/admin/team" className="hover:text-brand">
                  Team
                </Link>
              </>
            )}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <OrganizationSwitcher
              hidePersonal
              afterSelectOrganizationUrl="/app"
              afterCreateOrganizationUrl="/app"
            />
            <UserButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
