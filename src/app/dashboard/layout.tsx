import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { TopNav } from "./_components/top-nav";
import { SideNav } from "./_components/side-nav";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const level = session.user.accessLevel ?? "viewer";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-64 shrink-0 flex-col border-r border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 p-4">
            <div className="truncate text-sm font-medium text-neutral-200">
              {session.user.name ?? "Signed in"}
            </div>
            <div className="mt-0.5 text-xs uppercase tracking-wide text-neutral-500">{level}</div>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
              className="mt-2"
            >
              <button
                type="submit"
                className="w-full rounded-md border border-neutral-700 px-3 py-1 text-xs text-neutral-300 transition hover:bg-neutral-800"
              >
                Sign out
              </button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto">
            <SideNav />
          </div>
        </aside>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
