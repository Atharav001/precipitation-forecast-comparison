# PreciCast

[Live app](https://precipitation-forecast.vercel.app/) · [Architecture](ARCHITECTURE.md) · [Audit](AUDIT_REPORT.md)

PreciCast compares daily precipitation forecasts from ECMWF's physics-based IFS and AI-based AIFS models for a searched city. It shows seven-day model values, flags material disagreement, places each day against a seasonal ERA5 reanalysis distribution, and displays separate ensemble uncertainty ranges. The app is a forecast comparison and context tool; it does not establish which model is more accurate for rainfall.

## What the app shows

- City suggestions appear while typing, using Open-Meteo geocoding. Same-name places show their region and country; a country qualifier such as `London, United Kingdom` narrows the search.
- Seven daily IFS and AIFS precipitation totals are shown in millimetres. Missing model values are labelled unavailable; small negative API rounding artefacts are displayed as zero.
- A divergence badge appears when `abs(IFS − AIFS) > max(2 mm, 25% × max(IFS, AIFS))`.
- An **experimental blend** and local severity tier use the original plan's fixed weights and a ten-year ERA5 seasonal window. A small retrospective check against ERA5 reanalysis found no overall improvement from the app blend over AIFS alone; this is not validation against observed rainfall. No accuracy improvement is claimed.
- Separate IFS and AIFS ensemble charts show each model's 10th–90th percentile of daily member rainfall. Members from different ensembles are never paired or merged.
- A Leaflet/OpenStreetMap map marks the searched forecast location. Model values describe a grid area, not a rain gauge at the pin.
- When a live point forecast fails, a same-day snapshot can be shown for four demo cities with a visible timestamp. Older snapshots are rejected. Ensemble and historical failures are isolated and shown as notices.

## Data and architecture

The Next.js Server Component calls the Open-Meteo functions in-process. City search uses a Server Action. Point forecasts are fetched fresh; ensemble responses use the Next.js Data Cache for one hour and ERA5 archive responses for 30 days. This persistent framework cache replaces Vercel KV, which [Vercel no longer offers](https://vercel.com/docs/redis). No Redis credentials or external database are required.

Data sources: [Open-Meteo forecast](https://open-meteo.com/en/docs), [ensemble](https://open-meteo.com/en/docs/ensemble-api), [historical weather](https://open-meteo.com/en/docs/historical-weather-api), and [geocoding](https://open-meteo.com/en/docs/geocoding-api). Historical thresholds come from ERA5 **reanalysis**, not station observations.

## Run locally

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The app needs network access to Open-Meteo and OpenStreetMap. It uses no API key for non-commercial demo traffic.

## Verify

```bash
npm test
npm run build
npm run check
node --import tsx scripts/validate-live.ts
npm audit
python3 scripts/backtest.py
```

The live validation script makes real Open-Meteo requests for Bengaluru, Mumbai, Jaisalmer, Shimla, and London. Results change with each model run. The backtest script reproduces a 120 city-day comparison from four archived 2026 runs, with the raw rows in [backtest-results.json](scripts/backtest-results.json). ERA5 is a reanalysis proxy, not independent rain-gauge truth. The [audit report](AUDIT_REPORT.md) records the checks and remaining limitations.

## Scientific limitations

The divergence threshold and blend weights are transparent heuristics, not calibrated rainfall skill scores. Ensemble ranges show spread among model members, not guaranteed confidence intervals. A 2026 study by Zhang and Engelke tested GraphCast, Pangu-Weather, and FuXi on heat, cold, and wind extremes; it tested neither AIFS nor precipitation. The [limitations panel](components/LimitationsPanel.tsx) explains this on the forecast page.
