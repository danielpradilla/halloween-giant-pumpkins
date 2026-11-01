// Detail card for the selected pumpkin: verified facts first, then comparisons, then the drawn size and sources.
import { asPublished, comparisons, fmt } from "../lib/model.js";

export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const longDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const statusTag = (r, labels) => {
  const tone = { "guinness-world-record": "success", "gpc-world-record": "warning", "historical-record": "neutral" }[r.status];
  return `<span class="badge ${tone}">${esc(labels[r.status])}</span>`;
};

export const sourceLinks = (sources) =>
  sources.map((s) => `<li><a href="${esc(s.url)}" rel="noopener">${esc(s.label)}</a></li>`).join("");

export function sizeText(r, size, model) {
  const dims = `${fmt(size.widthM, 2)} m wide × ${fmt(size.heightM, 2)} m tall`;
  const width =
    size.basis === "circumference"
      ? `Width = measured circumference ${fmt(r.dimensions.circumferenceCm, 1)} cm (Guinness) ÷ π, assuming a round footprint.`
      : `Width estimated from weight with the Hu et al. (2011) fit${size.extrapolated ? `, extrapolated beyond the ${model.fittedMaxDiameterM} m pumpkins it was fitted on` : ""}.`;
  return { dims, width, height: `Height = ${model.heightToWidth} × width, an illustrative ratio; no height has been published.` };
}

export function renderDetail(el, { record: r, size, steps, refs, data }) {
  const i = steps.findIndex((s) => s.id === r.id);
  const c = comparisons(r, refs, steps[i - 1]);
  const st = sizeText(r, size, data.silhouetteModel);
  const latest = i === steps.length - 1;
  const metric = (label, value) => `<div><span class="metric-label">${label}</span><strong>${value}</strong></div>`;
  el.innerHTML = `
    <div class="detail-head">
      <p class="eyebrow">${latest ? "Current world record" : "Selected record"} · ${i + 1} of ${steps.length}</p>
      <h2>${r.year} · ${esc(r.grower)}</h2>
      <p>${[r.place, r.country ?? "country not stated in the sources"].filter(Boolean).map(esc).join(", ")}${r.date ? ` · ${esc(longDate(r.date))}` : ""} · ${statusTag(r, data.statusLabels)}</p>
    </div>
    <div class="metric-grid">
      ${metric("Verified weight", `${asPublished(r.weightKg)} kg`)}
      ${metric("Pounds", `${asPublished(r.weightLb)} lb`)}
      ${metric(`Adults at ${refs.human.massKg} kg`, `≈ ${fmt(c.humans, 1)}`)}
      ${metric(`Labradors at ${refs.dog.massKg} kg`, `≈ ${fmt(c.labradors, 1)}`)}
      ${metric(`Share of the Golf's ${fmt(refs.car.curbWeightKg)} kg`, `${fmt(c.golfShare * 100, 0)}%`)}
      ${metric("Over the previous record", c.previous ? `+${fmt(c.gainPct, 1)}% (${c.previous.year}, ${fmt(c.previous.weightKg, 1)} kg)` : "first in the dataset")}
    </div>
    <div class="detail-grid">
      <div>
        <p><span class="metric-label">Event</span>${r.event ? esc(r.event) : "Not stated in the sources used."}</p>
        <p class="small">${r.weightKgBasis === "converted" ? "Officially weighed in pounds; kilograms converted (1 lb = 0.45359237 kg)." : "Kilograms as published by Guinness World Records; pounds as listed in the sources."} Weight comparisons only: a pumpkin heavier than the car is still smaller than it.</p>
        ${r.note ? `<p class="note">${esc(r.note)}</p>` : ""}
      </div>
      <div>
        <p><span class="metric-label">Drawn size <span class="badge neutral">Estimate</span></span>${st.dims}</p>
        <ul class="small"><li>${st.width}</li><li>${st.height}</li>${
          r.dimensions?.ottIn
            ? `<li>Reported over-the-top (OTT) measurement: ${r.dimensions.ottIn} in (${fmt(r.dimensions.ottIn * 2.54, 0)} cm). <a href="${esc(r.dimensions.ottSource.url)}">Source</a></li>`
            : ""
        }</ul>
      </div>
      <div>
        <p><span class="metric-label">Sources, checked ${esc(r.verifiedOn)}</span></p>
        <ul class="small">${sourceLinks(r.sources)}</ul>
      </div>
    </div>`;
}
