/**
 * A Discord embed as edited in the dashboard. Isomorphic (no discord.js import) so the client
 * builder and the server sender share one shape. The server maps this to a real APIEmbed.
 */
export interface EmbedField {
  name: string;
  value: string;
  inline: boolean;
}

export interface EmbedInput {
  content: string; // plain message text shown above the embed (optional)
  author: string;
  authorIcon: string;
  title: string;
  url: string; // makes the title a link
  description: string;
  color: string; // hex "#RRGGBB", or "" for no colored bar
  fields: EmbedField[];
  imageUrl: string;
  thumbnailUrl: string;
  footer: string;
  footerIcon: string;
  timestamp: boolean;
}

/** A fresh, empty embed with Discord's blurple as the default bar color. */
export function blankEmbed(): EmbedInput {
  return {
    content: "",
    author: "",
    authorIcon: "",
    title: "",
    url: "",
    description: "",
    color: "#5865F2",
    fields: [],
    imageUrl: "",
    thumbnailUrl: "",
    footer: "",
    footerIcon: "",
    timestamp: false,
  };
}

/** True when the embed has no visible content — so it shouldn't be sent on its own. */
export function isEmptyEmbed(e: EmbedInput): boolean {
  return (
    !e.author.trim() &&
    !e.title.trim() &&
    !e.description.trim() &&
    !e.imageUrl.trim() &&
    !e.thumbnailUrl.trim() &&
    !e.footer.trim() &&
    !e.fields.some((f) => f.name.trim() || f.value.trim())
  );
}
