# DECISIONS — Why this plan is shaped the way it is

> This file exists so that if something in `IMPLEMENTATION_PLAN.md` or `ARCHITECTURE.md` seems arbitrary, odd, or overly cautious, you (agent or human) can check here before changing it. Several entries exist specifically because an earlier draft of this plan got something wrong and was corrected — those are marked **(correction)** so the reasoning for the guardrail is traceable.

---

## 1. Why precipitation forecasting, not traffic simulation or PDE-solving

Rejected alternatives and why:
- **Traffic simulation (SUMO/agent-based)**: richer research literature, but real environment friction (OSM import, RL tuning) creates a higher chance of an incomplete demo within one 72-hour session.
- **PDE-solving-as-a-service (neural operators)**: closest to the hiring lab's own research area, but requires real scientific-ML depth (training or fine-tuning a neural operator) that is the highest-risk path to a broken or hollow demo if that background isn't already solid.
- **Precipitation forecasting**: free, zero-auth, well-documented APIs (Open-Meteo) remove almost all environment-setup risk, the core skill required (full-stack + API integration) matches existing strengths, and — critically — the research literature on *where AI forecasting fails* is unusually rich and recent (2026 papers), giving real material for a differentiated feature, not just a wrapper around an API.

## 2. Why "expose disagreement" instead of "pick the best model and show one number"

Every mainstream consumer weather app either shows one blended number (hiding disagreement) or lets a user manually flip between models (Windy, Tomorrow.io) without ever computing or flagging disagreement automatically. Real user complaints collected during research show people are already confused when two sources disagree and have no way to understand why. Showing that disagreement, with context, is both more honest and a genuine feature gap in the existing market.

## 3. Why these exact consensus weight numbers (0.8/0.2, 0.65/0.35, 0.4/0.6) **(correction)**

An earlier version of this plan implied these weights were empirically derived from the research. They are not — they are a **deliberately simple, explainable heuristic** inspired by one real finding (AI models underperform physics models specifically on extreme/record-breaking events; physics and AI are roughly comparable on routine forecasts, with AI sometimes ahead). The weights are round numbers chosen so the logic is auditable and explainable in one sentence, not numbers tuned against any dataset. Do not present this as "AI-calibrated weighting" in any write-up — it is a rule-based heuristic, stated as such.

## 4. Why "Locally Unusual" and "Severe Outlier," not "record-breaking" for both tiers **(correction)**

The original draft used "record-breaking" for any forecast above the 90th percentile of local history. The actual Science Advances study defined record-breaking as breaking a multi-decade historical maximum — a much rarer, more extreme event than "above P90," which happens multiple times per year in most climates. Conflating the two is a real research-accuracy error. The two-tier system (Locally Unusual = P90, Severe Outlier = near/above historical max) preserves the useful UX of a graduated warning while keeping each label scientifically honest.

## 5. Why AIFS is discussed with explicit hedging, not stated as "proven to underpredict extremes" **(correction)**

The tested models in the key cited research (GraphCast, Pangu-Weather, Fuxi) are not AIFS. AIFS shares the general approach (graph neural network trained on reanalysis data) but was not itself in that study's test set. The approved copy text in `IMPLEMENTATION_PLAN.md` Section 7 is deliberately worded to say "shares its underlying approach" and "we apply the same caution here" rather than stating AIFS was directly tested. This distinction is exactly the kind of thing a domain-expert reviewer would catch, and getting it right is a stronger signal of judgment than a bolder, less accurate claim would be.

## 6. Why two separate ensemble bands, never merged **(correction)**

IFS and AIFS ensembles use different perturbation methodologies and member counts. Member #1 of one is not a paired counterpart to member #1 of the other. An earlier draft of the chart design risked implying comparability by rendering them as one combined band. Keeping them visually and structurally separate preserves the actual meaning of each ensemble's spread.

## 7. Why Vercel KV instead of an in-memory cache **(correction)**

An earlier draft said to "cache climatology aggressively" without specifying a mechanism, implicitly assuming an in-memory object would work. On Vercel's serverless platform, function instances are ephemeral and don't share memory across invocations — an in-memory cache would appear to work in local development and then do nothing in production, silently defeating the entire point of caching (both the latency benefit and the rate-limit protection). Vercel KV is the minimal real fix: a few lines of SDK code, free at this scale, and it actually persists.

## 8. Why a tiered, cuttable scope with a hard hour-40 checkpoint

Three non-trivial data pipelines (consensus, ensemble, climatology) plus full UI, deployment, video, and written answers in one session is ambitious. An earlier draft listed all three as equally essential without a fallback plan. The tiering (Must / Should / Stretch) with an explicit checkpoint exists so that a delay in the hardest, least-certain piece (climatology/Severe Outlier, which depends on an unverified API date-range limit) doesn't cascade into cutting into Day 3's testing and submission time — which is the single most common way a timed build goes from "good project, bad submission" to just "bad submission."

## 9. Why a static fallback dataset exists at all

Live judging may involve the deployed app being opened by someone whose request happens to hit a rate limit, a transient Open-Meteo outage, or a slow cold start. A pre-fetched fallback dataset for a handful of representative cities, shown with a visible "cached data" notice rather than failing silently, is a small amount of extra work that directly protects the single highest-stakes moment this project has: someone else opening the live link.

## 10. Why no database, no auth, no microservices

Every additional moving part is a new way to fail inside a hard 72-hour, single-continuous-session constraint, and none of them are required to demonstrate the actual thesis of this project (that model disagreement and historical context are worth surfacing, not hiding). Complexity was deliberately minimized everywhere except the two places the research actually justifies it: the consensus algorithm and the climatology-aware severity tiers.

## 11. Why Server Components call the data layer directly instead of through self-hosted API routes **(correction)**

An earlier draft had `/app/forecast/[city]/page.tsx` fetching from its own `/api/forecast`, `/api/ensemble`, and `/api/climatology` routes over HTTP. That's a real mistake, not a style choice: a Next.js Server Component already runs server-side, so routing through your own API layer adds a pointless network hop, serialization overhead, and one more place a request can fail, for zero benefit. Self-hosted routes (or, better, a Server Action) are only justified when the *browser* itself needs to trigger server work directly — which, in this app, is just the city search box. Everything the forecast page needs is a plain function call in the same process.

## 12. Why climatology is bucketed by day-of-year, not by calendar month **(correction)**

The forecast is daily. An earlier draft compared each day's forecast against a climatology computed once per calendar month, which mismatches near month boundaries (a 15-day forecast spanning two months would apply one month's climatology to days that actually belong to the next month) and is coarser than it needs to be. Bucketing by ~10-day day-of-year windows keeps the historical comparison matched to the same time scale and same part of the year as the actual forecast day being evaluated, while still pooling enough historical data points (roughly 210, across 10 years) for the percentile calculation to be meaningful.

## 13. What we are explicitly not claiming, anywhere, ever

- Not claiming to have trained or fine-tuned any model.
- Not claiming AIFS was the model tested in the cited extreme-event research.
- Not claiming the consensus weights are empirically optimal — they are an explainable heuristic.
- Not claiming no other app shows multiple models (some do) — the claim is specifically about automatic divergence flagging and climatology-anchored severity tiers, which is the actual, narrower, defensible gap found in research.
