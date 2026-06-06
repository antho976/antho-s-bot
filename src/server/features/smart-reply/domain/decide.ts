// Pure reply decision. Kept IO-free so it's trivially unit-testable: the caller passes the
// dice roll in rather than us calling Math.random() here.
//
// Order of precedence:
//   1. @mention  -> always reply (intentional ping)
//   2. filtered  -> never reply  (low-signal message)
//   3. chance    -> reply if the roll lands under the configured %

export interface DecideInput {
  isMention: boolean;
  worthy: boolean;
  replyChance: number; // 0-100
  roll: number; // 0-100 (e.g. Math.random() * 100)
}

export type ReplyReason = "mention" | "chance" | "filtered" | "no-roll";

export interface Decision {
  reply: boolean;
  reason: ReplyReason;
}

export function decideReply(i: DecideInput): Decision {
  if (i.isMention) return { reply: true, reason: "mention" };
  if (!i.worthy) return { reply: false, reason: "filtered" };
  if (i.roll < i.replyChance) return { reply: true, reason: "chance" };
  return { reply: false, reason: "no-roll" };
}
