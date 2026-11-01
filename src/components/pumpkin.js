// Procedural giant-pumpkin illustration. Coordinates are pixels with the origin at the centre of the ground contact
// and y pointing down (SVG), so callers place it with translate(x, groundY). Shapes are seeded per record so a
// pumpkin always looks the same between visits.

const PALETTE = [
  { base: "#ec7a2c", shade: "#b9531b" },
  { base: "#f39a3d", shade: "#c46a22" },
  { base: "#e3682a", shade: "#a8461a" },
  { base: "#f4b04f", shade: "#c9822a" },
  { base: "#e9853f", shade: "#b55a26" },
  { base: "#f0c06a", shade: "#c49034" },
];

function seeded(text) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const f = (n) => n.toFixed(1);

// Closed Catmull-Rom spline through the points, as cubic Béziers.
function smoothClosed(pts) {
  const n = pts.length;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [pts[(i - 1 + n) % n], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

function smoothOpen(pts) {
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(i + 2, pts.length - 1)];
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

// Shape of a slumped giant: superellipse with a squarer bottom (flat contact patch) and fuller shoulders, widest
// below mid-height. Returns the outline point (y up, metres-agnostic units) for angle t.
function body(t, w, h, s) {
  const c = Math.cos(t), sn = Math.sin(t);
  const top = sn >= 0;
  const n = top ? s.nTop : s.nBottom;
  const x = (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n);
  const y = top ? s.h0 + (h - s.h0) * Math.abs(sn) ** (2 / n) : s.h0 - s.h0 * Math.abs(sn) ** (2 / n);
  return [x, y];
}

// Half-width of the body at height y, found by bisection on the outline (used to project the lobe meridians).
function halfWidthAt(y, w, h, s) {
  const top = y >= s.h0;
  let lo = top ? 0 : -Math.PI / 2, hi = top ? Math.PI / 2 : 0;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    const [, ym] = body(mid, w, h, s);
    if (ym < y) lo = mid; else hi = mid; // y rises with t on both halves
  }
  return body((lo + hi) / 2, w, h, s)[0];
}

/**
 * @param {object} o
 * @param {string} o.seed     stable id
 * @param {number} o.w        width in px
 * @param {number} o.h        height in px
 * @param {string} [o.uid]    unique id prefix for defs
 * @param {boolean} [o.ghost] dashed outline only (a record not yet reached)
 */
export function pumpkinSvg({ seed, w, h, uid = seed, ghost = false }) {
  const rnd = seeded(seed);
  const s = {
    h0: h * (0.36 + rnd() * 0.08),
    nTop: 2.3 + rnd() * 0.5,
    nBottom: 3.1 + rnd() * 0.8,
  };
  const lobesTotal = 9 + Math.floor(rnd() * 4);
  const phase = rnd() * Math.PI;
  const lean = (rnd() - 0.5) * 0.07;
  const asym = 1 + (rnd() - 0.5) * 0.09;
  const cavity = 0.05 + rnd() * 0.03;
  const amp = 0.022 + rnd() * 0.012;
  const colour = PALETTE[Math.floor(rnd() * PALETTE.length)];

  const warp = ([x, y]) => {
    const xs = x * (x > 0 ? asym : 1 / asym);
    return [xs + lean * w * (y / h), y - cavity * h * Math.exp(-((x / (0.13 * w)) ** 2)) * (y > s.h0 ? 1 : 0)];
  };

  const N = 160;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    let [x, y] = body(t, w, h, s);
    if (y > s.h0 * 0.6) {
      // Creases between lobes: |cos| gives V-shaped dips where lobes meet.
      const k = 1 + amp * (Math.abs(Math.cos((lobesTotal / 2) * t + phase)) ** 0.6 - 0.62);
      x *= k;
      y = s.h0 + (y - s.h0) * (1 + (k - 1) * 0.5);
    }
    pts.push(warp([x, y]));
  }
  const outline = smoothClosed(pts.map(([x, y]) => [x, -y]));

  if (ghost) {
    return `<path class="pk-ghost" d="${outline}"/>`;
  }

  // Lobe meridians: x = R(y)·sin(phi) is the orthographic projection of a meridian on a body of revolution.
  const ribs = [];
  for (let k = 0; k < lobesTotal; k++) {
    const phi = phase + (k * 2 * Math.PI) / lobesTotal;
    if (Math.cos(phi) < 0.2) continue;
    const line = [];
    for (let j = 0; j <= 14; j++) {
      const y = h * (0.06 + 0.86 * (j / 14) ** 0.9);
      line.push(warp([halfWidthAt(Math.min(y, h * 0.98), w, h, s) * Math.sin(phi), y]));
    }
    ribs.push(smoothOpen(line.map(([x, y]) => [x, -y])));
  }

  // Stem: thick, short, corky, leaning; its base sits in the cavity.
  const [topX, topY] = warp([0, h]);
  const sw = Math.max(w * (0.075 + rnd() * 0.03), 6);
  const sh = Math.max(h * (0.13 + rnd() * 0.06), 8);
  const bend = (rnd() - 0.35) * sw * 1.4;
  const by = -topY + cavity * h * 0.55;
  const stem =
    `M${f(topX - sw * 0.95)} ${f(by + 2)}` +
    `C${f(topX - sw * 0.55)} ${f(by - sh * 0.15)} ${f(topX - sw * 0.5 + bend * 0.4)} ${f(by - sh * 0.7)} ${f(topX - sw * 0.42 + bend)} ${f(by - sh)}` +
    `L${f(topX + sw * 0.5 + bend)} ${f(by - sh * 1.04)}` +
    `C${f(topX + sw * 0.45 + bend * 0.5)} ${f(by - sh * 0.6)} ${f(topX + sw * 0.5)} ${f(by - sh * 0.2)} ${f(topX + sw * 1.0)} ${f(by + 2)}Z`;

  const id = `pk-${uid}`;
  const hx = -w * 0.2 + lean * w * 0.7, hy = -h * 0.7;
  return `
    <defs>
      <clipPath id="${id}-clip"><path d="${outline}"/></clipPath>
      <mask id="${id}-shade" maskUnits="userSpaceOnUse" x="${f(-w)}" y="${f(-h * 1.6)}" width="${f(w * 2)}" height="${f(h * 2)}">
        <path d="${outline}" fill="#fff"/>
        <path d="${outline}" fill="#000" transform="translate(${f(-w * 0.13)} ${f(-h * 0.12)}) scale(0.97)"/>
      </mask>
    </defs>
    <ellipse class="pk-shadow" cx="${f(w * 0.06)}" cy="2" rx="${f(w * 0.5)}" ry="${f(Math.max(h * 0.05, 3))}"/>
    <path d="${outline}" fill="${colour.base}"/>
    <g clip-path="url(#${id}-clip)">
      <rect x="${f(-w)}" y="${f(-h * 1.6)}" width="${f(w * 2)}" height="${f(h * 2)}" fill="${colour.shade}" mask="url(#${id}-shade)" opacity="0.55"/>
      <rect x="${f(-w)}" y="${f(-h * 1.6)}" width="${f(w * 2)}" height="${f(h * 2)}" fill="url(#halftone)" mask="url(#${id}-shade)"/>
      ${ribs.map((d) => `<path class="pk-rib" d="${d}" style="stroke-width:${f(Math.min(2, Math.max(0.8, w / 150)))}"/>`).join("")}
    </g>
    <ellipse class="pk-shine" cx="${f(hx)}" cy="${f(hy)}" rx="${f(w * 0.07)}" ry="${f(h * 0.05)}" transform="rotate(-24 ${f(hx)} ${f(hy)})"/>
    <path class="pk-outline" d="${outline}" style="stroke-width:${f(Math.min(3, Math.max(1.5, w / 100)))}"/>
    <path class="pk-stem" d="${stem}" style="stroke-width:${f(Math.min(2.5, Math.max(1.2, w / 120)))}"/>
    <path class="pk-stem-cut" d="M${f(topX - sw * 0.42 + bend)} ${f(by - sh)}L${f(topX + sw * 0.5 + bend)} ${f(by - sh * 1.04)}"/>`;
}
