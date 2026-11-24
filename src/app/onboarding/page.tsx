import { Suspense } from "react";
import { OrganizationList } from "@clerk/nextjs";

export default function Onboarding() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold">Choose your business</h1>
        <p className="mt-2 text-neutral-600">
          Create your business to get started, or pick one you&apos;ve been invited to.
        </p>
      </div>
      <Suspense>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/app"
          afterSelectOrganizationUrl="/app"
        />
      </Suspense>
    </main>
  );
}
