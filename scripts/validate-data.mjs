#!/usr/bin/env node
// Validates src/data/*.json before a deploy. Exits 1 and lists every problem it finds.
import { readFileSync } from "node:fs";
import { KG_PER_LB, RECORD_STATUSES, estimateSize, fitWidthM, recordSteps } from "../src/lib/model.js";

const load = (p) => JSON.parse(readFileSync(new URL(`../src/data/${p}`, import.meta.url), "utf8"));
const data = load("pumpkin-records.json");
const refs = load("reference-objects.json");
const errors = [];
const fail = (where, msg) => errors.push(`${where}: ${msg}`);

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const httpsOrHttp = (u) => /^https?:\/\/[^\s]+$/.test(u);
const checkSources = (where, sources) => {
  if (!Array.isArray(sources) || sources.length === 0) return fail(where, "needs at least one source");
  for (const s of sources) {
    if (!s?.label) fail(where, "source without label");
    if (!s?.url || !httpsOrHttp(s.url)) fail(where, `bad source url ${s?.url}`);
  }
};

// Top level
if (!isoDate.test(data.dataLastUpdated ?? "")) fail("dataLastUpdated", "must be YYYY-MM-DD");
for (const st of RECORD_STATUSES) if (!data.statusLabels?.[st]) fail("statusLabels", `missing label for ${st}`);
const m = data.silhouetteModel ?? {};
for (const k of ["coefficientNPerM3", "exponent", "fittedMaxDiameterM", "heightToWidth"])
  if (!(m[k] > 0)) fail("silhouetteModel", `${k} must be a positive number`);
checkSources("silhouetteModel.fitSource", [m.fitSource]);

// Records
const ids = new Set();
for (const r of data.records ?? []) {
  const at = `record ${r.id ?? "?"}`;
  if (!r.id || ids.has(r.id)) fail(at, "missing or duplicate id");
  ids.add(r.id);
  if (!Number.isInteger(r.year) || r.year < 1800 || r.year > Number(data.dataLastUpdated.slice(0, 4)))
    fail(at, `year ${r.year} out of range`);
  if (r.date != null && (!isoDate.test(r.date) || Number(r.date.slice(0, 4)) !== r.year)) fail(at, "date must be YYYY-MM-DD in the record year");
  if (!(r.weightLb > 0) || !(r.weightKg > 0)) fail(at, "weights must be positive");
  // Guinness rounds kg to 0.01–1 kg; conversions here are rounded to 0.1 kg.
  const diff = Math.abs(r.weightLb * KG_PER_LB - r.weightKg);
  if (diff > 0.5) fail(at, `kg (${r.weightKg}) and lb (${r.weightLb}) disagree by ${diff.toFixed(2)} kg`);
  if (!["reported", "converted"].includes(r.weightKgBasis)) fail(at, "weightKgBasis must be reported or converted");
  if (!r.grower) fail(at, "grower required");
  if (!RECORD_STATUSES.includes(r.status)) fail(at, `unknown status ${r.status}`);
  if (typeof r.featured !== "boolean") fail(at, "featured must be true or false");
  if (r.featured && !r.country) fail(at, "featured records need a country");
  if (!isoDate.test(r.verifiedOn ?? "")) fail(at, "verifiedOn must be YYYY-MM-DD");
  else if (r.verifiedOn > data.dataLastUpdated) fail(at, "verifiedOn is later than dataLastUpdated");
  checkSources(at, r.sources);
  const d = r.dimensions ?? {};
  if (d.circumferenceCm != null) {
    if (!(d.circumferenceCm > 0)) fail(at, "circumferenceCm must be positive");
    checkSources(`${at} circumference`, [d.circumferenceSource]);
  }
  if (d.ottIn != null) checkSources(`${at} OTT`, [d.ottSource]);
}

// Each record step must be heavier than the one before it, or it was not a record.
const steps = recordSteps(data.records ?? []);
for (let i = 1; i < steps.length; i++)
  if (steps[i].weightKg <= steps[i - 1].weightKg)
    fail(`record ${steps[i].id}`, `not heavier than the previous record ${steps[i - 1].id}`);
const featured = steps.filter((r) => r.featured);
if (featured.length < 2) fail("records", "feature at least two records for the lineup");
if (!steps.at(-1)?.featured) fail("records", "the latest record must be featured");

// Reference objects
for (const [key, fields] of Object.entries({
  human: ["heightM", "massKg"],
  dog: ["heightM", "massKg"],
  car: ["lengthM", "heightM", "wheelbaseM", "frontOverhangM", "wheelDiameterM", "curbWeightKg"],
})) {
  const o = refs[key];
  if (!o) { fail(`reference ${key}`, "missing"); continue; }
  for (const f of fields) if (!(o[f] > 0)) fail(`reference ${key}`, `${f} must be positive`);
  checkSources(`reference ${key}`, o.sources);
}
const car = refs.car ?? {};
if (car.wheelbaseM + car.frontOverhangM >= car.lengthM) fail("reference car", "wheelbase + front overhang must be shorter than length");

// Self-check of the size model: the published fit must reproduce itself (1.4 m ⇔ 2070·1.4³ N).
const w = fitWidthM((2070 * 1.4 ** 3) / 9.80665, { coefficientNPerM3: 2070, exponent: 3 });
if (Math.abs(w - 1.4) > 1e-9) fail("model", `fitWidthM self-check returned ${w}`);
const circ = estimateSize({ weightKg: 1, dimensions: { circumferenceCm: 100 * Math.PI } }, m);
if (Math.abs(circ.widthM - 1) > 1e-9 || circ.basis !== "circumference") fail("model", "circumference width self-check failed");

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n  ` + errors.join("\n  "));
  process.exit(1);
}
const latest = steps.at(-1);
console.log(
  `✓ ${data.records.length} records (${featured.length} featured), latest ${latest.year} ${latest.grower} ` +
    `${latest.weightKg} kg / ${latest.weightLb} lb, data updated ${data.dataLastUpdated}`,
);
