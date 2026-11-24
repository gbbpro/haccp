import Link from "next/link";
import { auth } from "@clerk/nextjs/server";

export const instant = false;

export default async function Home() {
  const { userId } = await auth();
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-sm font-semibold uppercase tracking-wider text-brand">Food safety, simplified</p>
      <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
        HACCP plans and daily logs for small food businesses
      </h1>
      <p className="mt-5 max-w-xl text-lg text-neutral-600">
        Temperature checks, corrective actions and inspector-ready records — on any phone or tablet in
        your kitchen.
      </p>
      <div className="mt-8 flex gap-3">
        {userId ? (
          <Link href="/app" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
            Open your dashboard
          </Link>
        ) : (
          <>
            <Link href="/sign-up" className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-dark">
              Get started
            </Link>
            <Link href="/sign-in" className="rounded-lg border border-neutral-300 px-5 py-3 font-semibold hover:bg-white">
              Sign in
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
