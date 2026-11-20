const FALLBACK = 20240617;

function normalize(seed) {
  const numeric = Number(seed);
  if (!Number.isFinite(numeric)) return FALLBACK;
  const truncated = Math.trunc(numeric) >>> 0;
  return truncated === 0 ? FALLBACK : truncated;
}

export function makeRng(seed = 1337) {
  let word = normalize(seed);

  function next() {
    word = (word + 0x6d2b79f5) | 0;
    let scrambled = Math.imul(word ^ (word >>> 15), 1 | word);
    scrambled = (scrambled + Math.imul(scrambled ^ (scrambled >>> 7), 61 | scrambled)) ^ scrambled;
    return ((scrambled ^ (scrambled >>> 14)) >>> 0) / 4294967296;
  }

  return {
    seed: normalize(seed),
    next,
    range(from, to) {
      return from + (to - from) * next();
    },
    whole(from, to) {
      return Math.floor(from + (to - from + 1) * next());
    },
    chance(probability) {
      return next() < probability;
    },
    pick(collection) {
      return collection?.length ? collection[Math.floor(next() * collection.length)] : undefined;
    },
    shuffle(collection) {
      const result = [...collection];
      for (let at = result.length - 1; at > 0; at -= 1) {
        const swap = Math.floor(next() * (at + 1));
        [result[at], result[swap]] = [result[swap], result[at]];
      }
      return result;
    },
    bell() {
      const a = Math.max(next(), 1e-9);
      return Math.sqrt(-2 * Math.log(a)) * Math.cos(Math.PI * 2 * next());
    },
    branch() {
      return makeRng(Math.floor(next() * 4294967296));
    },
  };
}

export default makeRng;
