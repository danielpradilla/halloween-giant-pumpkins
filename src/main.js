// Entry point: loads the two data files and fills the page. All record-specific text comes from src/data/*.json,
// so a new record only needs a JSON edit.
import { asPublished, comparisons, fitWidthM, fmt, latestRecord, milestones, recordSteps } from "./lib/model.js";
import { mountLineup } from "./components/lineup.js";
import { renderStepChart } from "./components/step-chart.js";
import { esc, longDate, sourceLinks, statusTag } from "./components/detail.js";

const slot = (name) => document.querySelectorAll(`[data-slot="${name}"]`);
const fill = (name, html) => slot(name).forEach((el) => (el.innerHTML = html));

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
const c = comparisons(latest, refs, steps.at(-2));

fill("updated", esc(longDate(data.dataLastUpdated)));
fill("year", String(new Date().getFullYear()));
fill("toggle-human", `Adult (${fmt(refs.human.heightM, 2)} m)`);
fill("toggle-dog", `Labrador (${fmt(refs.dog.heightM * 100)} cm)`);
fill("toggle-car", `VW Golf (${fmt(refs.car.lengthM, 2)} m)`);

fill(
  "lineup-lede",
  `All ${steps.length} pumpkins that set the world record since ${first.year}, drawn at the same scale as a Labrador, an adult and a Volkswagen Golf. ` +
    `The current record is ${esc(latest.grower)}'s ${asPublished(latest.weightKg)} kg (${asPublished(latest.weightLb)} lb) pumpkin from ${latest.year}. ` +
    `Drag the slider or select a pumpkin.`,
);

// The chart is drawn first so that it can follow the lineup from the first draw.
const { setCurrent } = renderStepChart(slot("step-chart")[0], { steps, data });
const lineupEl = document.querySelector("#lineup");
lineupEl.addEventListener("recordchange", (e) => setCurrent(e.detail.upto, e.detail.selected));
mountLineup(lineupEl, { data, refs, steps });

const jump = milestones(steps).biggestJump;
fill(
  "arms-lede",
  `The record went from ${fmt(first.weightKg, 1)} kg in ${first.year} to ${asPublished(latest.weightKg)} kg in ${latest.year}, ` +
    `${fmt(latest.weightKg / first.weightKg, 1)} times heavier. The biggest single jump was ${fmt(jump.gainKg, 1)} kg, in ${jump.record.year}.`,
);

fill(
  "finale",
  `A pumpkin is a fruit. The heaviest one weighs ${asPublished(latest.weightKg)} kg, more than the ${fmt(refs.car.curbWeightKg)} kg Golf. ` +
    `It grew from one seed in one season.`,
);

// Sources and methods
const circRows = steps.filter((r) => r.dimensions?.circumferenceCm);
const gaps = circRows.map((r) => (1 - fitWidthM(r.weightKg, model) / (r.dimensions.circumferenceCm / 100 / Math.PI)) * 100);
const tag = (status) => statusTag({ status }, data.statusLabels);
fill(
  "method",
  `<article class="explain-panel">
    <h3>Records</h3>
    <p>${steps.length} pumpkins, ${first.year} to ${latest.year}. The list only has pumpkins that beat the record. Each row in the table below links to its sources. Sources checked on ${esc(longDate(refs.retrievedOn))}.</p>
    <ul>
      <li>${tag("guinness-world-record")} on a Guinness World Records page.</li>
      <li>${tag("gpc-world-record")} on the record list of the Great Pumpkin Commonwealth (GPC), the group that runs the official weigh-offs.</li>
      <li>${tag("historical-record")} weighed before anyone certified records.</li>
    </ul>
  </article>
  <article class="explain-panel" id="method-sizes">
    <h3>Sizes</h3>
    <p>Records give weight, not size. So the drawings estimate the size:</p>
    <ul>
      <li>Width, ${circRows.length} pumpkins: the circumference that Guinness measured, divided by π.</li>
      <li>Width, the others: from weight, with a formula from <a href="${esc(model.fitSource.url)}">Hu et al. (2011)</a>: weight in newtons (kg × 9.8) = ${model.coefficientNPerM3} × width³ in meters.</li>
      <li>Height: ${model.heightToWidth} × width. This is a guess. No source gives a height.</li>
    </ul>
    <p>For the ${circRows.length} measured pumpkins, the formula gives widths ${fmt(Math.min(...gaps), 0)} to ${fmt(Math.max(...gaps), 0)}% smaller than the measurement.</p>
  </article>
  <article class="explain-panel">
    <h3>Labrador, adult and car</h3>
    <ul>
      <li>${esc(refs.dog.label)}: ${esc(refs.dog.basis)}</li>
      <li>${esc(refs.human.label)}: ${esc(refs.human.basis)}</li>
      <li>${esc(refs.car.model)}: ${fmt(refs.car.lengthM, 3)} m long, ${fmt(refs.car.heightM, 3)} m high, ${fmt(refs.car.curbWeightKg)} kg. ${esc(refs.car.basis)}</li>
    </ul>
  </article>`,
);

