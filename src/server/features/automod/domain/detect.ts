// Official domains that should never be flagged as lookalikes.
const OFFICIAL = [
  "discord.com",
  "discord.gg",
  "discordapp.com",
  "discordapp.net",
  "discord.media",
  "youtube.com",
  "youtu.be",
  "twitch.tv",
  "steampowered.com",
  "steamcommunity.com",
];

// Brand names commonly impersonated by phishing domains.
const BRANDS = ["discord", "nitro", "steam"];

// Scam phrases — only acted on when a link is also present (cuts false positives).
const SCAM_PHRASES: RegExp[] = [
  /free\s+nitro/i,
  /nitro\s+for\s+free/i,
  /discord\s+nitro/i,
  /steam\s+gift/i,
  /claim\s+your\s+(free\s+)?(nitro|gift)/i,
  /\bairdrop\b/i,
  /gift\s+you\s+nitro/i,
  /@everyone.*(free|nitro|gift|airdrop)/i,
];

export interface DetectConfig {
  checkBlocklist: boolean;
  checkTyposquats: boolean;
  checkScamPhrases: boolean;
}

export interface ScamHit {
  rule: "blocklist" | "lookalike" | "phrase";
  detail: string;
}

function extractDomains(content: string): string[] {
  const urls = content.match(/https?:\/\/[^\s<>()]+/gi) ?? [];
  const domains: string[] = [];
  for (const u of urls) {
    try {
      domains.push(new URL(u).hostname.toLowerCase().replace(/^www\./, ""));
    } catch {
      // malformed URL — ignore
    }
  }
  return domains;
}

function matches(domain: string, entry: string): boolean {
  return domain === entry || domain.endsWith(`.${entry}`);
}

function isOfficial(domain: string): boolean {
  return OFFICIAL.some((o) => matches(domain, o));
}

/** Returns the first scam signal found, or null. Pure — easy to unit test. */
export function detectScam(
  content: string,
  cfg: DetectConfig,
  blocklist: string[],
): ScamHit | null {
  const domains = extractDomains(content);

  if (cfg.checkBlocklist) {
    for (const d of domains) {
      if (blocklist.some((entry) => matches(d, entry))) {
        return { rule: "blocklist", detail: d };
      }
    }
  }

  if (cfg.checkTyposquats) {
    for (const d of domains) {
      if (isOfficial(d)) continue;
      if (BRANDS.some((b) => d.includes(b))) return { rule: "lookalike", detail: d };
    }
  }

  if (cfg.checkScamPhrases && domains.length > 0) {
    if (SCAM_PHRASES.some((re) => re.test(content))) {
      return { rule: "phrase", detail: "scam phrase + link" };
    }
  }

  return null;
}
