## Current Build Status

Due to time constraints, the current build includes city geocoding, a seven-day IFS versus AIFS precipitation comparison, a divergence badge, and a limitations panel. The historical severity tiers, weighted consensus algorithm, ensemble bands, map, and Vercel KV caching described below were part of the original design and were not implemented in this build.

# IMPLEMENTATION PLAN — Precipitation Forecast Comparison App

> **READ THIS FIRST, AGENT.** This document is the single source of truth for what to build, in what order, with what exact names, parameters, and thresholds. Do not invent alternative approaches, parameter names, or thresholds not listed here. Where this document says "verify before coding," you MUST fetch the named URL and confirm the real parameter names before writing that module — do not guess or hallucinate a plausible-looking API parameter.
>
> Companion files: `ARCHITECTURE.md` (how the pieces fit together), `DECISIONS.md` (why each choice was made — read this if something here seems arbitrary), `PROJECT_EXPLAINED_SIMPLE.md` (plain-language version, for the human, not for you).

---

## 0. Mandatory first action

The very first message of this session must be exactly (with real name/date filled in):

```
QUEST Lab Full Stack AI Pre-doctoral application, [NAME], [DATE]
```

Then paste this entire plan as context before any coding begins.

---

## 1. What this app does (one paragraph, memorize this)

The original design proposed showing ECMWF's physics-based IFS and AI-based AIFS precipitation forecasts side by side, with a **Divergence Badge**, a rule-based **Consensus Forecast**, and local historical severity tiers. Only the model comparison and divergence badge are implemented. The proposed consensus weighting has not been validated for precipitation.

---

## 2. Non-negotiable guardrails (read before writing any code)

These exist because an earlier design review caught real mistakes. Do not reintroduce them:

