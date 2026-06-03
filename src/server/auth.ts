import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { env } from "@/env";
import { resolveAccessLevel, type AccessLevel } from "@/server/core/permissions";

/**
 * Auth.js (next-auth v5) config. Login with Discord; we stamp the user's dashboard access
 * level (resolved from their role in our guild) onto the JWT/session.
 * `trustHost` is required for non-Vercel hosts like Render.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Discord({
      clientId: env.DISCORD_CLIENT_ID ?? "",
      clientSecret: env.DISCORD_CLIENT_SECRET ?? "",
      authorization: { params: { scope: "identify" } },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile?.id) {
        token.discordId = String(profile.id);
        token.accessLevel = await resolveAccessLevel(String(profile.id));
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.discordId = token.discordId as string | undefined;
        session.user.accessLevel =
          (token.accessLevel as AccessLevel | undefined) ?? "viewer";
      }
      return session;
    },
  },
});
