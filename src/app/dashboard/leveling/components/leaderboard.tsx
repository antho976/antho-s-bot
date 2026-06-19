export interface LeaderboardEntry {
  userId: string;
  name: string;
  level: number;
  xp: number;
  prestige: number;
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-text">Leaderboard</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-faint">No XP earned yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-1 text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">#</th>
                <th className="px-4 py-2 text-left font-medium">Member</th>
                <th className="px-4 py-2 text-right font-medium">Level</th>
                <th className="px-4 py-2 text-right font-medium">XP</th>
                <th className="px-4 py-2 text-right font-medium">Prestige</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.userId} className="border-t border-border">
                  <td className="px-4 py-2 text-faint">{i + 1}</td>
                  <td className="px-4 py-2 text-text">{e.name}</td>
                  <td className="px-4 py-2 text-right text-text">{e.level}</td>
                  <td className="px-4 py-2 text-right text-muted">{e.xp.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-muted">{e.prestige || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
