import type { AccessLevel } from "@/server/core/permissions";

declare module "next-auth" {
  interface Session {
    user: {
      discordId?: string;
      accessLevel?: AccessLevel;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    discordId?: string;
    accessLevel?: AccessLevel;
  }
}
