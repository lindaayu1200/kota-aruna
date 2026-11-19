// Deterministic randomness for KOTA ARUNA.
// A seed always produces the same street layout, tower skyline and palm grove,
// so screenshots and replays never drift between runs.

function normalize(seed) {
  const numeric = Number(seed);
  let state = Number.isFinite(numeric) ? Math.trunc(numeric) : 1;
  state = state >>> 0;
  return state === 0 ? 0x6d2b79f5 : state;
}

export function makeRandom(seed = 1337) {
  let state = normalize(seed);

  function next() {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  }

  return {
    seed: normalize(seed),
    next,
    value: next,
    between(low, high) {
      return low + (high - low) * next();
    },
    whole(low, high) {
      return Math.floor(low + (high - low + 1) * next());
    },
    odds(probability) {
      return next() < probability;
    },
    sign() {
      return next() < 0.5 ? -1 : 1;
    },
    choose(items) {
      if (!Array.isArray(items) || items.length === 0) return undefined;
      return items[Math.floor(next() * items.length)];
    },
    mix(items) {
      const result = Array.from(items);
      for (let index = result.length - 1; index > 0; index -= 1) {
        const swap = Math.floor(next() * (index + 1));
        const held = result[index];
        result[index] = result[swap];
        result[swap] = held;
      }
      return result;
    },
    bell() {
      const first = Math.max(next(), 0.000001);
      const second = next();
      return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
    },
    child() {
      return makeRandom(Math.floor(next() * 0xffffffff));
    },
  };
}

export default makeRandom;
