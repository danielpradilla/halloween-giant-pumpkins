// The lineup: the adult, the Labrador and the Golf once on the left, then every record pumpkin in year order on
// one ground line at one physical scale. Horizontal spacing is by order, not by time. The slider steps through the
// records one at a time (evenly, whatever the gap in years); selecting a pumpkin fills the detail card.
import { pumpkinPath } from "./pumpkin.js";
import { humanSvg, dogSvg, carSvg } from "./silhouettes.js";
import { asPublished, estimateSize, fmt } from "../lib/model.js";
import { renderDetail } from "./detail.js";

const GUTTER_L = 46; // px for the height ruler
const GUTTER_R = 12;
const LABEL_BAND = 44; // px under the ground for the year labels
const TOP_PAD = 22; // px above the tallest object for the selected weight label
const MIN_PX_PER_M = 22; // below this the stage scrolls sideways instead of shrinking
const OVERLAP = 0.62; // centre spacing as a share of the two neighbours' mean width
const MIN_STEP_M = 0.62;
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountLineup(root, { data, refs, steps }) {
  const sizes = new Map(steps.map((r) => [r.id, estimateSize(r, data.silhouetteModel)]));
  const els = {
    scroll: root.querySelector('[data-slot="lineup"]'),
    range: root.querySelector("#year-range"),
    out: root.querySelector("#year-out"),
    note: root.querySelector('[data-slot="scale-note"]'),
    detail: document.querySelector('[data-slot="detail"]'),
    toggles: [...root.querySelectorAll("[data-ref]")],
  };
  const first = steps[0], last = steps.at(-1);
  // upto: index of the latest record reached on the timeline (two records can share a year).
  const state = { upto: steps.length - 1, selected: last.id, s: 0 };

  // Layout in metres, independent of screen size.
  const human = humanSvg(refs.human, 1), dog = dogSvg(refs.dog, 1), car = carSvg(refs.car, 1);
  const refX = { human: 0.15 + human.widthM / 2 };
  refX.dog = refX.human + human.widthM / 2 + 0.2 + dog.widthM / 2;
  refX.car = refX.dog + dog.widthM / 2 + 0.25 + car.widthM / 2;
  const pkX = new Map();
  let x = refX.car + car.widthM / 2 + 0.9 + sizes.get(first.id).widthM / 2;
  steps.forEach((r, i) => {
    if (i > 0) {
      const a = sizes.get(steps[i - 1].id).widthM, b = sizes.get(r.id).widthM;
      x += Math.max(((a + b) / 2) * OVERLAP, MIN_STEP_M);
    }
    pkX.set(r.id, x);
  });
  const totalM = x + sizes.get(last.id).widthM / 2 + 0.2;
  const tallestM = Math.max(refs.human.heightM, refs.car.heightM, ...[...sizes.values()].map((z) => z.heightM * 1.2));

  els.range.min = 0;
  els.range.max = steps.length - 1;

  function draw() {
    const avail = els.scroll.clientWidth - GUTTER_L - GUTTER_R;
    const s = Math.max(avail / totalM, MIN_PX_PER_M);
    state.s = s;
    const groundY = TOP_PAD + Math.ceil((tallestM + 0.15) * s);
    const H = groundY + LABEL_BAND, W = Math.ceil(totalM * s) + GUTTER_L + GUTTER_R;
    const X = (m) => (GUTTER_L + m * s).toFixed(1);

    const ruler = [];
    for (let m = 0; m <= tallestM + 0.01; m += 0.5) {
      const y = (groundY - m * s).toFixed(1);
      const major = m % 1 === 0;
      ruler.push(`<line x1="${GUTTER_L - (major ? 10 : 6)}" x2="${GUTTER_L - 2}" y1="${y}" y2="${y}"/>` +
        (major ? `<text x="${GUTTER_L - 13}" y="${(+y + 4).toFixed(1)}">${m} m</text>` : ""));
    }

    // Labels sit above each silhouette, where neighbouring references never overlap.
    const refShape = (key, fn, label) => {
      const g = fn(refs[key], s);
      return `<g class="ref ref-${key}" data-ref-shape="${key}" transform="translate(${X(refX[key])} ${groundY})">
        <path d="${g.d}"/>${s >= 30 ? `<text class="ref-label" y="${(-refs[key].heightM * s - 6).toFixed(1)}">${label}</text>` : ""}</g>`;
    };

    // Right-to-left so smaller, earlier pumpkins overlap the larger ones behind them.
    const pumpkins = steps.slice().reverse().map((r) => {
      const { widthM, heightM } = sizes.get(r.id);
      const d = pumpkinPath({ seed: r.id, w: widthM * s, h: heightM * s });
      const half = (widthM * s) / 2;
      return `<g class="pk" data-id="${r.id}" transform="translate(${X(pkX.get(r.id))} ${groundY})" role="button" tabindex="-1">
        <rect class="pk-hit" x="${(-Math.min(half, MIN_STEP_M * s / 2)).toFixed(1)}" y="0" width="${Math.min(2 * half, MIN_STEP_M * s).toFixed(1)}" height="${LABEL_BAND}"/>
        <path class="pk-ghost" d="${d}"/>
        <path class="pk-shape" d="${d}"/>
        <line class="pk-mark" x1="${(-half).toFixed(1)}" x2="${half.toFixed(1)}" y1="3" y2="3"/>
        <text class="pk-weight" y="${(-heightM * s * 1.2 - 6).toFixed(1)}">${asPublished(r.weightKg)} kg</text>
        <text class="pk-year" transform="translate(4 9) rotate(-90)">${r.year}</text>
      </g>`;
    });

    els.scroll.innerHTML = `<svg class="lineup-svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-labelledby="lineup-title">
      <g class="ruler" aria-hidden="true"><line x1="${GUTTER_L - 2}" x2="${GUTTER_L - 2}" y1="${groundY}" y2="${(groundY - Math.floor(tallestM / 0.5) * 0.5 * s).toFixed(1)}"/>${ruler.join("")}</g>
      <g aria-hidden="true">
        ${refShape("car", carSvg, "VW Golf 8")}
        ${refShape("dog", dogSvg, "Labrador")}
        ${refShape("human", humanSvg, "Adult")}
      </g>
      ${pumpkins.join("")}
      <line class="ground-line" x1="${GUTTER_L - 2}" x2="${W}" y1="${groundY}" y2="${groundY}"/>
    </svg>`;
    els.note.textContent =
      `Scale: 1 m = ${s.toFixed(0)} px on this screen, the same for every object. Pumpkins are in year order, evenly spaced; the gaps do not represent time. ` +
      `Weights are verified. Pumpkin widths come from a measured circumference where Guinness published one, otherwise from a published weight–diameter fit; heights are illustrative.`;
    update({ instant: true });
  }

  function update({ instant = false } = {}) {
    const svg = els.scroll.querySelector("svg");
    svg.classList.toggle("is-instant", instant);
    steps.forEach((r, i) => {
      const g = svg.querySelector(`.pk[data-id="${r.id}"]`);
      const grown = i <= state.upto;
      const sel = r.id === state.selected;
      g.classList.toggle("is-future", !grown);
      g.classList.toggle("is-selected", sel);
      g.setAttribute("aria-pressed", String(sel));
      g.setAttribute("tabindex", sel ? "0" : "-1");
      g.setAttribute("aria-label", `${r.year}, ${r.grower}, ${fmt(r.weightKg, 1)} kilograms${grown ? "" : ", not yet reached on the timeline"}`);
    });
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove("is-instant")));
    const cur = steps[state.upto];
    els.range.value = state.upto;
    els.range.setAttribute("aria-valuetext", `${cur.year}, ${cur.grower}, ${fmt(cur.weightKg, 1)} kilograms`);
    els.out.textContent = `${cur.year} · record ${asPublished(cur.weightKg)} kg`;
    const r = steps.find((z) => z.id === state.selected);
    renderDetail(els.detail, { record: r, size: sizes.get(r.id), steps, refs, data });
    // Keep the selection visible when the stage is wider than the screen. A fresh draw starts at the left edge,
    // so narrow screens open on the reference objects.
    if (instant) return;
    const cx = GUTTER_L + pkX.get(r.id) * state.s, view = els.scroll;
    if (cx < view.scrollLeft + 60 || cx > view.scrollLeft + view.clientWidth - 60)
      view.scrollTo({ left: cx - view.clientWidth / 2, behavior: reducedMotion() ? "auto" : "smooth" });
  }

  function setIndex(i) {
    state.upto = i;
    state.selected = steps[i].id;
    update();
  }

  function select(id, { focus = false } = {}) {
    state.selected = id;
    state.upto = Math.max(state.upto, steps.findIndex((r) => r.id === id));
    update();
    if (focus) els.scroll.querySelector(`.pk[data-id="${id}"]`)?.focus({ preventScroll: true });
  }

  els.range.addEventListener("input", () => setIndex(Number(els.range.value)));
  for (const t of els.toggles)
    t.addEventListener("change", () => els.scroll.querySelector(`[data-ref-shape="${t.dataset.ref}"]`).classList.toggle("is-hidden", !t.checked));

  els.scroll.addEventListener("click", (e) => {
    const g = e.target.closest(".pk");
    if (g) select(g.dataset.id);
  });
  els.scroll.addEventListener("keydown", (e) => {
    const g = e.target.closest(".pk");
    if (!g) return;
    const i = steps.findIndex((r) => r.id === g.dataset.id);
    const go = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: steps.length - 1 }[e.key];
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(g.dataset.id); }
    else if (go != null && steps[go]) { e.preventDefault(); select(steps[go].id, { focus: true }); }
  });

  let lastW = 0;
  new ResizeObserver(() => {
    const w = els.scroll.clientWidth;
    if (Math.abs(w - lastW) < 8) return;
    lastW = w;
    draw();
    for (const t of els.toggles) if (!t.checked) els.scroll.querySelector(`[data-ref-shape="${t.dataset.ref}"]`).classList.add("is-hidden");
  }).observe(els.scroll);
}
