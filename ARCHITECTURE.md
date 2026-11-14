# ARCHITECTURE — Precipitation Forecast Comparison App

> Companion to `IMPLEMENTATION_PLAN.md`. That file says what to build and in what order. This file says how the pieces fit together and why requests flow the way they do. Read both before writing code; if the two ever conflict, `IMPLEMENTATION_PLAN.md` wins on sequencing and exact specs, this file wins on structural reasoning.

---

## 1. System overview (original design; only the point forecast branch was implemented)

```
    ┌────────────────────┐        ┌──────────────────────────────┐
    │       Browser        │       │   Next.js App (Vercel, edge)  │
    │  /app/page.tsx        │       │                                │
    │  (CitySearch, client) │──────▶│  Server Action: searchCity()  │
    └────────────────────┘        │  (app/actions/geocode.ts)     │
                                     └───────────────┬────────────────┘
                                                      │ in-process call
                                                      ▼
                                            Open-Meteo Geocoding

    On navigation to /forecast/[city]?lat=..&lon=..:

    ┌──────────────────────────────────────┐
    │  /app/forecast/[city]/page.tsx        │
    │  (Server Component — runs ONLY on      │
    │   the server, never in the browser)   │
    └───────────────────┬────────────────────┘
                         │ direct, in-process function calls
                         │ (NOT fetch() to its own domain)
          ┌──────────────┼────────────────────┐
          ▼              ▼                     ▼
  lib/openMeteo.ts  lib/openMeteo.ts    lib/climatology.ts
  getPointForecast() getEnsembleMean()   getClimatology()
          │              │                     │
          ▼              ▼                     ▼
  Open-Meteo Forecast  Open-Meteo        Open-Meteo Archive (ERA5)
  (IFS + AIFS point)   Ensemble Mean       + Vercel KV cache layer
```

**Correction from an earlier draft:** the original diagram had the Server Component calling its own `/api/forecast`, `/api/ensemble`, `/api/climatology` routes over HTTP. That is an unnecessary network hop — a Next.js Server Component runs on the server and can import and call functions directly, in the same process, with no serialization or round trip. Self-hosted API routes exist only for requests that genuinely originate in the browser — here, that's just the city search. Even that is better served by a **Server Action** (`app/actions/geocode.ts`, marked `"use server"`) than a hand-written route handler, since Next.js 14 App Router treats Server Actions as the idiomatic way for a client component to trigger server-side work without you writing a REST endpoint by hand. There is no `/api/forecast`, `/api/ensemble`, or `/api/climatology` route in this build. The point forecast uses a plain function; the ensemble and climatology functions were planned but not implemented.

---

## 2. Request lifecycle — what happens on one search

1. User types a city into `CitySearch.tsx` (a client component) → this calls the `searchCity()` Server Action, not a hand-written API route.
2. The Server Action calls Open-Meteo Geocoding directly (in-process, server-side) and returns `{ lat, lon, displayName }` to the client.
3. Browser navigates to `/forecast/[city]?lat=..&lon=..`.
4. That page is itself a **Server Component** — its code runs on the server before any HTML reaches the browser. It calls `getPointForecast(lat, lon)` from `lib/openMeteo.ts` directly for seven days of IFS and AIFS point values. The original design also called for these two functions in parallel, but neither was implemented:
   - `getEnsembleMean(lat, lon)` from `lib/openMeteo.ts` → ensemble mean + spread for the same location
   - `getClimatology(lat, lon, forecastDates)` from `lib/climatology.ts` → each forecast day's P90 and historical max for its own day-of-year window (see Section 3 for why this was planned as a day-of-year window, not a calendar month); would have checked KV cache first and computed from the ERA5 archive on a cache miss
5. The original design called for `computeConsensus()` (pure function, no network calls, see `IMPLEMENTATION_PLAN.md` Section 6) to run **synchronously in the server component** once all three calls resolved, combining the forecast values with the climatology thresholds. This was not implemented.
6. The original design would have rendered a consensus number, severity tier, divergence badge, and ensemble chart server-side. The current page renders the model comparison and divergence badge only.
7. The original design called for a failed module to fall back to `public/cache/fallback-demo-data.json` for that one piece. That cached fallback was not implemented.

**Why the design called for parallel, not sequential calls:** climatology (ERA5 archive query) would have been the slowest call. If it ran after the forecast call instead of alongside it, the user would wait for both durations added together instead of just the slower one. This parallel flow was planned but not implemented.

---

## 3. The caching layer — why it exists and exactly where it sits

**The problem it solves:** Vercel serverless functions do not keep memory between invocations. Two requests five seconds apart might run on two completely different function instances with no shared state. An in-memory cache (a plain JS object or `Map`) would appear to work in local dev and then silently do nothing in production — every request would recompute the expensive 10-year archive query, which is both slow and wasteful against Open-Meteo's rate limits.

