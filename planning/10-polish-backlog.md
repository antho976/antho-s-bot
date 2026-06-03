# 10 — Polish Backlog

We build **logic first, polish later**. This doc collects the deferred "make it pretty &
feature-packed" work so nothing is lost. Don't build these during a feature's logic phase —
they're a dedicated later pass. Add freely as ideas come up.

## Notifications (stream alerts)
- **Rich live embed:** stream thumbnail/preview image, title, category/game, viewer count,
  uptime — auto-refreshing while live.
- **End-of-stream recap:** when the stream ends, replace/append a recap embed (duration, peak
  viewers, games played, etc.).
- **VOD button:** a button on the alert that links to the latest VOD; if the current stream's
  VOD isn't posted yet, link to the most recent one, then **auto-update** the button when the
  real VOD appears.
- **Auto-delete / replace:** when a new trigger is detected (new stream), clean up the previous
  alert message automatically.
- Per-event message styling, more templates/placeholders, role-mention controls.

## General UI polish (all features)
- Shared UI primitives (Card, Button, Field, Toggle, Badge, Section) so a restyle is one place.
- Theming/branding pass (colors, logo, layout density).
- Empty states, loading skeletons, toasts, optimistic updates, mobile layout.

## (add per-feature polish notes here as phases land)
