// Word-level diff for the message-edit log: render the new message with the runs that changed
// (added or replaced words) wrapped in **bold**, so the edit is obvious at a glance. Pure — no I/O.

/**
 * Return `after` with the words that differ from `before` bolded. Words common to both (in order)
 * stay plain; consecutive changed words are grouped into one `**…**` run. If `before` is empty
 * (e.g. the old message wasn't cached) there's nothing to diff against, so `after` is returned as-is.
 */
export function highlightChanges(before: string, after: string): string {
  if (!before || !after) return after;

  const a = before.split(" ");
  const b = after.split(" ");
  const m = a.length;
  const n = b.length;

  // Longest common subsequence length table (suffix form).
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  // Walk the LCS to mark which tokens of `b` are unchanged.
  const common = new Array<boolean>(n).fill(false);
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      common[j] = true;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  // Rebuild `b`, grouping runs of changed tokens into a single bold span.
  const out: string[] = [];
  let k = 0;
  while (k < n) {
    if (common[k]) {
      out.push(b[k]);
      k++;
    } else {
      const run: string[] = [];
      while (k < n && !common[k]) run.push(b[k++]);
      out.push(`**${run.join(" ")}**`);
    }
  }
  return out.join(" ");
}
