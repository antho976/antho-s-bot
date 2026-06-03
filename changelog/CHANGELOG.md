# Changelog

All versions in one file, newest first. Each entry matches a `git` commit (`Version X`).

---

## 0.1.3 — Welcome & Goodbye
_2026-06-03 · commit `00341e3`_

- **Welcome + goodbye** messages with modes **text / image / both**.
- **Custom artwork** (avatar + name on a gradient or background image) via `@napi-rs/canvas`.
- Template placeholders `{user} {username} {server} {memberCount}`.
- **Backgrounds** by URL with optional **random pick** each time.
- **Dashboard → Welcome:** settings, backgrounds manager, and a **live preview**.
- Tables: `welcome_config`, `welcome_backgrounds` (migration `0003`). `track()`: `welcome.join/leave`.
- _Deferred to polish:_ background file uploads (vs URL); font/typography.

---

## 0.1.2 — Leveling
_2026-06-03 · commit `cd7ca39`_

- **XP** from messages (15–25, 60s cooldown), **voice** (5/min, skips muted/AFK), **reactions** (off by default) — all configurable.
- **Curve:** multiplier formula (base + factor) with a custom-per-level table ready; **prestige** tracked.
- **Level-ups** announce in chat and **grant role rewards** automatically.
- **Dashboard → Leveling:** leaderboard (top 25), full settings, role-reward manager.
- Tables: `levels`, `level_config`, `level_rewards`, `level_curve` (migration `0002`). `track()`: `level.up`.

---

## 0.1.1 — Notifications: schedule, maintenance, provider scaffolds
_2026-06-02 · commit `bb9d658`_

- **Schedule & reminders:** ad-hoc upcoming streams with 1h / 10min reminders; in-process **scheduler** (no double-send).
- **Maintenance** (Overview): reset live / schedule / daily — audit-logged.
- **Platform seam:** `StreamProvider` interface; **Twitch (EventSub)** + **YouTube (PubSubHubbub)** scaffolds + webhook routes (handshakes implemented; inert until API keys).
- `env`: optional `TWITCH_*` / `YOUTUBE_API_KEY`; documented `AUTH_URL` for Render.

---

## 0.1 — Stream Notifications (core)
_2026-06-02 · commit `731e3d6`_

- Watch **Twitch / YouTube** channels with per-channel alert settings (target channel, ping role, embed, per-event toggles, custom template).
- Alert **formatter** → **Discord dispatch**; **fake live/end/upload** test triggers.
- **Dashboard → Notifications:** add/edit/delete channels, configure, test.
- Tables: `stream_channels`, `stream_state`, `stream_events` (migration `0001`).

---

## 0 — Foundation
_2026-06-02 · commit `a722424`_

- Next.js 16 + TypeScript + Tailwind **monolith**; bot boots inside the server via `instrumentation.ts`.
- **DB:** Drizzle + libsql; core + analytics tables (migration `0000`); migrations on boot.
- **Core services:** logger, health, analytics `track()`, permissions.
- **Discord:** gateway client, `/ping`, command registration, graceful offline mode.
- **Dashboard:** Discord OAuth login, Overview, Bot Health (live), Logs (live SSE).
- **Deploy:** Dockerfile + `render.yaml` (web service + persistent disk).
