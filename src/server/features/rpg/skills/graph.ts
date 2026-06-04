// Pure pathing logic for the skill tree. The "frontier" = unallocated nodes touching an allocated
// node; you may only allocate from the frontier (PoE-style). `allocated` must include the root.
import type { SkillTree } from "./trees";

/** Unallocated nodes adjacent to an allocated one — the only nodes you may take next. */
export function frontier(tree: SkillTree, allocated: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const [a, b] of tree.edges) {
    if (allocated.has(a) && !allocated.has(b)) out.add(b);
    if (allocated.has(b) && !allocated.has(a)) out.add(a);
  }
  return out;
}

export function isAllocatable(tree: SkillTree, allocated: Set<string>, nodeId: string): boolean {
  return frontier(tree, allocated).has(nodeId);
}
