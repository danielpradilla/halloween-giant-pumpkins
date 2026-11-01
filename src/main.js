// Entry point: loads the two datasets and fills every data slot. All year- and record-specific text is derived from
// src/data/*.json, so a new record only needs a JSON edit.
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

// Lineup
fill(
  "lineup-lede",
  `All ${steps.length} pumpkins that set the world record since ${first.year}, in order, beside an adult, a Labrador and a Volkswagen Golf at the same scale. ` +
    `The current record, ${esc(latest.grower)}'s ${asPublished(latest.weightKg)} kg (${asPublished(latest.weightLb)} lb) pumpkin from ${latest.year}, ` +
    `weighs as much as ${fmt(c.humans, 0)} adults and ${fmt(c.golfShare * 100, 0)}% of the car. Select a pumpkin or drag the slider to step through the records.`,
);
// Record chart, drawn first so it can follow the lineup from the first draw.
const { fast, setCurrent } = renderStepChart(slot("step-chart")[0], { steps, data });
const lineupEl = document.querySelector("#lineup");
lineupEl.addEventListener("recordchange", (e) => setCurrent(e.detail.upto, e.detail.selected));
mountLineup(lineupEl, { data, refs, steps });
const ms = milestones(steps);
fill(
  "arms-lede",
  `The record rose from ${fmt(first.weightKg, 1)} kg in ${first.year} to ${asPublished(latest.weightKg)} kg in ${latest.year}, ` +
    `${fmt(latest.weightKg / first.weightKg, 1)} times heavier. ` +
    `First over 1,000 lb: ${ms.over1000lb.year} (${esc(ms.over1000lb.grower)}). First over 1,000 kg: ${ms.over1000kg.year} (${esc(ms.over1000kg.grower)}). ` +
    `The largest single jump was +${fmt(ms.biggestJump.gainKg, 1)} kg (${ms.biggestJump.from.year} to ${ms.biggestJump.record.year}); ` +
    `the fastest ten years added ${fmt(fast.gain, 0)} kg (${fast.from.year}–${fast.to.year}).`,
);

fill(
  "finale",
  `A pumpkin is a fruit. The heaviest one on record, ${asPublished(latest.weightKg)} kg, outweighs the ${fmt(refs.car.curbWeightKg)} kg Golf in the lineup, ` +
    `and it would take ${fmt(Math.ceil(c.humans))} adults on the other side of a scale to lift it. ` +
    `It grew from one seed in one season: Oregon State University advises allowing 130 or more days.`,
);

