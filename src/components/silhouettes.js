// Reference silhouettes drawn in metres (y up) and scaled by px per metre. Origin: centre of the ground contact.
// Overall dimensions come from reference-objects.json; limb and body curves are drawing choices.

const f = (n) => n.toFixed(1);
const poly = (pts, s) => "M" + pts.map(([x, y]) => `${f(x * s)} ${f(-y * s)}`).join("L") + "Z";
const mirror = (half) => [...half, ...half.slice().reverse().map(([x, y]) => [-x, y])];
const circle = (cx, cy, r) => `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0Z`;

// Front view of a standing adult; the top of the head sits exactly at heightM.
export function humanSvg(ref, s) {
  const k = ref.heightM / 1.75;
  const half = [
    [0.0, 0.82], [0.045, 0.78], [0.05, 0.03], [0.055, 0], [0.17, 0], [0.155, 0.06], [0.17, 0.9], [0.155, 1.02],
    [0.165, 1.27], [0.185, 1.25], [0.19, 0.84], [0.215, 0.76], [0.25, 0.8], [0.24, 1.37], [0.2, 1.455],
    [0.07, 1.5], [0.055, 1.53],
  ].map(([x, y]) => [x * k, y * k]);
  // Head sits just above the neck so the two subpaths never overlap (no winding holes).
  const rx = 0.092 * k * s, ry = 0.1075 * k * s, cy = -ref.heightM * s + ry;
  const head = `M${f(-rx)} ${f(cy)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
  return { widthM: 0.5 * k, d: poly(mirror(half), s) + head };
}

// Side view of a Labrador facing right; the withers sit at heightM.
export function dogSvg(ref, s) {
  const k = ref.heightM / 0.58;
  const body = [
    [-0.53, 0.4], [-0.47, 0.47], [-0.33, 0.55], [-0.05, 0.572], [0.1, 0.58], [0.2, 0.66], [0.24, 0.715],
    [0.31, 0.735], [0.39, 0.715], [0.49, 0.685], [0.535, 0.66], [0.53, 0.62], [0.41, 0.6], [0.31, 0.565],
    [0.3, 0.43], [0.265, 0.31], [0.255, 0.04], [0.295, 0], [0.175, 0], [0.175, 0.27], [0.0, 0.3], [-0.15, 0.315],
    [-0.205, 0.22], [-0.215, 0.05], [-0.175, 0], [-0.3, 0], [-0.31, 0.13], [-0.385, 0.33], [-0.37, 0.47],
    [-0.41, 0.47],
  ].map(([x, y]) => [x * k, y * k]);
  return { widthM: 1.07 * k, d: poly(body, s) };
}

// Side profile of the reference hatchback facing right. Length, height, wheelbase, front overhang and tyre
// diameter are the documented values; the body curves between them follow a Golf 8 side view.
export function carSvg(ref, s) {
  const L = ref.lengthM, H = ref.heightM, WB = ref.wheelbaseM, FO = ref.frontOverhangM, R = ref.wheelDiameterM / 2;
  const xr = L - FO - WB, xf = L - FO;
  // Wheel arch over a wheel centred at cx, walked from its front edge to its rear edge.
  const arch = (cx) => {
    const ra = R + 0.045, pts = [[cx + ra, 0.24]];
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI;
      pts.push([cx + Math.cos(a) * ra, R + Math.sin(a) * ra]);
    }
    pts.push([cx - ra, 0.24]);
    return pts;
  };
  const kx = L / 4.284, ky = H / 1.491;
  const P = (pts) => pts.map(([x, y]) => [x * kx, y * ky]);
  const outline = [
    ...P([
      [0.07, 0.3], [0.0, 0.46], [0.01, 0.64], [0.04, 0.83], [0.1, 1.17], [0.2, 1.37], [0.38, 1.465],
      [0.9, 1.491], [1.7, 1.485], [2.02, 1.44], [2.72, 1.0], [3.3, 0.91], [3.85, 0.83], [4.17, 0.75],
      [4.27, 0.62], [4.284, 0.46], [4.25, 0.32], [4.15, 0.25],
    ]),
    ...arch(xf),
    ...arch(xr),
    ...P([[0.12, 0.25]]),
  ].map(([x, y]) => [x - L / 2, y]);
  const wheels = [xr, xf].map((cx) => circle((cx - L / 2) * s, -R * s, R * s)).join("");
  return { widthM: L, d: poly(outline, s) + wheels };
}
