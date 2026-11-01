// Chapter 3: step chart of the record weight over time. Gaps longer than 30 years are drawn as a marked axis break
// so the modern era is readable; the break is labelled with its length.
import { fmt, lbToKg, milestones } from "../lib/model.js";

const W = 1000, H = 500, L = 66, R = 74, T = 34, B = 52;
const BREAK_YEARS = 30, BREAK_PX = 34;

export function renderStepChart(el, { steps, data }) {
  const endYear = Number(data.dataLastUpdated.slice(0, 4)) + 1;
  // Split into segments at long gaps.
  const segs = [[steps[0]]];
  for (let i = 1; i < steps.length; i++) {
    if (steps[i].year - steps[i - 1].year > BREAK_YEARS) segs.push([]);
    segs.at(-1).push(steps[i]);
  }
  const domains = segs.map((s, i) => [s[0].year - 2, i === segs.length - 1 ? endYear : s.at(-1).year + 4]);
  const span = domains.reduce((a, [a0, a1]) => a + (a1 - a0), 0);
  const usable = W - L - R - BREAK_PX * (segs.length - 1);
  let cursor = L;
  const ranges = domains.map(([a0, a1]) => {
    const w = Math.max(usable * ((a1 - a0) / span), usable * 0.1);
    const r = [cursor, cursor + w];
    cursor += w + BREAK_PX;
    return r;
  });
  // Rescale if min-width bumped the total.
  const k = (W - R - L) / (cursor - BREAK_PX - L);
  ranges.forEach((r) => { r[0] = L + (r[0] - L) * k; r[1] = L + (r[1] - L) * k; });
  const x = (year) => {
    const i = domains.findIndex(([a0, a1]) => year >= a0 && year <= a1);
    const [a0, a1] = domains[i], [p0, p1] = ranges[i];
    return p0 + ((year - a0) / (a1 - a0)) * (p1 - p0);
  };
  const maxKg = Math.ceil((steps.at(-1).weightKg * 1.08) / 250) * 250;
  const y = (kg) => H - B - (kg / maxKg) * (H - T - B);

  // Step path, segment by segment; dashed connector across each break.
  let path = "", dashed = "";
  segs.forEach((seg, si) => {
    seg.forEach((s, i) => {
      const next = seg[i + 1];
      const xEnd = next ? x(next.year) : si === segs.length - 1 ? x(endYear) : ranges[si][1];
      path += `${i === 0 ? "M" : "L"}${x(s.year).toFixed(1)} ${y(s.weightKg).toFixed(1)}H${xEnd.toFixed(1)}`;
    });
    if (si < segs.length - 1) {
      const yy = y(seg.at(-1).weightKg).toFixed(1);
      dashed += `M${ranges[si][1].toFixed(1)} ${yy}H${x(segs[si + 1][0].year).toFixed(1)}`;
    }
  });

  const gridKg = [];
  for (let kg = 0; kg <= maxKg; kg += 250) gridKg.push(kg);
  const gridLb = [];
  for (let lb = 0; lbToKg(lb) <= maxKg; lb += 500) gridLb.push(lb);
  const yearTicks = domains.flatMap(([a0, a1], i) => {
    const step = a1 - a0 > 20 ? 10 : 5;
    const out = [];
    for (let yv = Math.ceil(a0 / step) * step; yv <= a1; yv += step) out.push(yv);
    return out.filter((yv) => i !== domains.length - 1 || yv < endYear);
  });

  const ms = milestones(steps);
  const thresholds = [1000, 2000, 3000].filter((lb) => lbToKg(lb) < maxKg);

  // Fastest ten-year gain between record steps.
  let fast = null;
  for (let i = 0; i < steps.length; i++)
    for (let j = i + 1; j < steps.length && steps[j].year - steps[i].year <= 10; j++) {
      const gain = steps[j].weightKg - steps[i].weightKg;
      if (!fast || gain > fast.gain) fast = { from: steps[i], to: steps[j], gain };
    }

  const breaks = segs.slice(0, -1).map((seg, si) => {
    const x0 = ranges[si][1], x1 = ranges[si + 1][0];
    const years = segs[si + 1][0].year - seg.at(-1).year;
    return `<g class="axis-break">
      <path d="M${x0 + 6} ${H - B + 8}l6 -16M${x0 + 14} ${H - B + 8}l6 -16"/>
      <text x="${(x0 + x1) / 2}" y="${y(seg.at(-1).weightKg) - 70}" text-anchor="middle">
        <tspan x="${(x0 + x1) / 2 + 40}" dy="0">${years} years without</tspan><tspan x="${(x0 + x1) / 2 + 40}" dy="15">a new record</tspan>
        <tspan x="${(x0 + x1) / 2 + 40}" dy="15">(${seg.at(-1).year}–${segs[si + 1][0].year}); axis</tspan><tspan x="${(x0 + x1) / 2 + 40}" dy="15">broken here</tspan>
      </text></g>`;
  });

  const labels = steps.filter((s) => s.featured).map((s) => {
    const px = x(s.year), py = y(s.weightKg);
    return `<text class="pt-label" transform="translate(${(px + 4).toFixed(1)} ${(py - 9).toFixed(1)}) rotate(-90)">${s.year} · ${fmt(s.weightKg, 0)} kg</text>`;
  });

  el.innerHTML = `<svg class="step-chart" viewBox="0 0 ${W} ${H}" role="img" aria-labelledby="chart-title chart-desc">
    <title id="chart-title">World-record pumpkin weight by year</title>
    <desc id="chart-desc">Step chart of ${steps.length} record weights from ${steps[0].year} (${fmt(steps[0].weightKg, 1)} kg) to ${steps.at(-1).year} (${fmt(steps.at(-1).weightKg, 1)} kg).</desc>
    ${fast ? `<rect class="fast-band" x="${x(fast.from.year)}" y="${T}" width="${x(fast.to.year) - x(fast.from.year)}" height="${H - T - B}"/>
      <text class="fast-label" x="${x(fast.from.year) + 6}" y="${T + 14}">Fastest decade: +${fmt(fast.gain, 0)} kg</text>
      <text class="fast-label" x="${x(fast.from.year) + 6}" y="${T + 29}">(${fast.from.year}–${fast.to.year})</text>` : ""}
    <g class="grid">${gridKg.map((kg) => `<line x1="${L}" x2="${W - R}" y1="${y(kg)}" y2="${y(kg)}"/><text class="axis-l" x="${L - 8}" y="${y(kg) + 4}">${fmt(kg)}</text>`).join("")}</g>
    <text class="axis-title" x="${L - 8}" y="${T - 14}" text-anchor="end">kg</text>
    <g class="grid-lb">${gridLb.map((lb) => `<line x1="${W - R}" x2="${W - R + 6}" y1="${y(lbToKg(lb))}" y2="${y(lbToKg(lb))}"/><text class="axis-r" x="${W - R + 10}" y="${y(lbToKg(lb)) + 4}">${fmt(lb)}</text>`).join("")}</g>
    <text class="axis-title" x="${W - R + 10}" y="${T - 14}">lb</text>
    ${thresholds.map((lb) => `<line class="threshold" x1="${L}" x2="${W - R}" y1="${y(lbToKg(lb))}" y2="${y(lbToKg(lb))}"/>`).join("")}
    <line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/>
    <g class="x-ticks">${yearTicks.map((yv) => `<line x1="${x(yv)}" x2="${x(yv)}" y1="${H - B}" y2="${H - B + 6}"/><text x="${x(yv)}" y="${H - B + 22}">${yv}</text>`).join("")}</g>
    ${breaks.join("")}
    <path class="step-dash" d="${dashed}"/>
    <path class="step-line" d="${path}"/>
    ${steps.map((s) => `<circle class="pt${s.featured ? " pt-featured" : ""}" cx="${x(s.year)}" cy="${y(s.weightKg)}" r="${s.featured ? 5 : 3.2}"><title>${s.year}, ${s.grower}: ${fmt(s.weightKg, 1)} kg</title></circle>`).join("")}
    ${labels.join("")}
  </svg>`;
  return { ms, fast };
}
