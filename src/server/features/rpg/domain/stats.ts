// Pure character math — no IO, unit-testable. The combat engine and views read from here.
import { CLASSES, DEFAULT_CLASS, RPG, type ClassDef } from "../config";

export function classDef(classId: string): ClassDef {
  return CLASSES[classId] ?? CLASSES[DEFAULT_CLASS];
}

export function maxHp(cls: ClassDef, level: number): number {
  return cls.baseHp + cls.hpPerLevel * (level - 1);
}

export function maxEnergy(cls: ClassDef, level: number): number {
  return cls.baseEnergy + cls.energyPerLevel * (level - 1);
}

/** XP needed to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.floor(RPG.xpBase * Math.pow(level, RPG.xpFactor));
}

/** A text progress bar, e.g. "▰▰▰▱▱▱▱▱▱▱". Canvas card is a later polish swap (planning/10). */
export function xpBar(current: number, needed: number, width = 10): string {
  const ratio = needed > 0 ? Math.min(1, Math.max(0, current / needed)) : 1;
  const filled = Math.round(ratio * width);
  return "▰".repeat(filled) + "▱".repeat(width - filled);
}

/** Inputs lazy regen needs from a player row. */
export type Regenable = {
  hp: number;
  energy: number;
  level: number;
  lastRegenAt: Date | null;
};

/**
 * Lazy regen: how much hp/energy a player has recovered since `lastRegenAt`, computed on read.
 * Pure — returns the new values; the caller persists them. `lastRegenAt` only advances by the
 * ticks actually consumed, so no fractional time is lost across calls.
 */
export function applyRegen(
  p: Regenable,
  cls: ClassDef,
  nowMs: number,
): { hp: number; energy: number; lastRegenAt: Date } {
  const lastMs = p.lastRegenAt ? p.lastRegenAt.getTime() : nowMs;
  const ticks = Math.floor((nowMs - lastMs) / RPG.regenIntervalMs);
  if (ticks <= 0) return { hp: p.hp, energy: p.energy, lastRegenAt: p.lastRegenAt ?? new Date(nowMs) };
  return {
    hp: Math.min(maxHp(cls, p.level), p.hp + ticks * RPG.hpPerTick),
    energy: Math.min(maxEnergy(cls, p.level), p.energy + ticks * RPG.energyPerTick),
    lastRegenAt: new Date(lastMs + ticks * RPG.regenIntervalMs),
  };
}
