// Entry point: loads the two datasets and fills every data slot. All year- and record-specific text is derived from
// src/data/*.json, so a new record only needs a JSON edit.
import { asPublished, comparisons, estimateSize, fitWidthM, fmt, latestRecord, milestones, recordSteps } from "./lib/model.js";
import { sceneSvg, fitScale } from "./components/scene.js";
import { mountLineup } from "./components/lineup.js";
import { renderStepChart } from "./components/step-chart.js";
import { sizeText, sourceLinks, statusTag } from "./components/detail.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const slot = (name) => document.querySelectorAll(`[data-slot="${name}"]`);
const fill = (name, html) => slot(name).forEach((el) => (el.innerHTML = html));
const longDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

const [data, refs] = await Promise.all(
  ["pumpkin-records.json", "reference-objects.json"].map((f) =>
    fetch(new URL(`./data/${f}`, import.meta.url)).then((r) => {
      if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`);
      return r.json();
    }),
  ),
);

const steps = recordSteps(data.records);
const latest = latestRecord(data.records);
const first = steps[0];
const model = data.silhouetteModel;
const sizeOf = (r) => estimateSize(r, model);
const latestSize = sizeOf(latest);
const c = comparisons(latest, refs, steps.at(-2));

fill("updated", esc(longDate(data.dataLastUpdated)));
fill("toggle-human", `Human (${fmt(refs.human.heightM, 2)} m)`);
fill("toggle-dog", `Labrador (${fmt(refs.dog.heightM * 100)} cm)`);
fill("toggle-car", `VW Golf (${fmt(refs.car.lengthM, 2)} m)`);

// Hero
fill(
  "hero-lede",
  `The heaviest pumpkin on record weighed <b class="num">${asPublished(latest.weightKg)} kg</b> (${asPublished(latest.weightLb)} lb) in ${latest.year}. ` +
    `In ${first.year} the record was ${asPublished(first.weightLb)} lb (${fmt(first.weightKg, 1)} kg).`,
);
fill(
  "hero-caption",
  `To scale: the ${latest.year} record beside a ${fmt(refs.human.heightM, 2)} m adult. The weight is verified; the pumpkin's outline is an estimate.`,
);

// Chapter 1
fill(
  "meet-intro",
  `<p class="chapter-lede">The current record belongs to <b>${esc(latest.grower)}</b> (${esc(latest.country)}): ` +
    `${asPublished(latest.weightKg)} kg, weighed on ${esc(longDate(latest.date ?? `${latest.year}-01-01`))}` +
    `${latest.event ? ` at the ${esc(latest.event)}` : ""}. ${latest.note ? esc(latest.note) : ""} ` +
    `${statusTag(latest, data.statusLabels)} <a href="#sources" class="small">Sources</a></p>`,
);
fill(
  "meet-stats",
  [
    [`${asPublished(latest.weightKg)} kg`, `${asPublished(latest.weightLb)} lb, verified`],
    [`≈ ${fmt(c.humans, 0)}`, `adults at ${refs.human.massKg} kg`],
    [`≈ ${fmt(c.labradors, 0)}`, `Labradors at ${refs.dog.massKg} kg`],
    [`${fmt(c.golfShare * 100, 0)}%`, `of a Golf's ${fmt(refs.car.curbWeightKg)} kg kerb weight`],
    c.previous ? [`+${fmt(c.gainPct, 1)}%`, `on the previous record (${c.previous.year})`] : null,
  ]
    .filter(Boolean)
    .map(([v, l]) => `<div class="hud-chip stat"><span class="num">${v}</span><span class="label">${l}</span></div>`)
    .join(""),
);
const st = sizeText(latest, latestSize, model);
fill(
  "meet-caption",
  `Same scale for all four. Pumpkin drawn ${st.dims}: ${st.width} ${st.height} ` +
    `Golf: ${esc(refs.car.model)}, ${fmt(refs.car.lengthM, 3)} × ${fmt(refs.car.heightM, 3)} m.`,
);

function drawScenes() {
  const hero = slot("hero-figure")[0];
  const heroObjs = [{ kind: "human", label: `${fmt(refs.human.heightM, 2)} m` }, { kind: "pumpkin", record: latest, size: latestSize, label: `${latest.year} · ${asPublished(latest.weightKg)} kg`, uid: "hero" }];
  const heroM = 0.5 + latestSize.widthM + 0.35 * 3;
  const heroScale = Math.min(fitScale(heroM, hero.clientWidth - 24, 40, 400), (Math.min(innerHeight * 0.5, 420)) / 2.1);
  hero.querySelector("svg")?.remove();
  hero.insertAdjacentHTML("afterbegin", sceneSvg(heroObjs, refs, { pxPerM: heroScale, title: `The ${latest.year} record pumpkin beside an adult, to scale` }));

  const meet = slot("meet-scene")[0];
  const objs = [
    { kind: "human", label: "Adult" },
    { kind: "dog", label: "Labrador" },
    { kind: "pumpkin", record: latest, size: latestSize, label: `${latest.year} record`, uid: "meet" },
    { kind: "car", label: "VW Golf 8" },
  ];
  const totalM = 0.5 + refs.dog.heightM / 0.58 * 1.07 + latestSize.widthM + refs.car.lengthM + 0.35 * 5;
  const s = fitScale(totalM, meet.clientWidth, 34, 240);
  meet.innerHTML = sceneSvg(objs, refs, { pxPerM: s, title: `The ${latest.year} record pumpkin beside an adult, a Labrador and a Volkswagen Golf, to scale` });
}
drawScenes();
let lastW = innerWidth;
addEventListener("resize", () => {
  if (Math.abs(innerWidth - lastW) < 24) return;
  lastW = innerWidth;
  drawScenes();
});

// Chapter 2
const featured = steps.filter((r) => r.featured);
fill(
  "legend",
  `<span class="legend-item">${statusTag({ status: "guinness-world-record" }, data.statusLabels)}</span>
   <span class="legend-item">${statusTag({ status: "gpc-world-record" }, data.statusLabels)}</span>
   <span class="legend-item">${statusTag({ status: "historical-record" }, data.statusLabels)}</span>
   <span class="legend-item small"><svg width="26" height="14" aria-hidden="true"><path d="M2 12 Q13 -2 24 12Z" fill="none" stroke="currentColor" stroke-dasharray="3 3" stroke-width="1.6"/></svg> Not yet reached on the timeline</span>
   <span class="legend-item small">${featured.length} of the ${steps.length} record pumpkins are shown; the chart below has all of them.</span>`,
);
mountLineup(document.querySelector("#lineup"), { data, refs, steps });

// Chapter 3
const { fast } = renderStepChart(slot("step-chart")[0], { steps, data });
const ms = milestones(steps);
fill(
  "arms-lede",
  `${steps.length} pumpkins have held the record since ${first.year}. It rose from ${fmt(first.weightKg, 1)} kg to ${asPublished(latest.weightKg)} kg, ` +
    `${fmt(latest.weightKg / first.weightKg, 1)} times heavier. ` +
    `First over 1,000 lb: ${ms.over1000lb.year} (${esc(ms.over1000lb.grower)}). First over 1,000 kg: ${ms.over1000kg.year} (${esc(ms.over1000kg.grower)}). ` +
    `The largest single jump was +${fmt(ms.biggestJump.gainKg, 1)} kg (${ms.biggestJump.from.year} to ${ms.biggestJump.record.year}); ` +
    `the fastest ten years added ${fmt(fast.gain, 0)} kg (${fast.from.year}–${fast.to.year}).`,
);

// Finale
fill(
  "finale",
  `<p>A pumpkin is a fruit. The heaviest one on record, ${asPublished(latest.weightKg)} kg, outweighs the ${fmt(refs.car.curbWeightKg)} kg Golf drawn beside it, ` +
    `and it would take ${fmt(Math.ceil(c.humans))} adults on the other side of a scale to lift it. ` +
    `It grew from one seed in one season: Oregon State University advises allowing 130 or more days.</p>`,
);

// Sources & methodology
const circRows = steps.filter((r) => r.dimensions?.circumferenceCm);
fill(
  "method",
  `<article class="panel method">
    <h3>Verified data</h3>
    <p>Weights, dates, growers and events for ${steps.length} record pumpkins, ${first.year}–${latest.year}. Every row in the table below links its own sources. Status labels:</p>
    <ul class="small">
      <li>${statusTag({ status: "guinness-world-record" }, data.statusLabels)} confirmed on a Guinness World Records page.</li>
      <li>${statusTag({ status: "gpc-world-record" }, data.statusLabels)} listed as a world record by the Great Pumpkin Commonwealth (GPC), the body that certifies giant-pumpkin weigh-offs; no Guinness page was found.</li>
      <li>${statusTag({ status: "historical-record" }, data.statusLabels)} reported before any certifying body existed.</li>
    </ul>
    <p class="small">Only record-setting pumpkins are included. Competition winners that did not beat the record, such as most Half Moon Bay champions, are left out. Where sources disagree (holder, date or weight), the record's note says so.</p>
  </article>
  <article class="panel method" id="method-sizes">
    <h3>Illustrative estimates</h3>
    <p>No record pumpkin has a published height or width. The outlines are drawn as follows:</p>
    <ul class="small">
      <li><b>Width, ${circRows.length} pumpkins:</b> the circumference measured by Guinness World Records ÷ π, which assumes a round footprint.</li>
      <li><b>Width, all others:</b> the weight–diameter fit from <a href="${esc(model.fitSource.url)}">${esc(model.fitSource.label)}</a>. ${esc(model.fitNote)} Under it, width grows with the cube root of weight (constant density and shape).</li>
      <li><b>Height:</b> ${esc(model.heightNote)}</li>
      <li><b>Lobes, stems and colours</b> are drawn for character and vary per pumpkin; they do not describe the real fruit.</li>
    </ul>
    <p class="small">Check against the measured circumferences: ${circRows
      .map((r) => {
        const fit = fitWidthM(r.weightKg, model), meas = r.dimensions.circumferenceCm / 100 / Math.PI;
        return `${r.year} ${esc(r.grower)}: fit ${fmt(fit, 2)} m, circumference ÷ π ${fmt(meas, 2)} m (${fmt((fit / meas - 1) * 100, 0)}%)`;
      })
      .join("; ")}. The fit tends to draw record pumpkins narrower than their measured girth suggests.</p>
  </article>
  <article class="panel method">
    <h3>Reference assumptions</h3>
    <ul class="small">
      <li><b>${esc(refs.human.label)}, ${fmt(refs.human.heightM, 2)} m, ${refs.human.massKg} kg.</b> ${esc(refs.human.heightBasis)} ${esc(refs.human.massBasis)}</li>
      <li><b>${esc(refs.dog.label)}, ${fmt(refs.dog.heightM * 100)} cm at the withers, ${refs.dog.massKg} kg.</b> ${esc(refs.dog.heightBasis)} ${esc(refs.dog.massBasis)}</li>
      <li><b>${esc(refs.car.model)}, ${fmt(refs.car.lengthM * 1000)} × ${fmt(refs.car.heightM * 1000)} mm, wheelbase ${fmt(refs.car.wheelbaseM * 1000)} mm, ${fmt(refs.car.curbWeightKg)} kg.</b> ${esc(refs.car.dimensionsBasis)} ${esc(refs.car.massBasis)}</li>
    </ul>
    <p class="small">Weight comparisons divide the record weight by these masses. They say nothing about volume: a pumpkin heavier than the car is still shorter and lower than it.</p>
  </article>
  <article class="panel method">
    <h3>Retrieval</h3>
    <p class="small">Sources checked ${esc(longDate(refs.retrievedOn))}. Data last updated ${esc(longDate(data.dataLastUpdated))}. The datasets and a validation script are in the <a href="https://github.com/danielpradilla/halloween-giant-pumpkins">GitHub repository</a>.</p>
  </article>`,
);

fill(
  "records-table",
  `<table class="table">
    <thead><tr><th scope="col">Year</th><th scope="col">Grower</th><th scope="col">Country</th><th scope="col" class="num-col">kg</th><th scope="col" class="num-col">lb</th><th scope="col">Status</th><th scope="col">Event and notes</th><th scope="col">Sources</th></tr></thead>
    <tbody>${steps
      .slice()
      .reverse()
      .map(
        (r) => `<tr${r.featured ? ' class="is-featured"' : ""}>
          <td class="num">${r.date ? esc(r.date) : r.year}</td>
          <td>${esc(r.grower)}${r.featured ? ' <span class="tag tag-legendary" title="Shown in the lineup">Lineup</span>' : ""}</td>
          <td>${r.country ? esc(r.country) : '<span class="muted">not stated</span>'}</td>
          <td class="num num-col">${asPublished(r.weightKg)}${r.weightKgBasis === "converted" ? '<span class="muted" title="converted from pounds">*</span>' : ""}</td>
          <td class="num num-col">${asPublished(r.weightLb)}</td>
          <td>${statusTag(r, data.statusLabels)}</td>
          <td class="small">${r.event ? esc(r.event) : ""}${r.event && r.note ? ". " : ""}${r.note ? esc(r.note) : ""}${
            r.dimensions?.circumferenceCm ? ` Circumference ${fmt(r.dimensions.circumferenceCm, 1)} cm (<a href="${esc(r.dimensions.circumferenceSource.url)}">Guinness</a>).` : ""
          }</td>
          <td class="small"><ol class="src-list">${sourceLinks(r.sources)}</ol></td>
        </tr>`,
      )
      .join("")}</tbody>
  </table>
  <p class="small muted">* kilograms converted from the official pound weight.</p>`,
);

fill(
  "ref-sources",
  ["human", "dog", "car"]
    .map((k) => `<div><p class="label">${esc(refs[k].label)}</p><ul class="small">${sourceLinks(refs[k].sources)}</ul></div>`)
    .join(""),
);
