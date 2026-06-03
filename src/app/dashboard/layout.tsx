import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { DashboardNav } from "./_components/nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const level = session.user.accessLevel ?? "viewer";

  return (
    <div className="flex min-h-screen flex-1 bg-neutral-950 text-neutral-100">
      <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
        <div className="px-5 py-4 text-lg font-semibold">antho&apos;s bot</div>
        <DashboardNav />
        <div className="mt-auto border-t border-neutral-800 p-4 text-xs text-neutral-400">
          <div className="truncate text-neutral-200">
            {session.user.name ?? "Signed in"}
          </div>
          <div className="mt-0.5 uppercase tracking-wide text-neutral-500">
            {level}
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
            className="mt-3"
          >
            <button
              type="submit"
              className="w-full rounded-md border border-neutral-700 px-3 py-1.5 text-neutral-300 transition hover:bg-neutral-800"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  );
}
