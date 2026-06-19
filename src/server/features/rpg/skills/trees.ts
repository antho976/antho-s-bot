// Skill-tree content — a small PoE-style graph per class. Nodes carry an (x,y) for the canvas
// render; edges define pathing (you may allocate a node only if it connects to one you have).
// Passives feed the StatBlock (skills/compute); actives are cast in Dungeons (the `ability` id maps
// to a dungeon ability in dungeon-config; you may only use actives you've allocated).

export type SkillEffect = Partial<{
  damage: number;
  critChance: number;
  critMult: number;
  lifesteal: number;
  dodge: number;
  dmgReduction: number;
}>;

export type SkillNode = {
  id: string;
  type: "root" | "minor" | "notable" | "active";
  name: string;
  desc: string; // shown in the allocation menu
  x: number;
  y: number;
  effect?: SkillEffect; // passives
  ability?: string; // actives (dormant until Dungeons)
  detail?: string; // actives: full description for the Active Skills viewer
};

export type SkillTree = {
  classId: string;
  root: string;
  nodes: SkillNode[];
  edges: [string, string][];
};

const WARRIOR_TREE: SkillTree = {
  classId: "warrior",
  root: "root",
  // Three arms off the root — Offense (right), Defense (left), Sustain (down) — each splitting into
  // two lines that end in an active. Passive notables feed the StatBlock; actives are cast in dungeons.
  nodes: [
    { id: "root", type: "root", name: "Warrior", desc: "Your beginning.", x: 400, y: 300 },

    // ── Offense (right): a crit line → Berserk, and a damage line → Onslaught ──
    { id: "o1", type: "notable", name: "Might", desc: "+12 Damage", x: 487, y: 268, effect: { damage: 12 } },
    { id: "o3", type: "notable", name: "Warlord", desc: "+6% Crit", x: 567, y: 232, effect: { critChance: 0.06 } },
    { id: "o5", type: "notable", name: "Executioner", desc: "+60% Crit Dmg", x: 650, y: 192, effect: { critMult: 0.6 } },
    { id: "o6", type: "active", name: "Berserk", desc: "Active", x: 735, y: 150, ability: "berserk", detail: "For 3 turns: +50% damage dealt, but +25% damage taken." },
    { id: "o2", type: "notable", name: "Bloodlust", desc: "+14 Damage", x: 575, y: 312, effect: { damage: 14 } },
    { id: "o4", type: "notable", name: "Precision", desc: "+6% Crit", x: 662, y: 288, effect: { critChance: 0.06 } },
    { id: "o7", type: "notable", name: "Savagery", desc: "+50% Crit Dmg", x: 745, y: 252, effect: { critMult: 0.5 } },
    { id: "o8", type: "active", name: "Onslaught", desc: "Active", x: 762, y: 345, ability: "onslaught", detail: "Three rapid strikes at 80% damage each." },

    // ── Defense (left): a dodge line → Shield Wall, and an armour line → Guardian ──
    { id: "d1", type: "notable", name: "Toughness", desc: "+8% Defence", x: 313, y: 268, effect: { dmgReduction: 0.08 } },
    { id: "d3", type: "notable", name: "Footwork", desc: "+8% Dodge", x: 233, y: 232, effect: { dodge: 0.08 } },
    { id: "d4", type: "notable", name: "Resilience", desc: "+8% Dodge", x: 152, y: 192, effect: { dodge: 0.08 } },
    { id: "d5", type: "active", name: "Shield Wall", desc: "Active", x: 68, y: 150, ability: "shield_wall", detail: "Take 40% less damage for 3 turns." },
    { id: "d2", type: "notable", name: "Iron Skin", desc: "+8% Defence", x: 240, y: 312, effect: { dmgReduction: 0.08 } },
    { id: "d6", type: "notable", name: "Bulwark", desc: "+10% Defence", x: 158, y: 290, effect: { dmgReduction: 0.1 } },
    { id: "d7", type: "notable", name: "Stalwart", desc: "+8% Defence", x: 78, y: 252, effect: { dmgReduction: 0.08 } },
    { id: "d8", type: "active", name: "Guardian", desc: "Active", x: 60, y: 345, ability: "guardian", detail: "Guard the next blow and heal 18% of max HP." },

    // ── Sustain (down): a lifesteal/damage line → Rampage, and a sustain line → Frenzy ──
    { id: "s1", type: "notable", name: "Bloodthirst", desc: "+8% Lifesteal", x: 400, y: 385, effect: { lifesteal: 0.08 } },
    { id: "s2", type: "notable", name: "Brawn", desc: "+10 Damage", x: 322, y: 442, effect: { damage: 10 } },
    { id: "s3", type: "notable", name: "Vitality", desc: "+8% Lifesteal", x: 245, y: 472, effect: { lifesteal: 0.08 } },
    { id: "s4", type: "active", name: "Rampage", desc: "Active", x: 158, y: 505, ability: "rampage", detail: "+50% damage for 3 turns." },
    { id: "s5", type: "notable", name: "Resolve", desc: "+8% Defence", x: 478, y: 440, effect: { dmgReduction: 0.08 } },
    { id: "s6", type: "notable", name: "Vampirism", desc: "+8% Lifesteal", x: 555, y: 472, effect: { lifesteal: 0.08 } },
    { id: "s7", type: "active", name: "Frenzy", desc: "Active", x: 642, y: 505, ability: "frenzy", detail: "A furious 220% damage blow." },
  ],
  edges: [
    // Offense
    ["root", "o1"], ["o1", "o3"], ["o3", "o5"], ["o5", "o6"],
    ["o1", "o2"], ["o2", "o4"], ["o4", "o7"], ["o7", "o8"], ["o5", "o7"],
    // Defense
    ["root", "d1"], ["d1", "d3"], ["d3", "d4"], ["d4", "d5"],
    ["d1", "d2"], ["d2", "d6"], ["d6", "d7"], ["d7", "d8"], ["d4", "d6"],
    // Sustain
    ["root", "s1"], ["s1", "s2"], ["s2", "s3"], ["s3", "s4"],
    ["s1", "s5"], ["s5", "s6"], ["s6", "s7"],
  ],
};

const TREES: Record<string, SkillTree> = { warrior: WARRIOR_TREE };

/** The skill tree for a class, or null if it doesn't have one yet (test = Warrior only). */
export function getTree(classId: string): SkillTree | null {
  return TREES[classId] ?? null;
}

export function nodeById(tree: SkillTree, id: string): SkillNode | undefined {
  return tree.nodes.find((n) => n.id === id);
}
