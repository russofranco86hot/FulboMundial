export interface MatchPosterVoteLeader {
  name: string;
  votes: number;
}

export function computeVoteLeaders(
  votes: { categoryId: string; candidateId: number }[],
  teams: { playerId: number | null; name: string }[]
): {
  mvpLeader: MatchPosterVoteLeader | null;
  burroLeader: MatchPosterVoteLeader | null;
  golLeader: MatchPosterVoteLeader | null;
} {
  const playerMap = new Map<number, string>();
  for (const t of teams) {
    if (t.playerId) playerMap.set(t.playerId, t.name);
  }

  function topForCategory(cat: string): MatchPosterVoteLeader | null {
    const counts = new Map<number, number>();
    for (const v of votes) {
      if (v.categoryId === cat) {
        counts.set(v.candidateId, (counts.get(v.candidateId) ?? 0) + 1);
      }
    }
    let bestId: number | null = null;
    let bestCount = 0;
    for (const [cid, count] of counts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestId = cid;
      }
    }
    if (!bestId || bestCount === 0) return null;
    const name = playerMap.get(bestId);
    if (!name) return null;
    return { name, votes: bestCount };
  }

  return {
    mvpLeader: topForCategory("mvp"),
    burroLeader: topForCategory("tronco"),
    golLeader: topForCategory("gol"),
  };
}
