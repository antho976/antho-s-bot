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
  // Talents tree later — keeping this tree few-but-meaningful so the nodes render big + readable.
  nodes: [
    { id: "root", type: "root", name: "Warrior", desc: "Your beginning.", x: 380, y: 300 },

    // Offense
    { id: "o3", type: "notable", name: "Warlord", desc: "+10 Dmg, +5% Crit", x: 545, y: 215, effect: { damage: 10, critChance: 0.05 } },
    { id: "o5", type: "notable", name: "Executioner", desc: "+50% Crit Dmg", x: 660, y: 130, effect: { critMult: 0.5 } },

    // Defense
    { id: "d3", type: "notable", name: "Ironhide", desc: "+6% Reduction", x: 215, y: 215, effect: { dmgReduction: 0.06 } },
    { id: "d5", type: "active", name: "Shield Wall", desc: "Active · Dungeons", x: 105, y: 130, ability: "shield_wall" },

    // Sustain
    { id: "s2", type: "notable", name: "Bloodthirst", desc: "+8% Lifesteal", x: 380, y: 455, effect: { lifesteal: 0.08 } },
    { id: "s3", type: "active", name: "Berserk", desc: "Active · Dungeons", x: 545, y: 500, ability: "berserk" },
  ],
  edges: [
    ["root", "o3"], ["o3", "o5"],
    ["root", "d3"], ["d3", "d5"],
    ["root", "s2"], ["s2", "s3"],
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