// Short link text for the table; the full source title shows on hover and in the detail card.
const SHORT = { "guinnessworldrecords.com": "Guinness", "gpc1.org": "GPC", "bigpumpkins.com": "BigPumpkins", "outsideonline.com": "Outside", "oregonstate.edu": "Oregon State", "sngpg.com": "SNGPG", "wikipedia.org": "Wikipedia", "pnwgpg.com": "PNWGPG" };
const shortName = (url) => Object.entries(SHORT).find(([host]) => new URL(url).hostname.endsWith(host))?.[1] ?? new URL(url).hostname;
// Repeated names get a number: "Guinness, Guinness 2".
const shortLinks = (sources) => {
  const seen = {};
  return sources
    .map((s) => {
      const name = shortName(s.url);
      seen[name] = (seen[name] ?? 0) + 1;
      return `<a href="${esc(s.url)}" title="${esc(s.label)}" rel="noopener">${esc(name)}${seen[name] > 1 ? ` ${seen[name]}` : ""}</a>`;
    })
    .join(", ");
};
const sentence = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);

fill(
  "records-table",
  `<table>
    <thead><tr><th scope="col">Date</th><th scope="col">Grower</th><th scope="col">Country</th><th scope="col" class="num-col">kg</th><th scope="col" class="num-col">lb</th><th scope="col">Status</th><th scope="col">Weigh-off and notes</th><th scope="col">Sources</th></tr></thead>
    <tbody>${steps
      .slice()
      .reverse()
      .map(
        (r) => `<tr>
          <td class="num">${r.date ? esc(r.date) : r.year}</td>
          <td>${esc(r.grower)}</td>
          <td>${r.country ? esc(r.country) : '<span class="muted">not given</span>'}</td>
          <td class="num num-col">${asPublished(r.weightKg)}${r.weightKgBasis === "converted" ? '<span class="muted" title="converted from pounds">*</span>' : ""}</td>
          <td class="num num-col">${asPublished(r.weightLb)}</td>
          <td>${statusTag(r, data.statusLabels)}</td>
          <td>${[r.event, r.note].filter(Boolean).map((t) => esc(sentence(t))).join(" ")}${
            r.dimensions?.circumferenceCm ? ` Circumference ${fmt(r.dimensions.circumferenceCm, 1)} cm (<a href="${esc(r.dimensions.circumferenceSource.url)}">Guinness</a>).` : ""
          }</td>
          <td>${shortLinks(r.sources)}</td>
        </tr>`,
      )
      .join("")}</tbody>
  </table>
  <p class="small muted table-foot">* Converted from pounds.</p>`,
);

fill(
  "ref-sources",
  ["dog", "human", "car"]
    .map((k) => `<div class="explain-panel"><span class="metric-label">${esc(refs[k].label)}</span><ul>${sourceLinks(refs[k].sources)}</ul></div>`)
    .join(""),
);
