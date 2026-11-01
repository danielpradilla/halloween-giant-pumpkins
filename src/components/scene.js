// Static to-scale scene: objects stand side by side on one ground line. Used by the hero and chapter 1.
import { pumpkinSvg } from "./pumpkin.js";
import { humanSvg, dogSvg, carSvg } from "./silhouettes.js";

const GAP_M = 0.35;
const LABEL_BAND = 34;

/**
 * @param {Array<{kind: "human"|"dog"|"car"|"pumpkin", label?: string, record?: object, size?: object}>} objects
 * @param {object} refs  reference-objects.json
 * @param {object} o     { pxPerM, title }
 */
export function sceneSvg(objects, refs, { pxPerM: s, title }) {
  const parts = objects.map((o) => {
    if (o.kind === "human") return { ...o, ...humanSvg(refs.human, s), h: refs.human.heightM };
    if (o.kind === "dog") return { ...o, ...dogSvg(refs.dog, s), h: refs.dog.heightM };
    if (o.kind === "car") return { ...o, ...carSvg(refs.car, s), h: refs.car.heightM };
    const { widthM, heightM } = o.size;
    return {
      ...o,
      widthM,
      h: heightM * 1.18,
      svg: `<g class="pk is-static">${pumpkinSvg({ seed: o.record.id, w: widthM * s, h: heightM * s, uid: `s-${o.uid ?? o.record.id}` })}</g>`,
    };
  });
  const tallest = Math.max(...parts.map((p) => p.h));
  const totalM = parts.reduce((a, p) => a + p.widthM, 0) + GAP_M * (parts.length + 1);
  const stagger = s < 80; // narrow screens: alternate label rows so neighbours never collide
  const band = stagger ? LABEL_BAND + 14 : LABEL_BAND;
  const W = Math.ceil(totalM * s), groundY = Math.ceil((tallest + 0.25) * s), Hpx = groundY + band;
  let x = GAP_M;
  const body = parts
    .map((p, i) => {
      const cx = (x + p.widthM / 2) * s;
      x += p.widthM + GAP_M;
      const y = stagger && i % 2 ? 36 : 20;
      return `<g transform="translate(${cx.toFixed(1)} ${groundY})">${p.svg}${p.label ? `<text class="scene-label" y="${y}">${p.label}</text>` : ""}</g>`;
    })
    .join("");
  return `<svg class="scene-svg" viewBox="0 0 ${W} ${Hpx}" width="${W}" height="${Hpx}" role="img" aria-label="${title}">
    <rect class="ground" x="0" y="${groundY}" width="${W}" height="${band}"/>
    ${body}
    <line class="ground-line" x1="0" x2="${W}" y1="${groundY}" y2="${groundY}"/>
  </svg>`;
}

// Fit a list of widths (metres) into a pixel width, never below minPx per metre (the caller scrolls instead).
export const fitScale = (totalM, availPx, minPx, maxPx) => Math.min(Math.max(availPx / totalM, minPx), maxPx);
