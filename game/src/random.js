const MIX = 0x6d2b79f5;

function toSeed(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 20240617;
  return (Math.trunc(n) >>> 0) || MIX;
}

export function makeRng(seed = 1337) {
  let state = toSeed(seed);

  function next() {
    state = (state + MIX) >>> 0;
    let scrambled = state;
    scrambled = Math.imul(scrambled ^ (scrambled >>> 15), scrambled | 1);
    scrambled ^= scrambled + Math.imul(scrambled ^ (scrambled >>> 7), scrambled | 61);
    return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
  }

  return {
    seed: toSeed(seed),
    next,
    range(low, high) {
      return low + (high - low) * next();
    },
    integer(low, high) {
      return Math.floor(low + (high - low + 1) * next());
    },
    chance(probability) {
      return next() < probability;
    },
    pick(list) {
      if (!Array.isArray(list) || list.length === 0) return undefined;
      return list[Math.floor(next() * list.length)];
    },
    shuffled(list) {
      const out = Array.from(list);
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    spread() {
      const a = Math.max(next(), 1e-9);
      return Math.sqrt(-2 * Math.log(a)) * Math.cos(2 * Math.PI * next());
    },
    branch() {
      return makeRng(Math.floor(next() * 4294967296));
    },
  };
}

export default makeRng;
