export interface LeaderboardEntry {
  userId: string;
  name: string;
  level: number;
  xp: number;
  prestige: number;
}

export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">Leaderboard</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-neutral-500">No XP earned yet.</p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
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
                <tr key={e.userId} className="border-t border-neutral-800 bg-neutral-950/40">
                  <td className="px-4 py-2 text-neutral-500">{i + 1}</td>
                  <td className="px-4 py-2 text-neutral-100">{e.name}</td>
                  <td className="px-4 py-2 text-right">{e.level}</td>
                  <td className="px-4 py-2 text-right text-neutral-300">{e.xp.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-neutral-400">{e.prestige || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
