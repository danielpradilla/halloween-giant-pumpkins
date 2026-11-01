// Detail card for the selected pumpkin: weight, comparisons, drawn size and sources.
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

export function renderDetail(el, { record: r, size, steps, refs, data }) {
  const i = steps.findIndex((s) => s.id === r.id);
  const c = comparisons(r, refs, steps[i - 1]);
  const model = data.silhouetteModel;
  const metric = (label, value) => `<div><span class="metric-label">${label}</span><strong>${value}</strong></div>`;
  const width =
    size.basis === "circumference"
      ? `Width: the circumference that Guinness measured (${fmt(r.dimensions.circumferenceCm, 1)} cm) divided by π.`
      : `Width: estimated from the weight.${size.extrapolated ? ` This pumpkin is wider than the ${model.fittedMaxDiameterM} m pumpkins used to make the formula.` : ""}`;
  el.innerHTML = `
    <div class="detail-head">
      <p class="eyebrow">${i === steps.length - 1 ? "Current record" : "Record"} ${i + 1} of ${steps.length}</p>
      <h2>${r.year} · ${esc(r.grower)}</h2>
      <p>${[r.place, r.country ?? "country not given"].filter(Boolean).map(esc).join(", ")}${r.date ? ` · ${esc(longDate(r.date))}` : ""} · ${statusTag(r, data.statusLabels)}</p>
    </div>
    <div class="metric-grid">
      ${metric("Weight", `${asPublished(r.weightKg)} kg`)}
      ${metric("Pounds", `${asPublished(r.weightLb)} lb`)}
      ${metric(`Adults (${refs.human.massKg} kg each)`, `≈ ${fmt(c.humans, 1)}`)}
      ${metric(`Labradors (${refs.dog.massKg} kg each)`, `≈ ${fmt(c.labradors, 1)}`)}
      ${metric("Golf's weight", `${fmt(c.golfShare * 100, 0)}%`)}
      ${metric("More than the last record", c.previous ? `+${fmt(c.gainPct, 1)}%` : "First record")}
    </div>
    <div class="detail-grid">
      <div>
        <p><span class="metric-label">Weigh-off</span>${r.event ? esc(r.event) : "Not given in the sources."}</p>
        <p class="small">${r.weightKgBasis === "converted" ? "Weighed in pounds. The kilograms are converted." : "Kilograms from Guinness World Records."} The comparisons are by weight only. The Golf is still bigger.</p>
        ${r.note ? `<p class="note">${esc(r.note)}</p>` : ""}
      </div>
      <div>
        <p><span class="metric-label">Drawn size <span class="badge neutral">Estimate</span></span>${fmt(size.widthM, 2)} m wide, ${fmt(size.heightM, 2)} m tall</p>
        <ul class="small"><li>${width}</li><li>Height: ${model.heightToWidth} × width. This is a guess.</li>${
          r.dimensions?.ottIn
            ? `<li>Growers measured ${r.dimensions.ottIn} in (${fmt(r.dimensions.ottIn * 2.54, 0)} cm) "over the top": around the pumpkin plus two tapes over it. <a href="${esc(r.dimensions.ottSource.url)}">Source</a></li>`
            : ""
        }</ul>
      </div>
      <div>
        <p><span class="metric-label">Sources (checked ${esc(r.verifiedOn)})</span></p>
        <ul class="small">${sourceLinks(r.sources)}</ul>
      </div>
    </div>`;
}
