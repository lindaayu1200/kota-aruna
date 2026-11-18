// Small deterministic random helper built on mulberry32.
// Every city run with the same seed must place the same streets, towers,
// beach houses and palms.

export function createRandom(seed = 1) {
  let state = (Number(seed) >>> 0) || 0x9e3779b9;

  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  const api = {
    next,
    float: next,

    range(min, max) {
      return min + (max - min) * next();
    },

    int(min, max) {
      return Math.floor(min + (max - min + 1) * next());
    },

    chance(probability) {
      return next() < probability;
    },

    sign() {
      return next() < 0.5 ? -1 : 1;
    },

    pick(list) {
      if (!list || list.length === 0) return undefined;
      return list[Math.floor(next() * list.length)];
    },

    shuffle(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const value = copy[i];
        copy[i] = copy[j];
        copy[j] = value;
      }
      return copy;
    },

    gaussian() {
      const u = Math.max(next(), 1e-9);
      const v = next();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    },

    fork() {
      return createRandom(Math.floor(next() * 0xffffffff));
    },
  };

  return api;
}

export default createRandom;
