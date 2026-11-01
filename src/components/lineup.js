// The lineup: every record pumpkin in year order on one ground line at one physical scale, with the adult, the
// Labrador and the Golf standing to the right of the selected pumpkin. Horizontal spacing is by order, not by time.
// The slider steps through the records one at a time (evenly, whatever the gap in years); the references and the
// later pumpkins slide to follow it. Each change is announced as a "recordchange" event on the section.
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

  // Layout in metres, independent of screen size. Pumpkins have base positions in year order; the reference
  // objects stand to the right of the selected pumpkin, and every later pumpkin shifts right to make room.
  const refW = { human: humanSvg(refs.human, 1).widthM, dog: dogSvg(refs.dog, 1).widthM, car: carSvg(refs.car, 1).widthM };
  const REF_GAPS = { human: 0.3, dog: 0.2, car: 0.25 }; // gap before each reference, metres
  const base = [];
  let x = 0.3 + sizes.get(first.id).widthM / 2;
  steps.forEach((r, i) => {
    if (i > 0) {
      const a = sizes.get(steps[i - 1].id).widthM, b = sizes.get(r.id).widthM;
      x += Math.max(((a + b) / 2) * OVERLAP, MIN_STEP_M);
    }
    base.push(x);
  });

  function placeFor(k, shown) {
    const w = (i) => sizes.get(steps[i].id).widthM;
    const ref = {};
    let edge = base[k] + w(k) / 2;
    for (const key of ["human", "dog", "car"]) {
      if (!shown[key]) continue;
      ref[key] = edge + REF_GAPS[key] + refW[key] / 2;
      edge = ref[key] + refW[key] / 2;
    }
    const shift = k < steps.length - 1 && edge > base[k] + w(k) / 2 ? Math.max(edge + 0.6 + w(k + 1) / 2 - base[k + 1], 0) : 0;
    const pk = base.map((b, i) => (i > k ? b + shift : b));
    return { pk, ref, endM: Math.max(pk.at(-1) + w(steps.length - 1) / 2, edge) + 0.3 };
  }

  const allShown = { human: true, dog: true, car: true };
  const totalM = Math.max(...steps.map((_, k) => placeFor(k, allShown).endM));
  const tallestM = Math.max(refs.human.heightM, refs.car.heightM, ...[...sizes.values()].map((z) => z.heightM * 1.2));
  const shown = () => Object.fromEntries(els.toggles.map((t) => [t.dataset.ref, t.checked]));
  const selIndex = () => steps.findIndex((r) => r.id === state.selected);

  els.range.min = 0;
  els.range.max = steps.length - 1;

  function draw() {
    const avail = els.scroll.clientWidth - GUTTER_L - GUTTER_R;
    const s = Math.max(avail / totalM, MIN_PX_PER_M);
    state.s = s;
    state.groundY = TOP_PAD + Math.ceil((tallestM + 0.15) * s);
    const groundY = state.groundY;
    const H = groundY + LABEL_BAND, W = Math.ceil(totalM * s) + GUTTER_L + GUTTER_R;

    const ruler = [];
    for (let m = 0; m <= tallestM + 0.01; m += 0.5) {
      const y = (groundY - m * s).toFixed(1);
      const major = m % 1 === 0;
      ruler.push(`<line x1="${GUTTER_L - (major ? 10 : 6)}" x2="${GUTTER_L - 2}" y1="${y}" y2="${y}"/>` +
        (major ? `<text x="${GUTTER_L - 13}" y="${(+y + 4).toFixed(1)}">${m} m</text>` : ""));
    }

    // Labels sit above each silhouette, where neighbouring references never overlap.
    const refShape = (key, fn, label) =>
      `<g class="ref ref-${key}" data-ref-shape="${key}"><path d="${fn(refs[key], s).d}"/>${
        s >= 30 ? `<text class="ref-label" y="${(-refs[key].heightM * s - 6).toFixed(1)}">${label}</text>` : ""
      }</g>`;

    // Right-to-left so smaller, earlier pumpkins overlap the larger ones behind them.
    const pumpkins = steps.slice().reverse().map((r) => {
      const { widthM, heightM } = sizes.get(r.id);
      const d = pumpkinPath({ seed: r.id, w: widthM * s, h: heightM * s });
      const half = (widthM * s) / 2;
      return `<g class="pk" data-id="${r.id}" role="button" tabindex="-1">
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
      ${pumpkins.join("")}
      <g aria-hidden="true">
        ${refShape("human", humanSvg, "Adult")}
        ${refShape("dog", dogSvg, "Labrador")}
        ${refShape("car", carSvg, "VW Golf 8")}
      </g>
      <line class="ground-line" x1="${GUTTER_L - 2}" x2="${W}" y1="${groundY}" y2="${groundY}"/>
    </svg>`;
    els.note.textContent =
      `Scale: 1 m = ${s.toFixed(0)} px on this screen, the same for every object. Pumpkins are in year order, evenly spaced; the gaps do not represent time. ` +
      `The adult, the Labrador and the Golf stand beside the selected pumpkin. ` +
      `Weights are verified. Pumpkin widths come from a measured circumference where Guinness published one, otherwise from a published weight–diameter fit; heights are illustrative.`;
    update({ instant: true });
  }

  function update({ instant = false } = {}) {
    const svg = els.scroll.querySelector("svg");
    const { s, groundY } = state;
    svg.classList.toggle("is-instant", instant);
    const k = selIndex();
    const show = shown();
    const place = placeFor(k, show);
    const at = (el, m) => (el.style.transform = `translate(${(GUTTER_L + m * s).toFixed(1)}px, ${groundY}px)`);
    steps.forEach((r, i) => {
      const g = svg.querySelector(`.pk[data-id="${r.id}"]`);
      const grown = i <= state.upto;
      const sel = i === k;
      at(g, place.pk[i]);
      g.classList.toggle("is-future", !grown);
      g.classList.toggle("is-selected", sel);
      g.setAttribute("aria-pressed", String(sel));
      g.setAttribute("tabindex", sel ? "0" : "-1");
      g.setAttribute("aria-label", `${r.year}, ${r.grower}, ${fmt(r.weightKg, 1)} kilograms${grown ? "" : ", not yet reached on the timeline"}`);
    });
    for (const key of ["human", "dog", "car"]) {
      const g = svg.querySelector(`[data-ref-shape="${key}"]`);
      g.classList.toggle("is-hidden", !show[key]);
      if (show[key]) at(g, place.ref[key]);
    }
    if (instant) requestAnimationFrame(() => requestAnimationFrame(() => svg.classList.remove("is-instant")));
    const cur = steps[state.upto];
    els.range.value = state.upto;
    els.range.setAttribute("aria-valuetext", `${cur.year}, ${cur.grower}, ${fmt(cur.weightKg, 1)} kilograms`);
    els.out.textContent = `${cur.year} · record ${asPublished(cur.weightKg)} kg`;
    const r = steps[k];
    renderDetail(els.detail, { record: r, size: sizes.get(r.id), steps, refs, data });
    // On narrow screens keep the selected pumpkin and the references beside it in view.
    const left = GUTTER_L + (place.pk[k] - sizes.get(r.id).widthM / 2) * s;
    const right = GUTTER_L + Math.max(...Object.values(place.ref), place.pk[k]) * s + 40;
    const view = els.scroll;
    if (left < view.scrollLeft || right > view.scrollLeft + view.clientWidth)
      view.scrollTo({ left: left - 30, behavior: instant || reducedMotion() ? "auto" : "smooth" });
    // Other views (the step chart) follow the timeline through this event.
    root.dispatchEvent(new CustomEvent("recordchange", { detail: { upto: state.upto, selected: k } }));
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
  for (const t of els.toggles) t.addEventListener("change", () => update());

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
  }).observe(els.scroll);
}
