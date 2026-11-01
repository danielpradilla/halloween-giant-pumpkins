// Pure data helpers shared by the page and scripts/validate-data.mjs. No DOM access here.

export const KG_PER_LB = 0.45359237; // exact, international avoirdupois pound (1959)

export const lbToKg = (lb) => lb * KG_PER_LB;
export const kgToLb = (kg) => kg / KG_PER_LB;

// Records that changed the world record, oldest first. Competition winners that did not beat the record stay in the
// dataset (with another status) but are never drawn as record steps.
export const RECORD_STATUSES = ["guinness-world-record", "gpc-world-record", "historical-record"];

export function recordSteps(records) {
  return records
    .filter((r) => RECORD_STATUSES.includes(r.status))
    .sort((a, b) => a.year - b.year || a.weightKg - b.weightKg);
}

export const latestRecord = (records) => recordSteps(records).at(-1);

// Illustrative size from weight, using the published weight–diameter fit for giant pumpkins (Hu et al. 2011):
// W = a·L^b, W in newtons, L (horizontal diameter) in metres. With b = 3 every linear dimension scales with the
// cube root of mass (constant density and shape). Where Guinness published a measured circumference, the width is
// circumference / π instead (assumes a round footprint). Height is always width × an assumed height-to-width ratio:
// no record pumpkin has a published height.
export const STANDARD_GRAVITY = 9.80665;

export const fitWidthM = (weightKg, model) =>
  ((weightKg * STANDARD_GRAVITY) / model.coefficientNPerM3) ** (1 / model.exponent);

export function estimateSize(record, model) {
  const circ = record.dimensions?.circumferenceCm;
  const widthM = circ ? circ / 100 / Math.PI : fitWidthM(record.weightKg, model);
  return {
    widthM,
    heightM: widthM * model.heightToWidth,
    basis: circ ? "circumference" : "weight",
    extrapolated: !circ && widthM > model.fittedMaxDiameterM,
  };
}

// Comparisons used in the detail card and chapter 1. Reference masses come from reference-objects.json.
export function comparisons(record, refs, previous) {
  const out = {
    humans: record.weightKg / refs.human.massKg,
    labradors: record.weightKg / refs.dog.massKg,
    golfShare: record.weightKg / refs.car.curbWeightKg,
  };
  if (previous) {
    out.previous = previous;
    out.gainKg = record.weightKg - previous.weightKg;
    out.gainPct = (record.weightKg / previous.weightKg - 1) * 100;
  }
  return out;
}

// Facts derived from the steps for the step chart; nothing here is typed in by hand.
export function milestones(steps) {
  const firstOver = (kg) => steps.find((s) => s.weightKg >= kg);
  let biggestJump = null;
  let longestWait = null;
  for (let i = 1; i < steps.length; i++) {
    const gain = steps[i].weightKg - steps[i - 1].weightKg;
    if (!biggestJump || gain > biggestJump.gainKg) biggestJump = { record: steps[i], from: steps[i - 1], gainKg: gain };
    const wait = steps[i].year - steps[i - 1].year;
    if (!longestWait || wait > longestWait.years) longestWait = { from: steps[i - 1], to: steps[i], years: wait };
  }
  return {
    over1000lb: firstOver(lbToKg(1000)),
    over1000kg: firstOver(1000),
    over2000lb: firstOver(lbToKg(2000)),
    biggestJump,
    longestWait,
  };
}

export const fmt = (n, digits = 0) =>
  n.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// Show a number with exactly the decimals it was recorded with (821.23 stays 821.23, 1054 stays 1,054).
export const asPublished = (n) => fmt(n, (String(n).split(".")[1] ?? "").length);
