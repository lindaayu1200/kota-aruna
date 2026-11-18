// Deterministic randomness for KOTA ARUNA. One seed, one city: every building, palm and car
// starts in the same place on every visit with the same ?seed=N.
//
// mulberry32 — small, fast and good enough for laying out a city.

export function createRandom(seed) {
  let state = (Number(seed) >>> 0) || 0x9e3779b9;

  function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Handy helpers for the layout code. They all draw from the same stream.
  random.range = (min, max) => min + random() * (max - min);
  random.int = (min, max) => Math.floor(random.range(min, max + 1));
  random.pick = (items) => items[Math.floor(random() * items.length)];
  random.chance = (probability) => random() < probability;

  return random;
}
