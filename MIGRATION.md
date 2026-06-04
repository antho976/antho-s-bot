# Render region migration → US-East (one-time)

**Goal:** move the bot from Oregon (US-West) to **Virginia** (US-East) to cut Discord
interaction latency (~270 ms → ~170–210 ms round-trip). Render can't change a service's
region in place, so we recreate the service. **Data is intentionally not migrated.**

## Already done in the repo
- [x] `render.yaml` → `region: virginia` (fallback: `ohio`).

## What you do (Render dashboard + Discord portal)
1. **Commit & push** these changes to `main`.
2. **Render → delete** the existing **anthos-bot** (Oregon) service. (Deleting first frees the
   name *and* ensures only one instance holds the bot token.)
3. **Render → New → Blueprint** from this repo → it deploys **anthos-bot** in **Virginia**.
4. On the new service → **Environment** → set the secrets (the `sync:false` vars):
   - `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID`
   - `PUBLIC_BASE_URL` = the new service's `https://…onrender.com` URL
   - (`AUTH_SECRET` auto-generates; `DATABASE_URL` + `LOG_RETENTION_DAYS` come from the blueprint)
5. **Discord Developer Portal → OAuth2 → Redirects** → add:
   `https://<new-url>.onrender.com/api/auth/callback/discord`
   (otherwise dashboard login breaks — the URL changed).
6. Wait for the deploy, open the **new** dashboard URL → **RPG page → Button latency** card.
   The Discord round-trip should drop to ~170–210 ms.

## Notes
- Only **one** instance may hold the bot token at a time — that's why we delete Oregon first.
- Slash commands re-register automatically on boot. No Twitch/YouTube webhooks to migrate yet.
- If `virginia` isn't offered on your plan, change `render.yaml` to `region: ohio` (also US-East).
- Avoid this churn next time with a **custom domain** in front — then a region move is just a DNS
  repoint, with no OAuth/URL changes.
