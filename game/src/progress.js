// KOTA ARUNA — progression store: money, REP, rank titles and a handful of career stats.
//
// The store is deliberately small and dependency-free so it can be shared by the mission system,
// the HUD and any future stunt/scoring rules. Everything clamps at zero: debt and negative REP are
// not part of this game's story. Listeners are notified whenever a balance changes.

/** Rank ladder. `min` is the REP needed to reach the title. */
export const RANKS = Object.freeze([
  { min: 0, title: 'Kenal' },
  { min: 60, title: 'Dikenal' },
  { min: 150, title: 'Dipercaya' },
  { min: 280, title: 'Dihormati' },
  { min: 450, title: 'Panutan Teluk' },
  { min: 650, title: 'Legenda Teluk' },
]);

export function rankForRep(rep) {
  const value = Number.isFinite(rep) ? Math.max(0, rep) : 0;
  let index = 0;
  for (let i = 0; i < RANKS.length; i += 1) {
    if (value >= RANKS[i].min) index = i;
  }
  return RANKS[index];
}

/** @param {{money?:number, rep?:number, stats?:object}} initial */
export function createProgress(initial = {}) {
  let money = Number.isFinite(initial.money) ? Math.max(0, Math.floor(initial.money)) : 2500;
  let rep = Number.isFinite(initial.rep) ? Math.max(0, Math.floor(initial.rep)) : 0;
  const stats = {
    missionsCompleted: 0,
    missionsFailed: 0,
    stunts: 0,
    carsDelivered: 0,
    checkpointsCleared: 0,
    totalEarned: 0,
    totalSpent: 0,
    bestRank: rankForRep(rep).title,
    ...(initial.stats && typeof initial.stats === 'object' ? initial.stats : {}),
  };
  const listeners = new Set();
  let cachedRankRep = -1;
  let cachedRankInfo = null;

  function notify(kind, delta, value) {
    for (const listener of listeners) {
      try { listener(kind, delta, value); } catch { /* a broken UI must not break the game */ }
    }
  }

  function addMoney(delta) {
    const amount = Number.isFinite(delta) ? Math.round(delta) : 0;
    if (!amount) return money;
    const next = Math.max(0, money + amount);
    const applied = next - money;
    money = next;
    if (amount > 0) stats.totalEarned += applied;
    else stats.totalSpent += -applied;
    notify('money', applied, money);
    return money;
  }

  function addRep(delta) {
    const amount = Number.isFinite(delta) ? Math.round(delta) : 0;
    if (!amount) return rep;
    const before = rankForRep(rep).title;
    rep = Math.max(0, rep + amount);
    const after = rankForRep(rep).title;
    if (RANKS.findIndex((r) => r.title === after) > RANKS.findIndex((r) => r.title === before)) {
      stats.bestRank = after;
      notify('rank', after, rep);
    }
    notify('rep', amount, rep);
    return rep;
  }

  return {
    getMoney: () => money,
    setMoney(value) {
      const next = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      return addMoney(next - money);
    },
    addMoney,
    getRep: () => rep,
    setRep(value) {
      const next = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
      return addRep(next - rep);
    },
    addRep,
    /** Stunts are the free-form REP source: jumps, near misses and clean runs. */
    addStunt(points = 8, label = 'stunt') {
      const amount = Number.isFinite(points) ? Math.max(0, Math.round(points)) : 0;
      stats.stunts += 1;
      if (amount) addRep(amount);
      notify('stunt', amount, label);
      return rep;
    },
    getRank: () => rankForRep(rep).title,
    getRankInfo() {
      if (cachedRankRep !== rep || !cachedRankInfo) {
        const rank = rankForRep(rep);
        const index = RANKS.indexOf(rank);
        const next = RANKS[index + 1] || null;
        const span = next ? next.min - rank.min : 1;
        cachedRankInfo = {
          title: rank.title,
          min: rank.min,
          next: next ? next.title : null,
          nextMin: next ? next.min : null,
          progress: next ? Math.min(1, Math.max(0, (rep - rank.min) / span)) : 1,
        };
        cachedRankRep = rep;
      }
      return cachedRankInfo;
    },
    getStats: () => ({ ...stats }),
    bumpStat(key, amount = 1) {
      if (!(key in stats)) stats[key] = 0;
      const value = Number.isFinite(amount) ? amount : 1;
      stats[key] += value;
      notify('stat', value, key);
      return stats[key];
    },
    /** Restore one saved stat verbatim (used by the load-game menu). */
    setStat(key, value) {
      if (!(key in stats)) stats[key] = 0;
      const before = Number(stats[key]);
      stats[key] = value;
      const delta = Number.isFinite(before) && Number.isFinite(value) ? value - before : 0;
      notify('stat', delta, key);
      return stats[key];
    },
    on(listener) {
      if (typeof listener === 'function') listeners.add(listener);
      return () => listeners.delete(listener);
    },
    toJSON: () => ({ money, rep, stats: { ...stats } }),
    reset() {
      money = 2500;
      rep = 0;
      stats.missionsCompleted = 0;
      stats.missionsFailed = 0;
      stats.stunts = 0;
      stats.carsDelivered = 0;
      stats.checkpointsCleared = 0;
      stats.totalEarned = 0;
      stats.totalSpent = 0;
      stats.bestRank = RANKS[0].title;
      notify('reset', 0, null);
    },
  };
}

/** The one store used by the running game. */
export const progress = createProgress();
