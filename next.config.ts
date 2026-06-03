import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // discord.js and @libsql/client are Node-only (native bindings / dynamic requires).
  // Keep them external so Next requires them at runtime instead of bundling.
  serverExternalPackages: ["discord.js", "@libsql/client", "@napi-rs/canvas"],
};

export default nextConfig;
