# PreciCast release audit

**Audit date:** 14 November 2026 (Asia/Kolkata)  
**Repository:** [Atharav001/precipitation-forecast-comparison](https://github.com/Atharav001/precipitation-forecast-comparison)  
**Deployment:** [precipitation-forecast.vercel.app](https://precipitation-forecast.vercel.app/)  
**Scope:** source review, data-contract checks, five-city live-provider validation, automated tests, production build, local production HTTP checks, in-app browser review before the final push, and post-push public HTTP checks.

## Executive assessment

The application implements the planned city search, IFS/AIFS comparison, divergence rule, historical context and experimental blend, separate ensemble ranges, location map, error notices, and short-lived fallback snapshots. The code builds and the checked provider responses are internally consistent. **Forecast accuracy, the usefulness of the divergence threshold, and the blend's skill are not established** by these checks. The original Vercel KV design was replaced by Next.js's persistent Data Cache because Vercel KV is no longer available.

## System-by-system findings

| System | Check and evidence | Result | Limit |
|---|---|---|---|
| City search | In-app browser: typing `Lon` produced London and other matching locations before Enter; selecting London navigated to its coordinate URL. | Pass | Provider ranking and duplicate city names can vary. |
| Point forecast | Direct [Open-Meteo forecast API](https://open-meteo.com/en/docs) calls for Bengaluru, Mumbai, Jaisalmer, Shimla, and London returned seven dates and `mm` units. The local London page total matched the API sums: IFS 21.3 mm and AIFS 29.0 mm. | Pass | This checks data fidelity, not forecast accuracy. |
| Missing and invalid data | Automated tests cover a missing AIFS series, null daily values, wrong units, and a fully absent forecast. Missing values remain unavailable; a malformed response throws `WeatherApiError`. | Pass | No real missing series was encountered in the five-city live sample. |
| Negative precipitation | Real provider responses included −0.1 mm (Jaisalmer) and −0.2 mm (Shimla). Small negative values are clamped to 0 mm and are not silently added to totals. | Pass with documented normalization | Values below −1 mm are treated as invalid; that cutoff is a defensive implementation rule. |
| Divergence | Pure-function boundary tests pass. London triggered three flags in seven days; the four Indian cities tested triggered zero. | Pass | `max(2 mm, 25% of higher forecast)` is a heuristic, not a calibrated warning threshold. |
| ERA5 history | A real ten-year [archive API](https://open-meteo.com/en/docs/historical-weather-api) request returned 3,653 dates from 2016-01-01 through 2025-12-31, `mm` units, and no null values for Bengaluru. Live function checks returned 210 seasonal samples for each tested city. | Pass | ERA5 is reanalysis, not an independent gauge observation or a forecast verification dataset. |
| Severity and blend | Seven automated tests include zero-rain, P90, and severe boundaries. Five-city live checks produced Routine and Locally Unusual labels. The page labels the weighted number experimental. | Functional pass; scientific validation open | No severe live case or historical backtest was established. A dry-season P90 of zero can label a small positive amount unusual. |
| Ensembles | [Open-Meteo ensemble API](https://open-meteo.com/en/docs/ensemble-api) returned 50 daily IFS members and 50 AIFS members for Bengaluru. The application computes separate per-model P10–P90 ranges and means. | Pass | Member ranges are ensemble spread, not calibrated confidence intervals. The original plan's illustrative ensemble-mean URL did not provide the daily quantiles needed. |
| Map | In-app local browser displayed Leaflet controls and OpenStreetMap attribution after correcting a React Leaflet development crash. The Leaflet map is client-rendered. | Local pass | The map tiles and client interaction require a post-push live browser check. |
| Fallback and error state | Four real city snapshots were saved with timestamps. Older snapshots are rejected. Production HTTP request with invalid coordinates returned a readable error; automated tests cover malformed upstream data. | Pass for tested paths | The static snapshot is useful only on its forecast start date and is not a long-term outage strategy. A forced live upstream outage was not independently exercised in the final production build. |
| Cache | Ensemble fetch uses one-hour `next.revalidate`; archive fetch uses 30 days. [Next.js fetch documentation](https://nextjs.org/docs/15/app/api-reference/functions/fetch) describes this as persistent Data Cache behavior. | Implemented | Vercel production cache hit/miss and expiration telemetry were not inspected. |
| Security and dependencies | Next.js upgraded from 14.2.35 to 15.5.29; PostCSS pinned to patched 8.5.23 or newer. `npm audit` reported zero known vulnerabilities. | Pass at audit time | Dependency advisories can change. |
| Build and tests | `npm test`: 7/7 pass. `npm run check`: pass. `npm run build`: pass. Local production server returned HTTP 200 for London, Bengaluru, and a readable invalid-coordinate case. | Pass | Browser checks of the final deployed commit remain a separate release gate. |
| Post-push deployment | The public Vercel URL returned HTTP 200 for all five cities, with historical and ensemble sections present; invalid coordinates returned a readable error. | Server-rendered paths pass | A post-push visual mobile and client-side map check could not be run after the in-app browser tool became unavailable. |

## Five-city provider sample

The following is a **single forecast run on 14 November 2026**. Forecast values can change with a later ECMWF run.

| City | Climate contrast | Missing point values | Divergence days | Historical tier result |
|---|---|---:|---:|---|
| Bengaluru | Tropical plateau | 0 | 0 | Routine on all 7 days |
| Mumbai | Coastal monsoon | 0 | 0 | Routine on all 7 days |
| Jaisalmer | Arid | 0 | 0 | Locally Unusual on 2 days |
| Shimla | Mountain | 0 | 0 | Locally Unusual on 1 day |
| London | Temperate maritime | 0 | 3 | Locally Unusual on 2 days |

Each city returned seven point-forecast dates, seven ensemble dates, 50 members per ensemble on the first day, and a 2016–2025 ERA5 comparison period. The validation script is [`scripts/validate-live.ts`](scripts/validate-live.ts) and can be rerun after model updates.

## Research and interpretation controls

The 2026 Zhang and Engelke study evaluated record-breaking heat, cold, and wind in GraphCast, Pangu-Weather, and FuXi. It did not evaluate precipitation or AIFS. The site states this limitation. Model disagreement is an inspection signal, not evidence that IFS or AIFS is more accurate for rainfall. The blend's fixed weights cannot support a skill claim without a retrospective comparison using archived forecasts and observed precipitation.

## Release gates and remaining work

1. Complete a post-push in-app browser check of live city search, chart rendering, map tiles, and mobile layout. Public HTTP checks confirm the new server-rendered content, but they do not execute client JavaScript or inspect the mobile viewport. The in-app browser review above was on the local pre-push build.
2. Run a precipitation backtest using archived **IFS and AIFS forecasts** paired with independent gauge observations (or clearly labelled reanalysis as a weaker proxy). Compare each model, the fixed blend, and a simple equal-weight baseline by location, lead time, season, and heavy-rain event threshold.
3. Calibrate or redesign divergence and severity thresholds based on that evaluation. In particular, inspect false alerts when local P90 is zero and validate the “Severe Outlier” label across climates.
4. Replace the static same-day snapshot with a maintained, dated fallback if sustained outage resilience is required. Keep freshness explicit and never present an old forecast as current.
5. Add production monitoring for Open-Meteo failures, latency, missing values, cache effectiveness, and map tile failures if the app will be operated beyond a demo.

**Conclusion:** The implemented functions, tested routes, and five public server-rendered city pages work for the checked cases. This audit does not certify prediction accuracy, all possible upstream responses, or final live client-side behavior until the remaining browser release gate is completed.
