import { redirect } from "next/navigation";
import { auth, signIn } from "@/server/auth";

export default async function Home() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <main className="flex flex-1 items-center justify-center bg-neutral-950 text-neutral-100">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-8 text-center shadow-xl">
        <h1 className="text-2xl font-semibold">antho&apos;s bot</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Twitch &amp; YouTube notifications and community tools. Sign in with Discord to open
          the control panel.
        </p>
        <form
          action={async () => {
            "use server";
            await signIn("discord", { redirectTo: "/dashboard" });
          }}
          className="mt-6"
        >
          <button
            type="submit"
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-500"
          >
            Sign in with Discord
          </button>
        </form>
      </div>
    </main>
  );
}
