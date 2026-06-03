# 02 — Hosting & Cost

Goal: keep this cheap and reliable. You said "$7 is fine, explain how to make it free if
possible — but if free is really unreliable, I'll skip." This doc lays out all three paths
honestly so you can choose.

## The core problem

A Discord bot holds an **always-open WebSocket** to Discord's gateway. If the host puts the
process to sleep, the bot goes offline. So "free tiers that sleep on inactivity" fight us.
Everything below is about keeping one small process always-on as cheaply as possible.

## Path A — Render Starter (recommended, ~$7/mo)

- **One Render service**, always-on, ~512 MB RAM, runs the Docker container (bot + dashboard).
- **Storage:** a small Render **persistent disk** (~1 GB) holds the SQLite file. Cheap, and it
  survives redeploys (plain JSON on Render's ephemeral filesystem would be wiped — this is the
  trap v1's approach would hit on Render).
- **Cost:** ~$7/mo for the instance + ~$1/mo for the disk ≈ **$7–8/mo total.**
- **Why recommended:** turnkey, reliable, auto-deploys from GitHub, zero server admin.

## Path B — Genuinely free & reliable (Oracle Cloud Free Tier)

- Oracle Cloud's **Always Free** tier gives a small ARM VM that runs **24/7 forever** at **$0**.
  (Their free Ampere allowance is generous — far more than this bot needs.)
- Run the **same Docker container** there. SQLite file lives on the VM's disk (free, persistent).
- **Cost:** **$0/mo**, genuinely always-on and reliable.
- **Trade-off:** you manage a Linux VM (initial setup, occasional patching). More hands-on than
  Render, but our Dockerized design (D6) makes the app itself identical — only the host differs.
- This is the real answer to "can it be free *and* reliable?" → **yes, on a free VM, at the cost
  of a bit more setup.**

## Path C — Render free tier + keep-alive (free but fragile)

- Render's **free** web service sleeps after ~15 min with no inbound HTTP, and gives ~750
  instance-hours/month (one always-on service ≈ 730 h, right at the edge).
- Keep it awake by pinging a `/health` endpoint every ~10 min from a free external cron
  (UptimeRobot / cron-job.org).
- **Cost:** $0, but: cold-start gaps mean the bot can briefly drop offline, you're flirting with
  the hours cap, and the ephemeral disk means SQLite must live elsewhere (a free networked DB
  like **Neon**/**Turso**, adding latency and a second moving part).
- **Verdict:** works for tinkering, **not** what you want for a bot people rely on. Listed for
  completeness — you said you'd skip free if it's unreliable, and this is the unreliable one.

## Recommendation

Start on **Path A ($7/mo)** for reliability while we build. Because everything is Dockerized
(D6), moving to **Path B (free Oracle VM)** later is a host swap, not a rewrite — so you can go
free whenever you decide the VM admin is worth $7/mo. We are never locked in.

## Free networked DB options (only needed if we ever split services / use Path C)

If we ever can't use a local SQLite file (e.g. dashboard on a separate free service), these are
free and don't expire:
- **Turso** (libSQL — SQLite-compatible, so our Drizzle code barely changes). Best fit.
- **Neon** (serverless Postgres, scales to zero, generous free tier).
- (Avoid Render's built-in free Postgres — it expires.)

We design the data layer so swapping SQLite-file → Turso is a small change, not a rewrite.

## Secrets & environment

Never in git, never in the DB. Provided as env vars on the host:

- `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` (OAuth), `DISCORD_GUILD_ID`
- `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `TWITCH_EVENTSUB_SECRET`
- `YOUTUBE_API_KEY` (+ PubSubHubbub callback secret)
- `SESSION_SECRET` / `JWT_SECRET` (dashboard auth)
- `DATABASE_URL` (path to the SQLite file, or Turso URL)
- `PUBLIC_BASE_URL` (so Twitch/YouTube know where to send webhooks)

A `.env.example` lists them all; real values live only on the host.

## Backups

- Scheduled SQLite snapshots (the file is trivially copyable) to a `/backups` location and/or
  an external bucket. Dashboard exposes manual "Backup now" + "Download backup" + restore.
- This replaces v1's ad-hoc `/data/backups` JSON folder with something deliberate.

## Cost summary

| Path | Monthly | Reliability | Setup effort |
|------|---------|-------------|--------------|
| A — Render Starter | ~$7–8 | High | Low (recommended) |
| B — Oracle free VM | $0 | High | Medium (manage a VM) |
| C — Render free + pings | $0 | Low/fragile | Medium |
