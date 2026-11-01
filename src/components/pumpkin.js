// Giant-pumpkin silhouette: one closed outline plus the stem, no interior detail. Coordinates are pixels with the
// origin at the centre of the ground contact and y pointing down, so callers place it with translate(x, groundY).
// The shape is seeded by the record id, so a pumpkin always looks the same.

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

/**
 * Slumped giant: superellipse with a squarer bottom (flat contact patch), fuller shoulders, shallow creases where
 * the lobes meet, slight lean and asymmetry, a stem cavity and a short thick stem.
 * @returns {string} SVG path data for the whole silhouette
 */
export function pumpkinPath({ seed, w, h }) {
  const rnd = seeded(seed);
  const h0 = h * (0.36 + rnd() * 0.08);
  const nTop = 2.3 + rnd() * 0.5;
  const nBottom = 3.1 + rnd() * 0.8;
  const lobes = 9 + Math.floor(rnd() * 4);
  const phase = rnd() * Math.PI;
  const lean = (rnd() - 0.5) * 0.07;
  const asym = 1 + (rnd() - 0.5) * 0.09;
  const cavity = 0.05 + rnd() * 0.03;
  const amp = 0.022 + rnd() * 0.012;

  const pts = [];
  const N = 120;
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const c = Math.cos(t), sn = Math.sin(t);
    const top = sn >= 0;
    const n = top ? nTop : nBottom;
    let x = (w / 2) * Math.sign(c) * Math.abs(c) ** (2 / n);
    let y = top ? h0 + (h - h0) * Math.abs(sn) ** (2 / n) : h0 - h0 * Math.abs(sn) ** (2 / n);
    if (y > h0 * 0.6) {
      const k = 1 + amp * (Math.abs(Math.cos((lobes / 2) * t + phase)) ** 0.6 - 0.62);
      x *= k;
      y = h0 + (y - h0) * (1 + (k - 1) * 0.5);
    }
    const xs = x * (x > 0 ? asym : 1 / asym);
    y -= y > h0 ? cavity * h * Math.exp(-((x / (0.13 * w)) ** 2)) : 0;
    pts.push([xs + lean * w * (y / h), -y]);
  }

  const topX = lean * w;
  const sw = Math.max(w * (0.075 + rnd() * 0.03), 2);
  const sh = Math.max(h * (0.13 + rnd() * 0.06), 3);
  const bend = (rnd() - 0.35) * sw * 1.4;
  const by = -h + cavity * h * 0.5;
  const stem =
    `M${f(topX - sw * 0.8)} ${f(by + sh * 0.2)}` +
    `C${f(topX - sw * 0.55)} ${f(by - sh * 0.15)} ${f(topX - sw * 0.5 + bend * 0.4)} ${f(by - sh * 0.7)} ${f(topX - sw * 0.42 + bend)} ${f(by - sh)}` +
    `L${f(topX + sw * 0.5 + bend)} ${f(by - sh * 1.04)}` +
    `C${f(topX + sw * 0.45 + bend * 0.5)} ${f(by - sh * 0.6)} ${f(topX + sw * 0.5)} ${f(by - sh * 0.2)} ${f(topX + sw * 0.85)} ${f(by + sh * 0.2)}Z`;

  return smoothClosed(pts) + stem;
}
