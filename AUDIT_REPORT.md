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

## 15 November 2026 follow-up

The earlier sections record the 14 November release. This follow-up records the current implementation and new evidence:

- **Failed forecast and fallback:** The expired checked-in snapshot and its loader were removed. A point-fetch failure now produces “Forecast temporarily unavailable. Please retry shortly.” with a retry link; invalid coordinates have a separate message. A forced rejected-fetch unit test verifies that no forecast data is returned on failure. The production build was also run with a deliberately failing point API fetch: the Bengaluru route returned the retry message and link, with no dated snapshot or daily rainfall rows. A new live five-city check returned seven dates, no missing point values, and 50 members per ensemble on the first day for each city.
- **Independent observations:** [NOAA NCEI daily summaries](https://www.ncei.noaa.gov/access/search/documentation/data-service/) provided usable precipitation values at nearby checked stations in Bengaluru, Jaisalmer, and Shimla. Only **12** of the 72 possible archived forecast days for those cities had same-date station values (8, 3, and 1 respectively); the checked Mumbai and London stations had no usable records in the queried period. Station accumulation windows were not confirmed identical to model local-calendar days. The [reproducible pilot](scripts/gauge-pilot.py) and [results](scripts/gauge-pilot-results.json) are a coverage check, **not** a basis for retuning weights or calibrating warnings.
- **Scientific display:** The unchanged thresholds now render descriptive ERA5 comparisons (“At or above seasonal P90”, “Near ERA5 sample maximum”) rather than implying a validated impact warning. The divergence badge says “larger model difference” rather than showing a hazard icon. The experimental blend remains plainly labelled. The 120-day ERA5 result and 12-pair gauge pilot do not establish an optimal blend or calibrated false-alarm rate.
- **Response-time baseline:** Fifteen public HTTP requests across five cities, three per city, returned 200 with about 79 kB of HTML each. Medians were 794 ms Bengaluru, 549 ms Mumbai, 652 ms Jaisalmer, 566 ms Shimla, and 505 ms London. These are end-to-end measurements from one client, not server-only latency or a production percentile. No cache or data-path optimization was made without stronger telemetry.
- **Visual gate:** The Codex in-app browser inspection tool is unavailable to this agent. Source, build, and HTTP tests cannot verify live map tiles, chart hydration, keyboard behavior, or a narrow viewport. This remains an open release gate; no visual pass is claimed.
- **Post-push deployment:** Vercel marked commit `bfa6c2f` successful. All five public city routes returned HTTP 200; displayed seven-day IFS/AIFS totals matched fresh direct Open-Meteo responses in every case. The Experimental and descriptive tier text rendered on each page. Invalid coordinates rendered their separate message. These checks validate server output, not browser interaction.

## 15 November 2026 re-audit

This pass reviewed the current source, reran the provider and deployment checks, and tested the failure path in the production build. It found and fixed three further correctness issues:

1. The city dropdown could briefly show results for the previous query while the next request was pending. Results now clear when a new search starts.
2. A shortened, duplicate, impossible, or gapped date series could be accepted as a seven-day forecast. Point and ensemble responses now require seven valid consecutive calendar dates; the archive requires consecutive dates covering its requested range. The point response must include its timezone, and geocoding coordinates must be finite and in range.
3. The Retry link after an upstream failure dropped the selected region and country. It now preserves the full location query.

| Verification | Result |
|---|---|
| Automated tests | 12/12 passed, including malformed date series, missing timezone, invalid geocoding coordinates, and forced point-fetch failure. |
| TypeScript and production build | Passed. |
| Current dependency advisory scan | `npm audit --json`: zero known vulnerabilities. |
| Live provider check | Bengaluru, Mumbai, Jaisalmer, Shimla, and London returned seven point and ensemble dates, no missing point values, 50 members per model on the first ensemble day, and complete 2016–2025 ERA5 history. |
| Forced production outage | The London page showed a readable retry message; Retry retained England and United Kingdom; no stale snapshot or rainfall rows appeared. |

**Still not certifiable:** Today's and future forecasts cannot be checked against future observations. The twelve same-date NOAA station pairs lack confirmed matching accumulation windows and are inadequate for weight or badge calibration. The in-app browser provides no inspection control to this agent, and the available Codex browser-testing runtime could not launch a controllable browser, so map tiles, chart hydration, keyboard interaction, and mobile rendering still lack a final visual pass. The invalid-coordinate page returns a readable error with HTTP 200, which is a semantic status-code limitation for automated clients. These are open findings, not passes.

**Deployed release check:** Vercel marked commit `56ab27c` successful. The Bengaluru, Mumbai, Jaisalmer, Shimla, and London public forecast pages each returned HTTP 200 and exactly seven daily rows. Their displayed seven-day IFS and AIFS totals matched fresh direct Open-Meteo calls at the same coordinates in all five cases. This checks server rendering and data transfer for the sampled run, not future prediction accuracy or client-side visual behavior.
