// Colour helpers that reproduce CSS `color-mix(in oklab, a X%, b)` from the design.

type RGBA = [number, number, number, number];

function parse(c: string): RGBA {
  if (c === 'transparent') return [0, 0, 0, 0];
  if (c.startsWith('#')) {
    let h = c.slice(1);
    if (h.length === 3) h = h.split('').map((x) => x + x).join('');
    const n = parseInt(h.slice(0, 6), 16);
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
  }
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const p = m[1].split(',').map((x) => parseFloat(x));
    return [p[0], p[1], p[2], p[3] ?? 1];
  }
  throw new Error(`Unsupported colour: ${c}`);
}

const toLin = (v: number) => {
  v /= 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const fromLin = (v: number) => {
  const s = v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, s)) * 255);
};

function toOklab([r, g, b]: RGBA): [number, number, number] {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function fromOklab([L, A, B]: [number, number, number]): [number, number, number] {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    fromLin(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    fromLin(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    fromLin(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

function out([r, g, b]: [number, number, number], a: number) {
  if (a >= 0.999) return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase();
  return `rgba(${r},${g},${b},${+a.toFixed(3)})`;
}

/** color-mix(in oklab, a pct%, b). pct is 0–100. Handles `transparent` like CSS (premultiplied). */
export function mix(a: string, pct: number, b: string): string {
  const p = pct / 100;
  const ca = parse(a), cb = parse(b);
  const alpha = ca[3] * p + cb[3] * (1 - p);
  if (alpha === 0) return 'transparent';
  const la = toOklab(ca), lb = toOklab(cb);
  const wa = (ca[3] * p) / alpha, wb = (cb[3] * (1 - p)) / alpha;
  return out(fromOklab([la[0] * wa + lb[0] * wb, la[1] * wa + lb[1] * wb, la[2] * wa + lb[2] * wb]), alpha);
}

/** Same colour at a given opacity (0–1). */
export function alpha(c: string, a: number): string {
  const [r, g, b, a0] = parse(c);
  return `rgba(${r},${g},${b},${+(a0 * a).toFixed(3)})`;
}

export function isHex(c: string) {
  return /^#[0-9a-fA-F]{6}$/.test(c);
}
