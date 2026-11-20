// Deterministic littlePRNG helpers. One seed always grows the same city.

export function stream(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let x = state;
    x = Math.imul(x ^ (x >>> 16), 0x21f0aaad);
    x = Math.imul(x ^ (x >>> 15), 0x735a2d97);
    return ((x ^ (x >>> 15)) >>> 0) / 4294967296;
  };
}

export function between(rng, low, high) {
  return low + (high - low) * rng();
}

export function whole(rng, low, high) {
  return Math.floor(between(rng, low, high + 1 - Number.EPSILON));
}

export function choose(rng, items) {
  return items[whole(rng, 0, items.length - 1)];
}

export function chance(rng, probability) {
  return rng() < probability;
}

export function wrapAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

export function clamp(value, low, high) {
  return value < low ? low : value > high ? high : value;
}
