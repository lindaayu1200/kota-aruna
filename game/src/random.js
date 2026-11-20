const DEFAULT_SEED = 20240617;

function sanitizeSeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_SEED;
  const whole = Math.trunc(number) >>> 0;
  return whole === 0 ? DEFAULT_SEED : whole;
}

export function createGenerator(seed = 1337) {
  let state = sanitizeSeed(seed);

  function draw() {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  }

  return {
    seed: sanitizeSeed(seed),
    draw,
    between(low, high) {
      return low + (high - low) * draw();
    },
    integer(low, high) {
      return Math.floor(low + (high - low + 1) * draw());
    },
    odds(probability) {
      return draw() < probability;
    },
    choose(items) {
      if (!Array.isArray(items) || items.length === 0) return undefined;
      return items[Math.floor(draw() * items.length)];
    },
    shuffled(items) {
      const copy = Array.from(items);
      for (let cursor = copy.length - 1; cursor > 0; cursor -= 1) {
        const swap = Math.floor(draw() * (cursor + 1));
        const held = copy[cursor];
        copy[cursor] = copy[swap];
        copy[swap] = held;
      }
      return copy;
    },
    bell() {
      const radius = Math.max(draw(), 1e-8);
      const angle = draw() * Math.PI * 2;
      return Math.sqrt(-2 * Math.log(radius)) * Math.cos(angle);
    },
    fork() {
      return createGenerator(Math.floor(draw() * 4294967296));
    },
  };
}

export default createGenerator;
