# PreciCast technical and scientific audit

**Date:** 14 November 2026 (Asia/Kolkata)

**Repository:** [Atharav001/precipitation-forecast-comparison](https://github.com/Atharav001/precipitation-forecast-comparison)

**Deployment:** [precipitation-forecast.vercel.app](https://precipitation-forecast.vercel.app/)
**Scope:** source review, real provider checks, missing-data tests, a small retrospective ERA5 comparison, production build, dependency audit, and public HTTP checks.

## Executive assessment

The implemented comparison, geocoding, historical context, ensemble ranges, map component, and error handling pass the checks listed below. The search had a real presentation defect: multiple places named London looked identical because their administrative regions were hidden. Suggestions now show region and country, and the forecast heading retains those details.

**Forecast accuracy and a benefit from the app's weighted blend remain unproven.** A reproducible 120 city-day comparison to ERA5 reanalysis found lower mean absolute error (MAE) for AIFS alone than for the app blend in this sample. ERA5 is a model-derived reconstruction, not independent gauge truth. The blend is still labelled experimental. A gauge-backed study is required before claiming skill or treating the severity and disagreement rules as validated warnings.

## Methods and source evidence

- **Live provider sample:** `node --import tsx scripts/validate-live.ts` fetched seven daily point values, seven ensemble days, and 2016–2025 ERA5 seasonal data for Bengaluru, Mumbai, Jaisalmer, Shimla, and London on 14 November 2026. Upstream values change with each model run.
- **Retrospective sample:** `python3 scripts/backtest.py` fetched IFS and AIFS 00 UTC runs dated 15 April, 15 June, 15 August, and 15 October 2026 for those five cities. It sums only complete 24-hour local days at leads 1–6, validates mm units, and excludes missing days. It compared 120 paired city-days against same-coordinate, same-date ERA5 daily precipitation; no pairs were skipped. The app blend uses the implementation's ten-year seasonal P90, sample maximum, and tier weights. [Raw rows and summaries](scripts/backtest-results.json) permit recalculation.
- **Source limitations:** The [Open-Meteo historical documentation](https://open-meteo.com/en/docs/historical-weather-api) identifies ERA5 as reanalysis. The [Single Runs API](https://open-meteo.com/en/docs/single-runs-api) provides archived model initializations. This comparison can share model and provider biases. It does not replace quality-controlled rain gauges or radar.
- **Future forecast limitation:** Today's live seven-day values cannot yet be checked against future rainfall. Matching the page to Open-Meteo checks transfer and calculation, not whether the forecast will come true.

## System-by-system findings

| System | Evidence | Status | Residual risk |
|---|---|---|---|
| Search and location identity | Real [geocoding](https://open-meteo.com/en/docs/geocoding-api) results include London in England, Ontario, Ohio, Kentucky, and Arkansas. The API returns `admin1` and IDs. Search now shows region/country, and a regression test covers same-name places. Coordinate URLs select the exact result. | **Fixed; tested** | Provider ranking changes. Older manually constructed URLs without region remain less descriptive. |
| Point forecast | The app requests `precipitation_sum`, `models=ecmwf_ifs025,ecmwf_aifs025_single`, seven days, `timezone=auto`, and mm. All five live cities returned seven dates and zero missing point values. | **Pass for sample** | No issued-run identifier is stored; later provider responses may differ. |
| Schema and missing values | Parser checks dates, array lengths, units, coordinates, and finite values. Tests cover missing AIFS, null values, malformed units, and fully absent series. Small negative rounding artefacts are clamped to zero; values below −1 mm fail. | **Pass in tests** | The −1 mm cutoff is a defensive convention, not a provider guarantee. |
| Divergence badge | Pure function uses `abs(IFS−AIFS) > max(2 mm, 0.25 × higher model)` with strict boundary tests. Current live sample flagged one Bengaluru and two London days. Archived sample flagged 19/120 pairs. | **Calculation pass; meaning unvalidated** | The rule is an attention cue, not an accuracy or hazard alert. The flagged subset had higher MAE in this small ERA5 proxy sample, but event and location mix differ. |
| Seasonal ERA5 context | Ten complete years, ±10 seasonal days, P90, and sample maximum are implemented. Live checks returned 210 first-day samples per city. Tests cover zero rain and tier boundaries. | **Calculation pass; labels unvalidated** | Dry-location P90 can be zero, making any positive rain “Locally Unusual.” “Severe Outlier” describes a ten-year ERA5 sample, not a station record or impact forecast. |
| Experimental weighted blend | Weights are 40/60 IFS/AIFS for Routine, 65/35 for Locally Unusual, 80/20 for Severe Outlier. The backtest reproduces the same tier rule. | **Implemented; no demonstrated skill** | Its ERA5 sample MAE is worse than AIFS alone and slightly worse than a 50/50 blend. |
| Ensemble display | Live checks returned seven dates and 50 members per ECMWF ensemble on day one. Code calculates separate P10, median, P90, and mean after requiring 10 valid members. | **Pass for sample** | Member spread is not a calibrated confidence interval. |
| Map and chart | Source review confirms client-rendered Leaflet/OpenStreetMap map and responsive chart. A prior local in-app browser review saw map controls and chart; this turn has no interactive browser inspection tool. | **Code/build pass; live visual gate open** | Public HTTP cannot prove tile loading, hydration, or mobile layout. |
| Errors and fallback | Invalid coordinates and malformed responses become readable errors. Ensemble/history failures become isolated notices. A fixed snapshot is accepted only on its first forecast date. | **Tested paths pass; resilience limited** | The checked-in snapshot is dated 14 November 2026 and expires after that local day. A forced production outage was not exercised. |
| Cache and performance | Ensemble fetch revalidates after one hour; archive fetch after 30 days. Point forecast and geocoding fetch fresh. Dynamic forecast route built successfully. | **Implemented** | No production cache, latency, rate-limit, or failure telemetry was available. |
| Security and dependencies | TypeScript check and production build pass. `npm audit --json` found zero known vulnerabilities on 14 November 2026. Coordinate input is range-checked; React renders location labels as text. | **Pass for checked scope** | Advisory status changes; this is not a penetration test. |
| Deployment | Vercel marked commit `678ea8d` successful. Fresh public HTTP checks returned 200 for five city pages, showed the selected London region/country, and rendered a readable invalid-coordinate error. | **Server output pass** | No final deployed client/mobile visual pass while the in-app browser tool is unavailable. |

## Archived rainfall comparison

MAE below is in mm against ERA5 for **120 paired city-days** (24 per city). Lower is better for this limited sample and proxy. It is not a skill score against observed rainfall.

| Forecast series | Overall | Bengaluru | Mumbai | Jaisalmer | Shimla | London |
|---|---:|---:|---:|---:|---:|---:|
| IFS | 2.573 | 2.883 | 1.783 | 0.138 | 6.721 | 1.342 |
| AIFS | **2.204** | **1.675** | **1.183** | **0.050** | 6.654 | 1.458 |
| Equal 50/50 blend | 2.318 | 2.146 | 1.471 | 0.094 | **6.625** | **1.254** |
| App tier-weighted blend | 2.359 | 2.337 | 1.408 | 0.107 | 6.628 | 1.316 |

Overall RMSE was 11.025 mm (IFS), 10.572 (AIFS), 10.744 (equal), and 10.769 (app blend). A Shimla ERA5 value of 123.2 mm on 19 August 2026 dominates squared error; both archived forecasts were below 10 mm. A single extreme and 120 correlated samples cannot establish a general ranking. The app tiers occurred 112 Routine, 7 Locally Unusual, and 1 Severe Outlier times. That severe-tier forecast was 33.6 mm IFS versus 14.1 mm ERA5 for Bengaluru on 17 October 2026. It illustrates why the label must be read as *forecast relative to a modelled historical sample*, not a verified event.

## Verification commands

| Check | Result on 14 November 2026 |
|---|---|
| `npm test` | 8/8 passed, including the new same-name geocoding test. |
| `npm run check` | Passed. |
| `npm run build` | Passed; `/forecast/[city]` is a dynamic route. |
| Local production HTTP | Home, London with region/country, and invalid-coordinate routes returned 200; London included England and the invalid route included a readable error. |
| `node --import tsx scripts/validate-live.ts` | Five cities passed; seven daily values and 50+50 first-day ensemble members each; zero missing point values in this sample. |
| `python3 scripts/backtest.py` | 120 paired city-days; zero skips; results saved in `scripts/backtest-results.json`. |
| `npm audit --json` | Zero known vulnerabilities at check time. |

### Post-push public-to-provider check

After Vercel marked commit `678ea8d` successful, the public pages and direct Open-Meteo forecast endpoint were queried at the same coordinates. The displayed seven-day totals matched the direct API sums to one decimal place in all five cases:

| City | IFS direct / site (mm) | AIFS direct / site (mm) | Public HTTP |
|---|---:|---:|---:|
| Bengaluru | 0.0 / 0.0 | 3.1 / 3.1 | 200 |
| Mumbai | 0.0 / 0.0 | 0.0 / 0.0 | 200 |
| Jaisalmer | 1.4 / 1.4 | 2.4 / 2.4 | 200 |
| Shimla | 0.6 / 0.6 | 1.7 / 1.7 | 200 |
| London | 21.3 / 21.3 | 21.8 / 21.8 | 200 |

The public London page also rendered “England, United Kingdom” when those selection parameters were supplied. The invalid-coordinate route returned HTTP 200 with “Invalid latitude or longitude.” This verifies readable UI output; using HTTP 200 for an invalid forecast route is a semantic status-code weakness if clients need to distinguish errors programmatically.

## Remaining gates, ranked

1. **Observed-rainfall validation:** Collect independent, quality-controlled daily gauges, with matching location, timezone, and accumulation window. Test many dates, climates, seasons, and leads. Compare IFS, AIFS, equal blend, and app blend; include wet-day and heavy-rain metrics and uncertainty intervals. Only then tune thresholds or claim skill.
2. **Final deployed client check:** Use the Codex in-app browser to verify suggestion labels, selection, chart hydration, map tiles, keyboard navigation, error notices, and a narrow mobile viewport. That inspection tool was unavailable during this audit; no visual pass is claimed.
3. **Operational resilience:** Replace the fixed 14 November demo snapshot with a maintained, dated fallback if outage continuity matters. Add provider, cache, latency, rate-limit, and tile monitoring before relying on the service beyond a demo.
4. **Method presentation:** Keep the blend experimental and tiers explicitly tied to ERA5. The limited proxy result does not justify tuning weights to this sample; a larger gauge-backed evaluation should guide redesign.

**Conclusion:** The checked source paths and provider samples show working data handling and calculations. City ambiguity is fixed. Prediction accuracy, threshold usefulness, durable fallback behavior, and final deployed visual behavior remain unverified to the standards above.
