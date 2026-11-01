# The Giant Pumpkin Arms Race

A to-scale history of the world record for the heaviest pumpkin. One panorama shows a 1.75 m adult, a Labrador retriever and a 2020 Volkswagen Golf once, followed by the silhouette of every pumpkin that set the record since 1900, in year order, all at the same scale. The page also has a step chart of the record weight over time and a sources and methodology section.

Live page: <https://www.danielpradilla.info/projects/halloween-giant-pumpkins/>

The weights, dates, growers and events are verified records with a source link for each one. The pumpkin outlines are estimates: no record pumpkin has a published height, and only four have a published circumference. The page labels every size as an estimate and explains how it was calculated.

## Contents

- [What the page shows](#what-the-page-shows)
- [Data files](#data-files)
- [How pumpkin sizes are estimated](#how-pumpkin-sizes-are-estimated)
- [Run locally](#run-locally)
- [Validate the data](#validate-the-data)
- [Deploy](#deploy)
- [Updating the visualization for Halloween 2027 and beyond](#updating-the-visualization-for-halloween-2027-and-beyond)
- [Project structure](#project-structure)
- [License](#license)

## What the page shows

1. Lineup (Bigger. Heavier. Stranger.): the adult, the Labrador and the Golf, then all record pumpkins on one ground line. Pumpkins are evenly spaced in year order; the spacing does not represent time. The slider steps through the records one per notch, so it moves evenly even where years jump (1904 to 1976); later records show as dashed outlines. Checkboxes hide or show each reference object. The stage fits the screen width, and scrolls sideways below 22 px per metre so silhouettes stay legible on phones.
2. Selected record: weight in kilograms and pounds, comparisons with the reference masses, event, drawn size and sources. It opens on the current record.
3. The arms race: a step chart of all record steps. The 72 years between 1904 and 1976 with no new record are drawn as a marked axis break.
4. How big can they get?: breeding, genetics, cultivation, water and nutrients, and structural limits, each with sources.
5. Sources & methodology: status definitions, the size model, reference assumptions and a table of every record with its sources.

The look follows the Daniel app house style (`danielpradilla-app-style`): off-white page, system sans type at light weights, hairline borders, square controls, and colour reserved for interaction (blue) and the pumpkins (orange). Pumpkins and reference objects are flat silhouettes. Motion uses smooth CSS transitions on `transform` and `opacity` and stops when the browser asks for reduced motion.

The site is plain HTML, CSS and JavaScript modules with no build step and no runtime dependencies. Node.js 18 or later runs the validation script.

## Data files

All record and reference data lives in `src/data/`. The components read these files and contain no record values, so a new record needs a JSON edit only.

### `src/data/pumpkin-records.json`

| Field | Meaning |
| --- | --- |
| `dataLastUpdated` | Date of the latest data change (`YYYY-MM-DD`). The page shows it in the header caption and the footer. |
| `statusLabels` | Display text for each record status. |
| `silhouetteModel` | Parameters and sources for the size estimate (see below). |
| `records[]` | One entry per pumpkin that set a new world record. |

Each record:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Unique, `YEAR-surname`, for example `2026-wallace`. Also seeds the pumpkin's drawn shape. |
| `year` | yes | Year of the weigh-off. |
| `date` | no | `YYYY-MM-DD` when a source gives the date, otherwise `null`. |
| `weightLb` | yes | Weight in pounds as published. |
| `weightKg` | yes | Weight in kilograms. Use the published value when Guinness gives one; otherwise convert with 1 lb = 0.45359237 kg and round to 0.1 kg. |
| `weightKgBasis` | yes | `reported` (published kilograms) or `converted`. |
| `grower` | yes | Grower name(s) as given by the sources. |
| `country` | labelled records | Grower's country. `null` if no source states it. |
| `place` | no | Grower's home town or region. |
| `event` | no | Weigh-off name and location. `null` if no source states it. |
| `status` | yes | `guinness-world-record`, `gpc-world-record` or `historical-record` (see below). |
| `featured` | yes | `true` to label the point with year and weight in the step chart (about 15 labels fit). The lineup and the table show every record. The latest record must be featured. |
| `note` | no | Firsts, nicknames and disagreements between sources. |
| `dimensions` | yes (may be `{}`) | `circumferenceCm` with `circumferenceSource`, and/or `ottIn` with `ottSource`, when a source publishes them. |
| `sources[]` | yes | `{ "label", "url" }` for every source supporting the row. |
| `verifiedOn` | yes | Date you checked the sources. |

Status values:

- `guinness-world-record`: confirmed on a Guinness World Records page.
- `gpc-world-record`: listed as a world record by the Great Pumpkin Commonwealth (GPC) history or record list, with no Guinness page found.
- `historical-record`: weighed before any certifying body existed (William Warnock, 1900 and 1904).

Only pumpkins that beat the previous record belong in `records`. The validator rejects a record that is not heavier than the one before it.

### `src/data/reference-objects.json`

The adult, the Labrador and the Golf: dimensions, masses, the reasoning behind each value and the sources. The Golf is the Golf 8 1.5 eTSI (150 PS) from Volkswagen's August 2020 technical data: 4,284 mm long, 1,491 mm high, 2,619 mm wheelbase, 1,366 kg kerb weight.

## How pumpkin sizes are estimated

Giant pumpkin records are weights. Nobody publishes the height of a record pumpkin, so the drawings use this model:

1. Width, when Guinness World Records published a circumference: circumference ÷ π, assuming a round footprint. Four records have one (2023, 2025, both 2026 records).
2. Width, all other records: the weight–diameter fit from Hu, Richards and Alexeev (2011), W = 2070·L³, with W in newtons and L in metres, measured on 49 giant pumpkins up to about 1.4 m across. Widths above 1.4 m are extrapolations and the detail card says so.
3. Height: width × 0.6 for every pumpkin. Hu et al. report that small pumpkins are close to spherical (height/width ≈ 0.9) and that giants flatten by up to 50%. 0.6 is an illustrative choice inside that range.
4. The outline's lobes, lean, asymmetry and stem are generated from the record `id` and do not describe the real fruit.

The methodology section on the page compares the fit with the four measured circumferences. The fit draws those pumpkins 4–12% narrower than circumference ÷ π.

## Run locally

```sh
npm run serve
```

Open <http://127.0.0.1:8796/>. Any static file server works; `npm run serve` uses Python's `http.server`. Opening `index.html` from the file system does not work because the page loads its JSON with `fetch`.

## Validate the data

```sh
npm run validate
```

The script (`scripts/validate-data.mjs`) checks:

- required fields, ISO dates and source URLs on every record and reference object;
- that kilograms and pounds agree within 0.5 kg;
- that each record is heavier than the previous one;
- that the latest record is featured (labelled in the chart) and labelled records have a country;
- that no `verifiedOn` date is later than `dataLastUpdated`;
- the Golf geometry (wheelbase plus front overhang shorter than the car);
- the size model against its own published fit.

It prints the record count and the latest record on success, and exits with status 1 and a list of problems otherwise.

## Deploy

The site is static. `scripts/deploy.sh` publishes it with `rsync` and `ssh`:

```sh
DEPLOY_TARGET=user@host:path/to/halloween-giant-pumpkins npm run deploy
```

`npm run deploy` runs the validator first. The path after the colon is relative to the remote home directory. For danielpradilla.info it is the domain's `projects/halloween-giant-pumpkins` directory on the DreamHost account; the host and user are kept out of this repository.

The script:

1. refuses to run if `index.html`, `src/` or `public/` have uncommitted changes, because the deployed version is the commit hash;
2. copies `src/` and `public/` to `v/<commit>/` on the server and rewrites the asset paths in a staged copy of `index.html`;
3. uploads the versioned assets first and `index.html` last;
4. sets directories to 755 and files to 644.

danielpradilla.info sits behind Cloudflare, which caches JavaScript, CSS and JSON for up to 31 days. Each deploy uses a new `v/<commit>/` path, so a cached old file is never served under a new page. Older `v/` directories stay on the server; they are small, and the script never deletes remote files.

## Updating the visualization for Halloween 2027 and beyond

Giant pumpkin weigh-offs run from late September to mid October. Check for a new record after the main weigh-offs, usually by the end of October.

### 1. Find the latest official records

- Guinness World Records, Heaviest pumpkin: <https://www.guinnessworldrecords.com/world-records/heaviest-pumpkin>. Guinness also publishes a news article for each new record at <https://www.guinnessworldrecords.com/news>.
- Great Pumpkin Commonwealth (GPC), the body that certifies weigh-offs: record list at <https://gpc1.org/gpc-champions/guinness-records/guinness-pumpkins/>.
- BigPumpkins.com GPC weigh-off results by year: <https://www.bigpumpkins.com/ViewArticle.asp?id=132>, and its World Records index: <https://www.bigpumpkins.com/WorldRecords>.

The GPC and BigPumpkins.com lists can lag by months. In October 2026 neither listed the two new records yet, while Guinness did.

### 2. Check whether a pumpkin broke the world record

A pumpkin is a new world record only if:

- it is heavier than the last entry in `records` (the validator enforces this);
- a GPC-certified weigh-off weighed it and judges accepted its condition (no rot, holes or cracks into the cavity); and
- Guinness World Records or the GPC states that it is a new world record.

Local news often reports "record" pumpkins that are state, national or contest records. Use the weight from Guinness or the GPC, not a provisional figure from the day of the weigh-off.

### 3. Tell world records apart from annual competition winners

The winner of a big contest such as the Safeway World Championship Pumpkin Weigh-Off at Half Moon Bay is not necessarily a world record. The 2024 winner (2,471 lb, [AP](https://apnews.com/article/california-giant-pumpkin-winner-71cc6201bb732f057261d452bdf97ba5)) and the 2026 winner (2,389 lb, [M-A Chronicle](https://machronicle.com/half-moon-bay-celebrates-53rd-annual-pumpkin-weigh-off)) both weighed less than the record of their time. Add a pumpkin only when it beat the record. Two records in one season are possible: in October 2026 the record changed on 3 October and again on 10 October, and both are in the dataset.

### 4. Add the record to the JSON

Append an object to the end of `records` in `src/data/pumpkin-records.json`. Example with placeholder values; replace every value with sourced data:

```json
{
  "id": "2027-grower",
  "year": 2027,
  "date": "2027-10-09",
  "weightLb": 3200.5,
  "weightKg": 1451.7,
  "weightKgBasis": "reported",
  "grower": "Jane Grower",
  "country": "United States",
  "place": "Town, State",
  "event": "Name of the GPC weigh-off, Town, State",
  "status": "guinness-world-record",
  "featured": true,
  "note": "Anything a reader should know, such as a first or a disagreement between sources.",
  "dimensions": {
    "circumferenceCm": 650.2,
    "circumferenceSource": {
      "label": "Guinness World Records, article title (October 2027)",
      "url": "https://www.guinnessworldrecords.com/news/2027/10/..."
    }
  },
  "sources": [
    { "label": "Guinness World Records, Heaviest pumpkin (record page)", "url": "https://www.guinnessworldrecords.com/world-records/heaviest-pumpkin" },
    { "label": "Guinness World Records, article title (October 2027)", "url": "https://www.guinnessworldrecords.com/news/2027/10/..." }
  ],
  "verifiedOn": "2027-10-31"
}
```

Then set `"dataLastUpdated"` at the top of the file to the date of the change. If the chart labels start to crowd, set `featured` to `false` on an older record; it stays in the lineup, the chart and the sources table, without a label.

### 5. Record source URLs and verification dates

- Put every page that supports the weight, date, grower, event or status in `sources`. Prefer the Guinness record page and article, then the GPC, then contemporaneous news.
- Set `verifiedOn` to the day you opened the sources.
- If sources disagree, use the Guinness or GPC value and describe the disagreement in `note`.
- If you re-check the reference objects, update `retrievedOn` in `reference-objects.json`.

### 6. Handle missing physical dimensions

- If Guinness publishes a circumference, add `circumferenceCm` and `circumferenceSource`. The drawing then uses circumference ÷ π for the width.
- If a source publishes an OTT (over-the-top) measurement, add `ottIn` and `ottSource`. The detail card shows it; the drawing does not use it.
- Otherwise leave `dimensions` as `{}`. The width then comes from the weight–diameter fit and the page marks it as an estimate.
- Never enter a height or width that no source states.

### 7. Run the validation

```sh
npm run validate
```

Fix every reported problem. A successful run prints the new latest record, for example `✓ 36 records (16 featured), latest 2027 ...`.

### 8. Preview locally

```sh
npm run serve
```

Open <http://127.0.0.1:8796/> and check:

- the footer shows the new `dataLastUpdated`;
- the lineup introduction names the new record and its weight;
- the new pumpkin is the last one in the lineup and the detail card opens on it, with working source links;
- the step chart has a new final step;
- the new row is at the top of the sources table.

### 9. Build and deploy

There is no build step. Commit the change, then deploy:

```sh
git add src/data/pumpkin-records.json
git commit -m "Add 2027 world-record pumpkin"
git push
DEPLOY_TARGET=user@host:path/to/halloween-giant-pumpkins npm run deploy
```

### 10. Confirm that the public page shows the latest record

```sh
curl -s https://www.danielpradilla.info/projects/halloween-giant-pumpkins/ | grep -o 'v/[0-9a-f]*/src/main.js'
git rev-parse --short=10 HEAD
```

The hash in the first command must match the commit. Then open the page in a private window and repeat the checks from step 8. HTML is cached for up to 10 minutes; if the old page persists after that, re-run the deploy and check the server's `index.html`.

## Project structure

```text
halloween-giant-pumpkins/
├── index.html                 page structure, metadata, chapter 4 text
├── public/                    favicon and Open Graph image
├── scripts/
│   ├── validate-data.mjs      dataset checks (npm run validate)
│   └── deploy.sh              versioned rsync deploy (npm run deploy)
└── src/
    ├── main.js                loads the JSON and fills the page
    ├── lib/model.js           conversions, size estimate, comparisons, milestones
    ├── components/
    │   ├── pumpkin.js         procedural pumpkin silhouette
    │   ├── silhouettes.js     adult, Labrador and Golf drawn from their dimensions
    │   ├── lineup.js          lineup panorama, record slider, toggles
    │   ├── detail.js          selected-pumpkin card
    │   └── step-chart.js      record-weight step chart
    ├── data/
    │   ├── pumpkin-records.json
    │   └── reference-objects.json
    └── styles/
        └── app.css            page styles (danielpradilla-app-style tokens and components)
```

## License

Code: MIT, see [LICENSE](LICENSE). The record data is factual information compiled from the sources linked in `src/data/`. All illustrations are generated by the code in this repository.