**The planned fix, not implemented:** Vercel KV (Upstash Redis) — an actual persistent store that would survive across invocations, reachable from any function instance.

**What would have gone in it:**
| Cache key pattern | What's stored | TTL |
|---|---|---|
| `climatology:{lat}:{lon}:{dayOfYearBucket}` | `{ p90Mm, maxMm }` for that bucket | 30 days |
| `ensemble:{lat}:{lon}:{runHour}` | ensemble mean + spread array | 1 hour |

**Why the design called for day-of-year buckets, not calendar months — correction from an earlier draft.** The forecast is daily (one precipitation value per calendar day). The planned historical comparison would need to match that same granularity and the same part of the year, not a coarser "whole month" bucket. A 15-day forecast starting near a month boundary (e.g., days spanning late November into early December) would otherwise get climatology computed against only one of those two months for some days, which is an actual mismatch, not just an approximation. The proposed fix was `dayOfYearBucket = Math.floor(dayOfYear / 10)`, giving 36 buckets per year (~10 calendar days each). For a given forecast date, the design called for pooling historical daily `precipitation_sum` values from that same ±~10-day window across the last 10 years (roughly 10 years × 21 days ≈ 210 data points) and computing P90 and max from that pooled set. This would have kept the comparison seasonally local and matched to the forecast's own daily resolution; the bucket size was intended to give a statistically reasonable sample without needing decades of data. This calculation was not implemented.

**What would not have gone in KV:** the point forecast (IFS/AIFS) itself. It changes every 6 hours and is cheap/fast to fetch fresh each time — caching it would risk showing a stale forecast number, which is worse than the small latency saved.

---

## 4. Why a monolith, not microservices

One Next.js app, no separate backend or message queue. The original design allowed KV as its only data store, but KV was not implemented. For a 72-hour single-session build with one developer (assisted by one AI agent), every additional service is a new thing that can fail, a new thing to deploy, and a new thing to explain in the written answers. The planned **consensus algorithm and climatology-aware severity tiers** were not implemented.

---

## 5. Component responsibility map (includes unimplemented design components)

| Component | Owns | Does NOT own |
|---|---|---|
| `CitySearch.tsx` | Text input, geocoding call, navigation | Any weather data rendering |
| `ConsensusCard.tsx` | Displaying the single consensus number + inline `SeverityBadge` | Computing the consensus value (that's `lib/consensus.ts`) |
| `SeverityBadge.tsx` | Rendering tier as icon + text + color | Deciding which tier applies |
| `DivergenceBadge.tsx` | Rendering the mm-difference badge | Computing the divergence threshold |
| `EnsembleChart.tsx` | Rendering two separate Recharts bands | Fetching ensemble data (that's the API route) |
| `LimitationsPanel.tsx` | Displaying the approved copy text, collapsed by default | Nothing else — this is intentionally a dumb, static component |
| `lib/openMeteo.ts` | All external HTTP calls, typed responses, typed errors | Any business logic, any caching decisions |
| `lib/consensus.ts` | The pure algorithm | Any I/O of any kind |
| `lib/climatology.ts` | KV read/write + percentile math | Raw API fetching (delegates to `openMeteo.ts`) |

The original design called for this separation so that `lib/consensus.ts` could be unit-tested with zero network calls and zero mocking — pass it four numbers, get back a typed result, done. The consensus module was not implemented.

---

## 6. Failure modes and planned handling (unimplemented rows describe the original design)

| Failure | Where it's caught | User-visible result |
|---|---|---|
| Open-Meteo forecast API down | `lib/openMeteo.ts` throws `WeatherApiError` | The original design called for `fallback-demo-data.json` for 3–4 cached cities; that fallback was not implemented. The current page shows a readable error. |
| Ensemble call fails but forecast succeeds | The design called for an isolated try/catch around the ensemble fetch | The design would have kept the consensus card and severity tier visible and shown "uncertainty data unavailable" in the ensemble chart; these features were not implemented. |
| KV unreachable | The design called for `lib/climatology.ts` to catch the error and compute live without caching | This graceful fallback was planned but not implemented. |
| Historical archive query exceeds an undiscovered date-range limit | The design called for `openMeteo.ts` to retry by chunking into yearly requests and merging | This climatology recovery was planned but not implemented. |
| City not found by geocoding | Returns empty result array | UI shows "no matching city found, try again" |

---

## 7. What this architecture explicitly does not attempt

- No model retraining, no GPU inference, no new neural network of any kind. Every "AI" claim in this app is about consuming existing AI model output (AIFS), never producing new ML.
- No user accounts, no persistence of user history, no analytics pipeline.
- No real-time push updates (websockets, polling) — a forecast refreshed on page load is sufficient; weather forecasts don't change fast enough within a demo session to need live updates.

Keeping this list explicit is intentional — it is as important to state what was deliberately left out as what was built, both for your own scope discipline during the build and for your written answers afterward.
