/* 2D simplex noise (after Stefan Gustavson's public-domain reference) and helpers. */

const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;
const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];

export function makeNoise(seed = 1) {
  const perm = new Uint8Array(256);
  for (let i = 0; i < 256; i++) perm[i] = i;
  let s = seed >>> 0 || 1;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [perm[i], perm[j]] = [perm[j], perm[i]];
  }
  const p = new Uint8Array(512);
  for (let i = 0; i < 512; i++) p[i] = perm[i & 255];

  return function noise(x, y) {
    const t = (x + y) * F2;
    const i = Math.floor(x + t), j = Math.floor(y + t);
    const u = (i + j) * G2;
    const x0 = x - (i - u), y0 = y - (j - u);
    const i1 = x0 > y0 ? 1 : 0, j1 = 1 - i1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    let n = 0, a;
    a = 0.5 - x0 * x0 - y0 * y0;
    if (a > 0) { const g = GRAD[p[ii + p[jj]] & 7]; a *= a; n += a * a * (g[0] * x0 + g[1] * y0); }
    a = 0.5 - x1 * x1 - y1 * y1;
    if (a > 0) { const g = GRAD[p[ii + i1 + p[jj + j1]] & 7]; a *= a; n += a * a * (g[0] * x1 + g[1] * y1); }
    a = 0.5 - x2 * x2 - y2 * y2;
    if (a > 0) { const g = GRAD[p[ii + 1 + p[jj + 1]] & 7]; a *= a; n += a * a * (g[0] * x2 + g[1] * y2); }
    return 70 * n;
  };
}

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const smootherstep = t => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.exp(-lambda * dt));

/* Tiny seeded PRNG for scatter placement. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