// Sources & methodology
const circRows = steps.filter((r) => r.dimensions?.circumferenceCm);
const counts = Object.fromEntries(Object.keys(data.statusLabels).map((k) => [k, steps.filter((r) => r.status === k).length]));
fill(
  "method",
  `<article class="explain-panel">
    <h3>Verified data</h3>
    <p>Weights, dates, growers and events for ${steps.length} record pumpkins, ${first.year}–${latest.year}. Each row in the table below links its own sources. Status labels:</p>
    <ul>
      <li>${statusTag({ status: "guinness-world-record" }, data.statusLabels)} ${counts["guinness-world-record"]} records confirmed on Guinness World Records pages.</li>
      <li>${statusTag({ status: "gpc-world-record" }, data.statusLabels)} ${counts["gpc-world-record"]} records listed as world records by the Great Pumpkin Commonwealth (GPC), the body that certifies giant-pumpkin weigh-offs; no Guinness page was found for them.</li>
      <li>${statusTag({ status: "historical-record" }, data.statusLabels)} ${counts["historical-record"]} weights reported before any certifying body existed.</li>
    </ul>
    <p>Only pumpkins that beat the previous record are included. Competition winners that did not, such as most Half Moon Bay champions, are left out. Where sources disagree (holder, date or weight), the record's note says so.</p>
  </article>
  <article class="explain-panel" id="method-sizes">
    <h3>Illustrative estimates</h3>
    <p>No record pumpkin has a published height, and only ${circRows.length} have a published circumference. The silhouettes are drawn as follows:</p>
    <ul>
      <li>Width, ${circRows.length} pumpkins: the circumference measured by Guinness World Records ÷ π, which assumes a round footprint.</li>
      <li>Width, all others: the weight–diameter fit from <a href="${esc(model.fitSource.url)}">${esc(model.fitSource.label)}</a>. ${esc(model.fitNote)} Under it, width grows with the cube root of weight (constant density and shape).</li>
      <li>Height: ${esc(model.heightNote)}</li>
      <li>The outline's lobes, lean and stem vary per pumpkin for character; they do not describe the real fruit.</li>
    </ul>
    <p>Check against the measured circumferences: ${circRows
      .map((r) => {
        const fit = fitWidthM(r.weightKg, model), meas = r.dimensions.circumferenceCm / 100 / Math.PI;
        return `${r.year} ${esc(r.grower)}: fit ${fmt(fit, 2)} m, circumference ÷ π ${fmt(meas, 2)} m (${fmt((fit / meas - 1) * 100, 0)}%)`;
      })
      .join("; ")}. The fit tends to draw record pumpkins narrower than their measured girth suggests.</p>
  </article>
  <article class="explain-panel">
    <h3>Reference assumptions</h3>
    <ul>
      <li>${esc(refs.human.label)}, ${fmt(refs.human.heightM, 2)} m, ${refs.human.massKg} kg. ${esc(refs.human.heightBasis)} ${esc(refs.human.massBasis)}</li>
      <li>${esc(refs.dog.label)}, ${fmt(refs.dog.heightM * 100)} cm at the withers, ${refs.dog.massKg} kg. ${esc(refs.dog.heightBasis)} ${esc(refs.dog.massBasis)}</li>
      <li>${esc(refs.car.model)}, ${fmt(refs.car.lengthM * 1000)} × ${fmt(refs.car.heightM * 1000)} mm, wheelbase ${fmt(refs.car.wheelbaseM * 1000)} mm, ${fmt(refs.car.curbWeightKg)} kg. ${esc(refs.car.dimensionsBasis)} ${esc(refs.car.massBasis)}</li>
    </ul>
    <p>Weight comparisons divide the record weight by these masses. They say nothing about volume: a pumpkin heavier than the car is still shorter and lower than it.</p>
  </article>
  <article class="explain-panel">
    <h3>Retrieval</h3>
    <p>Sources checked ${esc(longDate(refs.retrievedOn))}. Data last updated ${esc(longDate(data.dataLastUpdated))}. The datasets and a validation script are in the <a href="https://github.com/danielpradilla/halloween-giant-pumpkins">GitHub repository</a>.</p>
  </article>`,
);

fill(
  "records-table",
  `<table>
    <thead><tr><th scope="col">Date</th><th scope="col">Grower</th><th scope="col">Country</th><th scope="col" class="num-col">kg</th><th scope="col" class="num-col">lb</th><th scope="col">Status</th><th scope="col">Event and notes</th><th scope="col">Sources</th></tr></thead>
    <tbody>${steps
      .slice()
      .reverse()
      .map(
        (r) => `<tr>
          <td class="num">${r.date ? esc(r.date) : r.year}</td>
          <td>${esc(r.grower)}</td>
          <td>${r.country ? esc(r.country) : '<span class="muted">not stated</span>'}</td>
          <td class="num num-col">${asPublished(r.weightKg)}${r.weightKgBasis === "converted" ? '<span class="muted" title="converted from pounds">*</span>' : ""}</td>
          <td class="num num-col">${asPublished(r.weightLb)}</td>
          <td>${statusTag(r, data.statusLabels)}</td>
          <td>${r.event ? esc(r.event) : ""}${r.event && r.note ? ". " : ""}${r.note ? esc(r.note) : ""}${
            r.dimensions?.circumferenceCm ? ` Circumference ${fmt(r.dimensions.circumferenceCm, 1)} cm (<a href="${esc(r.dimensions.circumferenceSource.url)}">Guinness</a>).` : ""
          }</td>
          <td><ol class="src-list">${sourceLinks(r.sources)}</ol></td>
        </tr>`,
      )
      .join("")}</tbody>
  </table>
  <p class="small muted table-foot">* kilograms converted from the official pound weight.</p>`,
);

fill(
  "ref-sources",
  ["human", "dog", "car"]
    .map((k) => `<div class="explain-panel"><span class="metric-label">${esc(refs[k].label)}</span><ul>${sourceLinks(refs[k].sources)}</ul></div>`)
    .join(""),
);
