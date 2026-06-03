// The router's wire format. Every RPG button/select carries its route + owner in the custom_id
// so navigation is stateless and survives restarts (planning/11). Discord caps custom_id at 100
// chars — keep args to ids/indices.
//
//   rpg:<ownerId>:<view>[:<action>[:<args>]]

export const RPG_PREFIX = "rpg";

export type RpgRoute = {
  ownerId: string;
  view: string;
  action?: string;
  args?: string;
};

export function buildId(ownerId: string, view: string, action?: string, args?: string): string {
  const parts = [RPG_PREFIX, ownerId, view];
  if (action) parts.push(action);
  if (args) {
    if (!action) parts.push(""); // keep positional slots aligned
    parts.push(args);
  }
  return parts.join(":");
}

export function parseId(customId: string): RpgRoute | null {
  const parts = customId.split(":");
  if (parts[0] !== RPG_PREFIX || parts.length < 3) return null;
  const [, ownerId, view, action, ...rest] = parts;
  if (!ownerId || !view) return null;
  return {
    ownerId,
    view,
    action: action || undefined,
    args: rest.length ? rest.join(":") : undefined,
  };
}