1. **NEVER claim the cited study established a rainfall bias for AIFS.** The 2026 Zhang and Engelke study evaluated GraphCast, Pangu-Weather, and Fuxi for record-breaking heat, cold, and wind. It evaluated neither AIFS nor precipitation. Every piece of UI copy, every code comment, and every README sentence that references this must use the exact framing in Section 7.
2. **NEVER label the P90 threshold tier "record-breaking."** That term is reserved only for the Severe Outlier tier (near/above the city's historical max). P90 is common — it happens several times a year. Calling it record-breaking is a factual overclaim. Use "Locally Unusual" for that tier, always.
3. **NEVER merge IFS and AIFS ensemble members into one combined chart series.** They use different perturbation schemes and are not paired. Render as two visually distinct, separately-labeled bands. The single "consensus" number is derived from the two **means**, never from mixing raw ensemble members together.
4. **NEVER rely on an in-memory JavaScript object, Map, or array as a cache for climatology data.** Vercel serverless functions are stateless between invocations — an in-memory cache will silently fail to persist and you will re-run expensive queries every request without realizing it. Use the Vercel KV client as specified in Section 5.4. If Vercel KV is not available in this environment, fall back to writing a JSON file to `/public/cache/` at build time for the demo cities only — do not silently skip caching.
5. **NEVER guess an Open-Meteo API parameter name.** Before writing `lib/openMeteo.ts`, fetch the real documentation pages listed in Section 4 and copy the exact parameter names and URL structure from what you actually see there, not from this document's best-guess examples (marked clearly below).
6. **NEVER ship a feature with no loading state or no error state.** Every async data fetch (forecast, ensemble, climatology, geocoding) must have a visible loading state and a visible, user-readable error state. A blank screen or an unhandled promise rejection on API failure is treated as a bug, not a minor issue.
7. **NEVER use color alone to convey a severity tier or divergence flag.** Every such indicator must include a text label and an icon, for accessibility and for clarity in a screen recording where color may not render clearly.

---

## 3. Tech stack (exact, do not substitute)

| Layer | Exact choice |
|---|---|
| Framework | Next.js 14, App Router, TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| Map | React-Leaflet with OpenStreetMap tile layer (no API key) |
| Caching/state store | Vercel KV (Upstash Redis under the hood) |
| Hosting | Vercel |
| Package manager | npm |

Do not add Redux, a separate backend server, a database like Postgres/MongoDB, or any auth system. None of these are needed and each one adds risk inside a 72-hour single-session build.

---

## 4. Data sources — verify these exact docs before coding

Fetch and read each of these pages before writing the corresponding module. Copy the real parameter names you see on the page, not the illustrative examples below.

1. **Geocoding**: `https://open-meteo.com/en/docs/geocoding-api`
2. **Forecast (point values, IFS + AIFS)**: `https://open-meteo.com/en/docs` (base forecast docs) — confirm the `models` parameter accepts `ecmwf_ifs025` and `ecmwf_aifs025_single` together in one comma-separated call.
3. **Ensemble**: `https://open-meteo.com/en/docs/ensemble-api`
4. **Ensemble Mean**: `https://open-meteo.com/en/docs/ensemble-mean-api`
5. **Historical archive (climatology)**: `https://open-meteo.com/en/docs/historical-weather-api`

**Illustrative (unverified — confirm before use) example shapes:**

```
Geocoding:
GET https://geocoding-api.open-meteo.com/v1/search?name={city}&count=5&language=en&format=json

Forecast (point, both models):
GET https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=precipitation&daily=precipitation_sum&models=ecmwf_ifs025,ecmwf_aifs025_single&forecast_days=15&timezone=auto

Ensemble Mean (uncertainty band):
GET https://ensemble-api.open-meteo.com/v1/ensemble?latitude={lat}&longitude={lon}&hourly=precipitation&models=ecmwf_ifs025&ens_select=mean,quantile0.1,quantile0.9

Historical archive (climatology):
GET https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date={YYYY-MM-DD}&end_date={YYYY-MM-DD}&daily=precipitation_sum&timezone=auto
```

**First real action in this category**: make one actual `curl` or `fetch` call to the historical archive endpoint requesting a 10-year date range in a single request. If it errors or truncates, chunk into yearly calls instead and merge results. Do not design the climatology module around an assumption — confirm this limit for real, in the first working hour.

---

## 5. Build order (follow this sequence exactly)

### 5.1 Scaffold
```
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir
npm install recharts react-leaflet leaflet @vercel/kv
```
Commit immediately after scaffold succeeds and runs locally.

### 5.2 File structure (create exactly this layout)
```
/app
  /page.tsx                    -- search/landing page
  /forecast/[city]/page.tsx    -- main forecast view (Server Component — calls lib/ functions
                                   DIRECTLY, in-process. Do NOT create /api/forecast,
                                   /api/ensemble, or /api/climatology route handlers — there
                                   should be no self-hosted HTTP endpoints for these three.
                                   See ARCHITECTURE.md Section 1 for why.)
  /actions/geocode.ts           -- Server Action (file starts with "use server"), the ONLY
                                   thing the browser actually calls on the server for this app
/components
  CitySearch.tsx
  ConsensusCard.tsx
  SeverityBadge.tsx
  DivergenceBadge.tsx
  EnsembleChart.tsx
  LimitationsPanel.tsx
  MapView.tsx
/lib
  openMeteo.ts        -- all external API fetch wrappers, nothing else
  consensus.ts         -- pure function: hybrid consensus algorithm (Section 6)
  climatology.ts        -- percentile computation + KV read/write
  constants.ts           -- all thresholds and copy strings live here, nowhere else
/types
  weather.ts
/public
  /cache/fallback-demo-data.json   -- static safety net, see Section 8
```

### 5.3 Data layer first (build and verify before any UI)
1. `lib/openMeteo.ts`: three exported functions — `geocodeCity(name)`, `getPointForecast(lat, lon)`, `getEnsembleMean(lat, lon)`. Each returns typed data or throws a typed error (`WeatherApiError`). These are plain async functions — they are never called via `fetch()` to your own domain, only imported and awaited directly wherever they're needed.
2. `lib/climatology.ts`: one exported function, `getClimatology(lat, lon, dayOfYear)`, which computes the `dayOfYearBucket` (see ARCHITECTURE.md Section 3), checks Vercel KV for that bucket key, and on a miss queries the Open-Meteo archive for the pooled ±10-day-window, multi-year sample, computes P90 and max, writes it to KV, and returns `{ p90Mm, maxMm }`.
3. Test each function independently from a temporary scratch script (e.g. `tsx scripts/test-data-layer.ts`) before wiring to UI — do not create throwaway API routes just to test these, since no route handlers exist for them in this build. Print real returned values to console. Confirm units (precipitation in mm), confirm both model values differ from each other for at least one test city, and confirm the climatology P90/max values look sane (a coastal monsoon city's P90 should be visibly higher than a desert city's).
4. Only proceed to UI once all functions return verified real data.

### 5.4 Caching layer
1. Set up Vercel KV, confirm `@vercel/kv` connects in local dev (Vercel KV works locally via `vercel env pull`).
2. `lib/climatology.ts`: before computing percentiles for a (lat, lon, month) key, check KV first (`kv.get(cacheKey)`). On miss, compute and `kv.set(cacheKey, value, { ex: 60 * 60 * 24 * 30 })` (30-day expiry — climatology doesn't change day to day).
3. Cache key format: `climatology:{lat.toFixed(2)}:{lon.toFixed(2)}:{monthNumber}` — rounding lat/lon to 2 decimals intentionally groups nearby queries into one cache entry.

### 5.5 Consensus algorithm (pure function, no API calls inside it)
Implement exactly as specified in Section 6. Write unit tests for the three tier boundaries before wiring to UI.

### 5.6 UI, in this order
1. `CitySearch.tsx` → geocoding → navigate to `/forecast/[city]`
2. `ConsensusCard.tsx` — the single primary number, with `SeverityBadge` inline (icon + text + color)
3. `DivergenceBadge.tsx` — shows mm difference between IFS and AIFS when above threshold
4. `EnsembleChart.tsx` — two separate Recharts `<Area>` bands (IFS, AIFS), never merged
5. `MapView.tsx` — simple marker on searched location
6. `LimitationsPanel.tsx` — collapsed by default, contains the approved copy text from Section 7

### 5.7 Fallback dataset
Before Day 3, manually fetch and save real responses for 3–4 cities (one monsoon-heavy, one dry, one Himalayan/temperate) into `public/cache/fallback-demo-data.json`. Wire the app to use this file automatically if any live API call fails, with a visible "showing cached data" notice — never fail silently.

### 5.8 Testing (do all of these before deployment, see Section 9)

### 5.9 Deploy
`vercel --prod`, confirm live URL loads in an incognito window, confirm mobile responsiveness.

---

## 6. The Hybrid Consensus Algorithm — exact specification

This is a pure function. Inputs and outputs are fully typed. Do not add randomness, do not add machine learning here — this is deliberately a deterministic, auditable rule.

```typescript
type Tier = "ROUTINE" | "LOCALLY_UNUSUAL" | "SEVERE_OUTLIER";

interface ConsensusInput {
  ifsValueMm: number;
  aifsValueMm: number;
  climatologyP90Mm: number;
  climatologyMaxMm: number;
}

interface ConsensusOutput {
  consensusValueMm: number;
  tier: Tier;
  weightIfs: number;
  weightAifs: number;
  divergenceMm: number;
  divergenceFlag: boolean;
}

function computeConsensus(input: ConsensusInput): ConsensusOutput {
  const { ifsValueMm, aifsValueMm, climatologyP90Mm, climatologyMaxMm } = input;
  const higherValue = Math.max(ifsValueMm, aifsValueMm);

  let tier: Tier;
  let weightIfs: number;
  let weightAifs: number;

  if (higherValue >= climatologyMaxMm * 0.95) {
    tier = "SEVERE_OUTLIER";
    weightIfs = 0.8;
    weightAifs = 0.2;
  } else if (higherValue >= climatologyP90Mm) {
    tier = "LOCALLY_UNUSUAL";
    weightIfs = 0.65;
    weightAifs = 0.35;
  } else {
    tier = "ROUTINE";
    weightIfs = 0.4;
    weightAifs = 0.6;
  }

  const consensusValueMm = weightIfs * ifsValueMm + weightAifs * aifsValueMm;
  const divergenceMm = Math.abs(ifsValueMm - aifsValueMm);
  const divergenceThreshold = Math.max(2, 0.25 * higherValue);
  const divergenceFlag = divergenceMm > divergenceThreshold;

  return { consensusValueMm, tier, weightIfs, weightAifs, divergenceMm, divergenceFlag };
}
```

**Do not change these weight numbers** (0.8/0.2, 0.65/0.35, 0.4/0.6) without reading `DECISIONS.md` Section 3 first — they are intentionally simple, round, explainable numbers, not numbers tuned for accuracy. Explainability is the point.

---

## 7. Approved copy text (use verbatim, do not paraphrase)

**Routine tier:** "Routine forecast — models broadly agree."

**Locally Unusual tier:** "Locally Unusual: this forecast is above the 90th percentile of this location's recent rainfall history. This is a notable but not unprecedented amount."

**Severe Outlier tier (original design, not implemented; copy requires validation before use):** "Severe Outlier: this forecast approaches or exceeds this location's historical maximum in the selected dataset. This does not establish which model is more accurate or provide a lower bound for rainfall."

**Model limitations panel (use this exact framing — do not strengthen or weaken the claim):** "This app compares ECMWF's physics-based IFS model with ECMWF's AI-based AIFS model. AIFS shares its underlying approach — a graph neural network trained on historical reanalysis data — with other AI weather models (GraphCast, Pangu-Weather, Fuxi). A 2026 study (Zhang & Engelke, Science Advances) found these models underestimate the frequency and intensity of record-breaking heat, cold, and wind extremes — the study did not evaluate precipitation or AIFS directly. We show model disagreement here as a signal worth your attention, not as a validated claim about which model is more accurate for rainfall specifically."

**Divergence badge:** "Models disagree by {X}mm for this forecast."

---

## 8. Reliability safety net (for the live judging moment)

1. Cache every successful ensemble and climatology response for at least 1 hour, keyed by location + forecast run time, to reduce live API calls during judging.
2. Maintain `public/cache/fallback-demo-data.json` with real, pre-fetched data for 3–4 cities. If any live fetch throws, fall back to this file and show a visible "showing recently cached data" notice. Never show a blank or broken screen as a result of an upstream API failure.

---

## 9. Required tests before calling the build done

1. Query at least 4 cities with different climates (one monsoon-heavy coastal city, one arid city, one temperate/Himalayan city, one more) and confirm the severity tier logic actually changes between them — not the same tier every time.
2. Confirm ensemble band width visibly increases at longer lead times (10–14 days) vs shorter ones (1–2 days). If it doesn't, the ensemble data wiring is wrong.
3. Deliberately break the fetch URL in one module and confirm the fallback/error state displays correctly, not a blank screen.
4. Load the deployed URL in an incognito window and on a real mobile device or mobile emulator.
5. Confirm the divergence badge actually triggers for at least one real test case before recording the video walkthrough.
6. Re-read `git log` and confirm commit timestamps form one coherent, continuous story across the session.

---

## 10. Checkpoint rule (hard deadline inside the build)

At roughly the Day 2 midpoint (~hour 40 of 72), if the climatology/Severe-Outlier tier is not returning correct, verified values, **cut it** and ship with Routine + Locally Unusual tiers only, plus the divergence badge. Do not let an unfinished stretch feature consume Day 3, which is reserved for testing, video, written answers, and submission — not for finishing core features.
