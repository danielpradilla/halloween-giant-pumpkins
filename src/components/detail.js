// Detail card for the selected pumpkin: verified facts first, then comparisons, then the illustrated size and sources.
import { asPublished, comparisons, fmt } from "../lib/model.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const dateText = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export const statusTag = (r, labels) => {
  const tone = { "guinness-world-record": "tag-ok", "gpc-world-record": "tag-watch", "historical-record": "tag-unknown" }[r.status];
  return `<span class="tag ${tone}">${esc(labels[r.status])}</span>`;
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
  const when = r.date ? dateText(r.date) : String(r.year);
  const ott = r.dimensions?.ottIn
    ? `<li>Reported over-the-top (OTT) measurement: ${r.dimensions.ottIn} in (${fmt(r.dimensions.ottIn * 2.54, 0)} cm), the sum of circumference and the two ground-to-ground arcs. <a href="${esc(r.dimensions.ottSource.url)}">Source</a></li>`
    : "";
  el.innerHTML = `
    <div class="detail-head">
      <span class="burst burst-gold" aria-hidden="true">${r.year}</span>
      <div>
        <p class="eyebrow">Selected pumpkin</p>
        <h3>${esc(r.grower)}</h3>
        <p class="muted">${[r.place, r.country].filter(Boolean).map(esc).join(", ")} · ${esc(when)}</p>
        <p>${statusTag(r, data.statusLabels)}</p>
      </div>
    </div>
    <div class="detail-grid">
      <section aria-label="Verified weight">
        <p class="label">Verified weight</p>
        <p class="detail-weight num">${asPublished(r.weightKg)} kg</p>
        <p class="num detail-lb">${asPublished(r.weightLb)} lb</p>
        <p class="muted small">${r.weightKgBasis === "converted" ? "Officially weighed in pounds; kilograms converted (1 lb = 0.45359237 kg)." : "Kilograms as published by Guinness World Records; pounds as listed in the sources."}</p>
        <p class="small"><b>Event:</b> ${r.event ? esc(r.event) : "not stated in the sources used"}</p>
      </section>
      <section aria-label="Comparisons">
        <p class="label">As heavy as</p>
        <ul class="compare-list">
          <li><span class="num">${fmt(c.humans, 1)}</span> adults at ${refs.human.massKg} kg each</li>
          <li><span class="num">${fmt(c.labradors, 1)}</span> Labradors at ${refs.dog.massKg} kg each</li>
          <li><span class="num">${fmt(c.golfShare * 100, 0)}%</span> of a ${esc(refs.car.model.replace(/, \d{4}$/, ""))}'s kerb weight (${fmt(refs.car.curbWeightKg)} kg)</li>
          ${c.previous ? `<li><span class="num">+${fmt(c.gainPct, 1)}%</span> on the previous record (${c.previous.year}, ${esc(c.previous.grower)}, ${fmt(c.previous.weightKg, 1)} kg)</li>` : "<li>The first record in this dataset.</li>"}
        </ul>
        <p class="muted small">Weight comparisons only. A heavier pumpkin is not a bigger object than the car: the Golf is ${fmt(refs.car.lengthM, 2)} m long.</p>
      </section>
      <section aria-label="Illustrated size">
        <p class="label">Drawn size <span class="tag tag-unknown">Estimate</span></p>
        <p class="num">${st.dims}</p>
        <ul class="small method-list"><li>${st.width}</li><li>${st.height}</li>${ott}</ul>
      </section>
    </div>
    ${r.note ? `<p class="detail-note">${esc(r.note)}</p>` : ""}
    <details class="detail-sources" open>
      <summary class="label">Sources for this record (checked ${esc(r.verifiedOn)})</summary>
      <ul>${sourceLinks(r.sources)}</ul>
    </details>`;
}
