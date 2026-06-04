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
  nodes: [
    { id: "root", type: "root", name: "Warrior", desc: "Your beginning.", x: 430, y: 295 },

    // Offense (upper right)
    { id: "o1", type: "minor", name: "Might", desc: "+3 Damage", x: 530, y: 265, effect: { damage: 3 } },
    { id: "o2", type: "minor", name: "Might", desc: "+3 Damage", x: 615, y: 230, effect: { damage: 3 } },
    { id: "o3", type: "notable", name: "Warlord", desc: "+10 Dmg, +5% Crit", x: 700, y: 195, effect: { damage: 10, critChance: 0.05 } },
    { id: "o4", type: "minor", name: "Edge", desc: "+2% Crit", x: 615, y: 320, effect: { critChance: 0.02 } },
    { id: "o5", type: "notable", name: "Executioner", desc: "+50% Crit Dmg", x: 710, y: 350, effect: { critMult: 0.5 } },

    // Defense (upper left)
    { id: "d1", type: "minor", name: "Guard", desc: "+2% Reduction", x: 330, y: 265, effect: { dmgReduction: 0.02 } },
    { id: "d2", type: "minor", name: "Footwork", desc: "+2% Dodge", x: 245, y: 230, effect: { dodge: 0.02 } },
    { id: "d3", type: "notable", name: "Ironhide", desc: "+6% Reduction", x: 160, y: 195, effect: { dmgReduction: 0.06 } },
    { id: "d4", type: "minor", name: "Guard", desc: "+2% Reduction", x: 245, y: 320, effect: { dmgReduction: 0.02 } },
    { id: "d5", type: "active", name: "Shield Wall", desc: "Active · Dungeons", x: 165, y: 350, ability: "shield_wall" },

    // Sustain (lower)
    { id: "s1", type: "minor", name: "Leech", desc: "+3% Lifesteal", x: 430, y: 385, effect: { lifesteal: 0.03 } },
    { id: "s2", type: "notable", name: "Bloodthirst", desc: "+8% Lifesteal", x: 430, y: 485, effect: { lifesteal: 0.08 } },
    { id: "s3", type: "active", name: "Berserk", desc: "Active · Dungeons", x: 310, y: 470, ability: "berserk" },
    { id: "s4", type: "minor", name: "Brawn", desc: "+4 Damage", x: 540, y: 470, effect: { damage: 4 } },
  ],
  edges: [
    ["root", "o1"], ["o1", "o2"], ["o2", "o3"], ["o1", "o4"], ["o4", "o5"],
    ["root", "d1"], ["d1", "d2"], ["d2", "d3"], ["d1", "d4"], ["d4", "d5"],
    ["root", "s1"], ["s1", "s2"], ["s2", "s3"], ["s2", "s4"],
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
