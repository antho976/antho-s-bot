import type { CSSProperties, ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/server/auth";
import { getAccent } from "@/server/core/settings";
import { TopNav } from "./_components/top-nav";
import { SideNav } from "./_components/side-nav";
import { NavSearchProvider } from "./_components/nav-search";
import { buttonClass } from "./_components/ui/button";
import { ToastProvider } from "./_components/ui/toast";
import { ConfirmProvider } from "./_components/ui/confirm";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/");

  const level = session.user.accessLevel ?? "viewer";
  const accent = await getAccent();

  return (
    <div
      id="dash-root"
      className="flex min-h-screen flex-col bg-surface-0 text-text"
      style={{ "--accent": accent } as CSSProperties}
    >
      <NavSearchProvider>
        <TopNav />
        <div className="flex flex-1 overflow-hidden">
          <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-surface-1">
            <div className="border-b border-border p-4">
              <div className="truncate text-sm font-medium text-text">
                {session.user.name ?? "Signed in"}
              </div>
              <div className="mt-0.5 text-xs uppercase tracking-wide text-faint">{level}</div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
                className="mt-2"
              >
                <button type="submit" className={buttonClass("secondary", "sm", "w-full")}>
                  Sign out
                </button>
              </form>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SideNav />
            </div>
          </aside>
          <main className="flex-1 overflow-y-auto p-8">
            {/* Cap width + left-align; each page's own mx-auto becomes a no-op inside this. */}
            <div className="max-w-5xl">
              <ToastProvider>
                <ConfirmProvider>{children}</ConfirmProvider>
              </ToastProvider>
            </div>
          </main>
        </div>
      </NavSearchProvider>
    </div>
  );
}
