// Chapter 2: every featured record pumpkin on one ground line, at one scale, with a year scrubber, Play history,
// reference toggles and a detail card. Reference objects stand beside the selected pumpkin; the car is parked behind it.
import { pumpkinSvg } from "./pumpkin.js";
import { humanSvg, dogSvg, carSvg } from "./silhouettes.js";
import { asPublished, estimateSize, fmt } from "../lib/model.js";
import { renderDetail } from "./detail.js";

const GROUND_BAND = 74; // px under the ground line for year and weight labels
const SKY_M = 0.45; // headroom above the tallest object, metres
const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountLineup(root, { data, refs, steps }) {
  const featured = steps.filter((r) => r.featured);
  const sizes = new Map(featured.map((r) => [r.id, estimateSize(r, data.silhouetteModel)]));
  const els = {
    scroll: root.querySelector('[data-slot="lineup"]'),
    ruler: root.querySelector('[data-slot="ruler"]'),
    range: root.querySelector("#year-range"),
    out: root.querySelector("#year-out"),
    ticks: root.querySelector('[data-slot="year-ticks"]'),
    play: root.querySelector('[data-action="play"]'),
    note: root.querySelector('[data-slot="scale-note"]'),
    detail: root.querySelector('[data-slot="detail"]'),
    toggles: [...root.querySelectorAll("[data-ref]")],
  };

  const state = {
    year: featured.at(-1).year,
    selected: featured.at(-1).id,
    show: { human: true, dog: true, car: true },
    timer: null,
  };
  let layout = null;

  // Range covers the featured years; positions snap to the latest record at or before the chosen year.
  els.range.min = featured[0].year;
  els.range.max = featured.at(-1).year;
  els.range.value = state.year;
  els.ticks.innerHTML = featured
    .map((r) => {
      const pct = ((r.year - featured[0].year) / (featured.at(-1).year - featured[0].year)) * 100;
      return `<span style="left:${pct.toFixed(2)}%"></span>`;
    })
    .join("") +
    `<b style="left:0">${featured[0].year}</b><b style="left:100%">${featured.at(-1).year}</b>`;

  const recordAt = (year) => featured.filter((r) => r.year <= year).at(-1) ?? featured[0];

  function computeScale() {
    const stageH = els.scroll.clientHeight;
    const tallest = Math.max(
      refs.human.heightM,
      refs.car.heightM,
      ...[...sizes.values()].map((s) => s.heightM * 1.18), // stem
    );
    // Height sets the scale; on narrow screens it is capped so the widest pumpkin and a person fit side by side.
    const widest = Math.max(...[...sizes.values()].map((s) => s.widthM));
    const byWidth = (els.scroll.clientWidth - 64) / (widest + refs.human.heightM * 0.8);
    const pxPerM = Math.max(Math.min((stageH - GROUND_BAND - 8) / (tallest + SKY_M), byWidth), 60);
    return { pxPerM, groundY: stageH - GROUND_BAND, stageH, stageW: els.scroll.clientWidth };
  }

  // Compact slots for every pumpkin; the selected one widens so the references fit beside and behind it.
  function slotsFor(selectedId) {
    const side = Math.max(state.show.human ? layout.refW.human + 0.25 : 0, state.show.dog ? layout.refW.dog + 0.2 : 0);
    let x = 1.0; // clear of the ruler
    const slots = new Map();
    for (const r of featured) {
      const { widthM } = sizes.get(r.id);
      const need = r.id === selectedId
        ? Math.max(widthM + 2 * side + 0.8, state.show.car ? refs.car.lengthM + 0.8 : 0, 1.6)
        : Math.max(widthM + 0.8, 1.6);
      slots.set(r.id, { centerM: x + need / 2, needM: need });
      x += need;
    }
    return { slots, totalM: x + 0.6 };
  }

  function draw() {
    layout = computeScale();
    const { pxPerM: s, groundY, stageH } = layout;
    const human = humanSvg(refs.human, s);
    const dog = dogSvg(refs.dog, s);
    const car = carSvg(refs.car, s);
    layout.refW = { human: human.widthM, dog: dog.widthM };
    // Widest possible lineup: any pumpkin selected with every reference shown.
    const maxM = Math.max(...featured.map((r) => slotsFor(r.id).totalM));
    const W = Math.ceil(maxM * s);
    const stars = Array.from({ length: Math.round(W / 60) }, (_, i) => {
      const x = (i * 97.3) % W, y = 8 + ((i * 53.7) % Math.max(groundY - 40, 20)) * 0.6;
      return `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${i % 3 === 0 ? 1.6 : 1}"/>`;
    }).join("");
    const meterTicks = Array.from({ length: Math.floor(maxM) + 1 }, (_, m) =>
      `<line x1="${m * s}" x2="${m * s}" y1="${groundY}" y2="${groundY + (m % 5 === 0 ? 10 : 5)}"/>`,
    ).join("");

    const items = featured
      .map((r) => {
        const { widthM, heightM } = sizes.get(r.id);
        const hitW = Math.max(widthM + 0.8, 1.6) * s;
        return `<g class="pk" data-id="${r.id}" role="button" tabindex="-1" aria-pressed="false">
          <rect class="pk-hit" x="${(-hitW / 2).toFixed(1)}" y="${(-heightM * s * 1.3).toFixed(1)}" width="${hitW.toFixed(1)}" height="${(heightM * s * 1.3 + GROUND_BAND - 6).toFixed(1)}"/>
          <g class="pk-body">${pumpkinSvg({ seed: r.id, w: widthM * s, h: heightM * s, uid: `l-${r.id}` })}</g>
          <g class="pk-ghostwrap">${pumpkinSvg({ seed: r.id, w: widthM * s, h: heightM * s, ghost: true })}</g>
          <rect class="pk-sel" x="-62" y="8" width="124" height="54" rx="6"/>
          <text class="pk-year" y="30">${r.year}</text>
          <text class="pk-weight" y="52">${asPublished(r.weightKg)} kg</text>
        </g>`;
      })
      .join("");

    els.scroll.innerHTML = `
      <svg class="lineup-svg" height="${stageH}" aria-labelledby="lineup-title">
        <g class="stars" aria-hidden="true">${stars}</g>
        <rect class="ground" x="0" y="${groundY}" width="${W}" height="${GROUND_BAND}"/>
        <g class="ref-slot car-layer" aria-hidden="true">${car.svg}</g>
        ${items}
        <g class="ref-slot ref-slot-human" aria-hidden="true">${human.svg}</g>
        <g class="ref-slot ref-slot-dog" aria-hidden="true">${dog.svg}</g>
        <line class="ground-line" x1="0" x2="${W}" y1="${groundY}" y2="${groundY}"/>
        <g class="ground-ticks" aria-hidden="true">${meterTicks}</g>
      </svg>`;
    drawRuler();
    els.note.innerHTML =
      `Scale: 1 m = ${s.toFixed(0)} px on this screen; every object shares it. Ground ticks every metre. ` +
      `Weights are verified records. Pumpkin widths come from a measured circumference where Guinness published one, otherwise from a published weight–diameter fit; heights are illustrative. <a href="#method-sizes">How sizes are estimated</a>.`;
    update({ instant: true });
  }

  function drawRuler() {
    const { pxPerM: s, groundY, stageH } = layout;
    const marks = [];
    let top = groundY;
    for (let m = 0; groundY - m * s > 6; m += 0.5) {
      top = groundY - m * s;
      marks.push(`<line x1="${m % 1 === 0 ? 4 : 9}" x2="16" y1="${top}" y2="${top}"/>` +
        (m % 1 === 0 || s > 120 ? `<text x="20" y="${top + 4}">${m} m</text>` : ""));
    }
    els.ruler.innerHTML = `<svg width="64" height="${stageH}" aria-hidden="true">
      <line x1="16" x2="16" y1="${groundY}" y2="${top}"/>${marks.join("")}</svg>`;
  }

  function update({ instant = false, grownNow = [] } = {}) {
    const svg = els.scroll.querySelector("svg");
    const { pxPerM: s, groundY } = layout;
    const { slots, totalM } = slotsFor(state.selected);
    svg.classList.toggle("is-instant", instant);
    svg.setAttribute("width", Math.ceil(totalM * s));
    const at = (el, xPx) => (el.style.transform = `translate(${xPx.toFixed(1)}px, ${groundY}px)`);
    for (const g of svg.querySelectorAll(".pk")) {
      const r = featured.find((x) => x.id === g.dataset.id);
      const grown = r.year <= state.year;
      at(g, slots.get(r.id).centerM * s);
      g.classList.toggle("is-ghost", !grown);
      const sel = r.id === state.selected;
      g.classList.toggle("is-selected", sel);
      g.setAttribute("aria-pressed", String(sel));
      g.setAttribute("tabindex", sel ? "0" : "-1");
      g.setAttribute("aria-label", `${r.year}, ${r.grower}, ${fmt(r.weightKg, 1)} kilograms${grown ? "" : ", not yet reached on the timeline"}`);
      if (grownNow.includes(r.id) && !instant && !reducedMotion()) {
        g.classList.remove("is-growing");
        void g.getBoundingClientRect();
        g.classList.add("is-growing");
      }
    }
    // The references stand beside the selected pumpkin; the car is parked behind it.
    const { widthM } = sizes.get(state.selected);
    const cx = slots.get(state.selected).centerM * s;
    const place = (sel, x, on) => {
      const el = svg.querySelector(sel);
      at(el, x);
      el.classList.toggle("is-hidden", !on);
    };
    place(".ref-slot-human", cx - (widthM / 2 + layout.refW.human / 2 + 0.2) * s, state.show.human);
    place(".ref-slot-dog", cx + (widthM / 2 + layout.refW.dog / 2 + 0.15) * s, state.show.dog);
    place(".car-layer", cx, state.show.car);
    if (instant) requestAnimationFrame(() => svg.classList.remove("is-instant"));

    els.range.value = state.year;
    els.range.style.setProperty("--pct", `${((state.year - featured[0].year) / (featured.at(-1).year - featured[0].year)) * 100}%`);
    els.out.textContent = `${state.year} · record ${fmt(recordAt(state.year).weightKg, 1)} kg`;
    const r = featured.find((x) => x.id === state.selected);
    renderDetail(els.detail, { record: r, size: sizes.get(r.id), steps, refs, data });
    // Centre the selection in the part of the stage not covered by the ruler.
    const ruler = els.ruler.offsetWidth;
    els.scroll.scrollTo({ left: cx - ruler - (els.scroll.clientWidth - ruler) / 2, behavior: instant || reducedMotion() ? "auto" : "smooth" });
  }

  function setYear(year, { select = true } = {}) {
    const before = state.year;
    state.year = Math.max(featured[0].year, Math.min(year, featured.at(-1).year));
    if (select) state.selected = recordAt(state.year).id;
    const grownNow = featured.filter((r) => r.year > before && r.year <= state.year).map((r) => r.id);
    update({ grownNow });
  }

  function select(id, { focus = false } = {}) {
    const r = featured.find((x) => x.id === id);
    state.selected = id;
    if (r.year > state.year) setYear(r.year, { select: false });
    else update();
    if (focus) els.scroll.querySelector(`.pk[data-id="${id}"]`)?.focus({ preventScroll: true });
  }

  function stop() {
    clearInterval(state.timer);
    state.timer = null;
    els.play.querySelector("span").textContent = "Play history";
    els.play.querySelector("use").setAttribute("href", "#i-play");
  }

  function play() {
    if (state.timer) return stop();
    // Start from the first record with everything after it ungrown.
    state.year = featured[0].year;
    state.selected = featured[0].id;
    update();
    els.play.querySelector("span").textContent = "Pause";
    els.play.querySelector("use").setAttribute("href", "#i-pause");
    let i = 0;
    state.timer = setInterval(() => {
      i += 1;
      if (i >= featured.length) return stop();
      setYear(featured[i].year);
    }, 1300);
  }

  els.range.addEventListener("input", () => { stop(); setYear(Number(els.range.value)); });
  els.play.addEventListener("click", play);
  for (const t of els.toggles)
    t.addEventListener("change", () => { state.show[t.dataset.ref] = t.checked; draw(); });

  els.scroll.addEventListener("click", (e) => {
    const g = e.target.closest(".pk");
    if (g) { stop(); select(g.dataset.id); }
  });
  els.scroll.addEventListener("keydown", (e) => {
    const g = e.target.closest(".pk");
    if (!g) return;
    const i = featured.findIndex((r) => r.id === g.dataset.id);
    const go = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: featured.length - 1 }[e.key];
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stop(); select(g.dataset.id); }
    else if (go != null && featured[go]) { e.preventDefault(); stop(); select(featured[go].id, { focus: true }); }
  });

  // Redraw when the stage size changes the scale.
  new ResizeObserver(() => {
    if (layout && (Math.abs(els.scroll.clientHeight - layout.stageH) > 1 || Math.abs(els.scroll.clientWidth - layout.stageW) > 40)) draw();
  }).observe(els.scroll);

  draw();
}
