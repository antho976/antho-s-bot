// Skill-tree content — a small PoE-style graph per class. Nodes carry an (x,y) for the canvas
// render; edges define pathing (you may allocate a node only if it connects to one you have).
// Passives feed the StatBlock (skills/compute); actives are dormant until the dungeon engine.

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
  // Skill nodes only (passive + active skills). The small %/stat "filler" moves to a separate
  // Talents tree later — this tree stays meaningful-only, just denser now (10 + root).
  nodes: [
    { id: "root", type: "root", name: "Warrior", desc: "Your beginning.", x: 400, y: 315 },

    // Offense (upper right) — spread along the diagonal so the labels don't collide
    { id: "o1", type: "notable", name: "Might", desc: "+12 Damage", x: 540, y: 295, effect: { damage: 12 } },
    { id: "o2", type: "notable", name: "Warlord", desc: "+6% Crit", x: 655, y: 245, effect: { critChance: 0.06 } },
    { id: "o3", type: "notable", name: "Executioner", desc: "+60% Crit Dmg", x: 730, y: 180, effect: { critMult: 0.6 } },
    { id: "o4", type: "active", name: "Berserk", desc: "Active · Dungeons", x: 715, y: 330, ability: "berserk" },

    // Defense (upper left) — Shield Wall pulled in off the corner
    { id: "d1", type: "notable", name: "Toughness", desc: "+8% Reduction", x: 265, y: 255, effect: { dmgReduction: 0.08 } },
    { id: "d2", type: "notable", name: "Footwork", desc: "+8% Dodge", x: 175, y: 200, effect: { dodge: 0.08 } },
    { id: "d3", type: "active", name: "Shield Wall", desc: "Active · Dungeons", x: 110, y: 155, ability: "shield_wall" },

    // Sustain (lower)
    { id: "s1", type: "notable", name: "Bloodthirst", desc: "+8% Lifesteal", x: 400, y: 425, effect: { lifesteal: 0.08 } },
    { id: "s2", type: "notable", name: "Brawn", desc: "+10 Damage", x: 300, y: 505, effect: { damage: 10 } },
    { id: "s3", type: "active", name: "Rampage", desc: "Active · Dungeons", x: 500, y: 505, ability: "rampage" },
  ],
  edges: [
    ["root", "o1"], ["o1", "o2"], ["o2", "o3"], ["o2", "o4"],
    ["root", "d1"], ["d1", "d2"], ["d2", "d3"],
    ["root", "s1"], ["s1", "s2"], ["s1", "s3"],
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
