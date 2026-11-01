# The Giant Pumpkin Arms Race

A to-scale picture of every pumpkin that set the world record for weight, from 1900 to today. A Labrador, an adult and a Volkswagen Golf stand next to the selected pumpkin for scale. A step chart shows how the record grew.

Live page: <https://www.danielpradilla.info/projects/halloween-giant-pumpkins/>

The weights come from Guinness World Records, the Great Pumpkin Commonwealth (GPC) and other sources. Each record links to its sources. Records give weight, not size, so the pumpkin sizes on the page are estimates. The page explains how.

The site is plain HTML, CSS and JavaScript. It has no build step and no dependencies. It uses the `danielpradilla-app-style` look.

## Files

- `src/data/pumpkin-records.json`: the records, one entry per record pumpkin.
- `src/data/reference-objects.json`: the Labrador, the adult and the Golf.
- `src/`: the page code. `index.html` is the page.
- `scripts/validate-data.mjs`: checks the data.
- `scripts/deploy.sh`: copies the site to the server.

## Run the site on your computer

```sh
npm run serve
```

Open <http://127.0.0.1:8796/>. You need a local server because the page loads its data with `fetch`.

## Check the data

```sh
npm run validate
```

The script needs Node.js 18 or later. It checks required fields, dates, links, the kg and lb values, and that each record is heavier than the one before.

## Updating the visualization for Halloween 2027 and beyond

Weigh-offs run from late September to mid October. Do this update at the end of October.

### 1. Find the latest records

- Guinness World Records: <https://www.guinnessworldrecords.com/world-records/heaviest-pumpkin>
- GPC record list: <https://gpc1.org/gpc-champions/guinness-records/guinness-pumpkins/>
- BigPumpkins.com results: <https://www.bigpumpkins.com/ViewArticle.asp?id=132>

The GPC and BigPumpkins.com lists can be months late. Guinness is usually first.

### 2. Make sure that it is a world record

Add a pumpkin only if Guinness or the GPC says that it broke the world record. Local news often reports state or contest records.

### 3. Do not add contest winners

The winner of a big contest, such as Half Moon Bay, is often lighter than the record. Add only pumpkins that beat the record. Two records in one year are possible: 2026 had two.

### 4. Add the record

Add an entry at the end of `records` in `src/data/pumpkin-records.json`. Use real values. This example is made up:

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
  "event": "Name of the weigh-off, Town, State",
  "status": "guinness-world-record",
  "featured": true,
  "note": "First pumpkin over 3,200 lb.",
  "dimensions": {},
  "sources": [
    { "label": "Guinness World Records, Heaviest pumpkin", "url": "https://www.guinnessworldrecords.com/world-records/heaviest-pumpkin" }
  ],
  "verifiedOn": "2027-10-31"
}
```

Then set `dataLastUpdated` at the top of the file to today. The page shows this date.

Field notes:

- `weightKgBasis`: `reported` if Guinness gives the kilograms. If you convert from pounds, use `converted` (1 lb = 0.45359237 kg).
- `status`: `guinness-world-record`, `gpc-world-record` or `historical-record`.
- `featured`: `true` puts a label on the point in the step chart. The newest record must be `true`.
- `note`: firsts, nicknames, and places where sources disagree.

### 5. Add the sources

Put every page that supports the record in `sources`. Set `verifiedOn` to the day you read them.

### 6. If there is no size

Most records have no size. Leave `dimensions` as `{}`. The page then estimates the width from the weight. If Guinness gives a circumference, add it:

```json
"dimensions": {
  "circumferenceCm": 640,
  "circumferenceSource": { "label": "Guinness World Records article", "url": "https://..." }
}
```

Do not enter a size that no source gives.

### 7. Check the data

```sh
npm run validate
```

Fix every problem that it reports.

### 8. Look at the page

```sh
npm run serve
```

Open <http://127.0.0.1:8796/>. Make sure that the new pumpkin is the last one in the row, the slider ends on it, and the chart has a new last step.

### 9. Publish

```sh
git add src/data/pumpkin-records.json
git commit -m "Add 2027 record"
git push
DEPLOY_TARGET=user@host:path/to/halloween-giant-pumpkins npm run deploy
```

The path after the colon starts in the home folder on the server. The server details are not in this repository.

The script puts each version in its own folder (`v/<commit>/`), because Cloudflare keeps old JavaScript and JSON files for up to 31 days. It never deletes files on the server.

### 10. Make sure that the live page changed

Open the live page in a private window. Make sure that the new record shows. HTML can be cached for up to 10 minutes.

## How sizes are estimated

- If Guinness measured the circumference, the width is the circumference divided by π.
- If not, the width comes from the weight, with a formula from [Hu et al. (2011)](https://hu.gatech.edu/Publications/Hu11-pumpkin.pdf).
- The height is 0.6 × the width. This is a guess. No source gives a height.

## License

Code: MIT, see [LICENSE](LICENSE). The record data comes from the sources linked in `src/data/`.
