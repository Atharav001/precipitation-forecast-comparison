## Current Build Status

Due to time constraints, the current build includes city geocoding, a seven-day IFS versus AIFS precipitation comparison, a divergence badge, and a limitations panel. The historical severity tiers, weighted consensus algorithm, ensemble bands, map, and Vercel KV caching described below were part of the original design and were not implemented in this build.

# What We're Actually Building — Plain Language Version

> This file is for you (Atharav), not the AI agent. You need to be able to explain this project in your own words for the written answers and video — no AI allowed there. Read this until you could explain it to a friend without notes.

---

## The one-sentence version

We're building a weather app that shows two different rain forecasts side by side instead of one — a traditional physics-based one and a newer AI-based one — and when they disagree, or when the forecast looks unusually extreme for that place, the app tells you so clearly instead of hiding it.

---

## Why this is actually interesting, not just "another weather app"

In recent years, AI models have become competitive at weather forecasting. A 2026 study found that several AI models performed worse than a physics-based model on record-breaking heat, cold, and wind. The study did not test precipitation or AIFS, so it does not tell us which of the two models in this app will be more accurate for rainfall.

Every weather app you've ever used hides this. They just show you one number and expect you to trust it. We're building the app that doesn't do that.

---

## What the app actually does, step by step

1. **You type in a city.**
2. **The app asks two different weather models for a rain forecast**: one called IFS (the traditional, physics-simulation kind, used by ECMWF — the main European weather agency) and one called AIFS (ECMWF's own newer AI model).
3. **It shows you both numbers.** If they're close, great, you see one clean, agreed-on forecast.
4. **If they disagree by a meaningful amount**, the app flags it — "these two models disagree by X mm" — instead of silently averaging them and hoping you don't notice.
5. **It also checks history.** The app looks up that exact city's own rainfall history for the past ~10 years. If today's forecast is unusually high compared to that city's own normal range, it says so — "this is Locally Unusual for this place" (happens a few times a year) or, if it's really extreme, "Severe Outlier" (approaching or beyond anything in that city's recent record).
6. **The original design proposed a Severe Outlier tier**, but this was not built. A rainfall forecast must not be treated as a lower bound based on the cited study.
7. **There's also an uncertainty band** — instead of one single line on a chart, you see a shaded range showing how much the forecast could vary, which is a more honest way to show a forecast than a single confident-looking number.

---

## The one clever trick in the middle: "Consensus Forecast"

The original design proposed a weighted consensus forecast, but it was not implemented. The proposed weights were a heuristic, not a result validated for rainfall. Before adding a blended number, we would need to compare it with both individual models on past forecasts and observed or clearly labelled reanalysis rainfall.

---

## Why we're being careful about exact wording (and you should be too, in your written answers)

Two important nuances, so you don't accidentally overclaim in an interview or write-up:

1. The research paper tested GraphCast, Pangu-Weather, and Fuxi on heat, cold, and wind records. It tested **neither AIFS nor precipitation**. The app's disagreement badge shows a difference between forecasts, not proof that one rainfall model is more accurate. Say it that way if asked.
2. "Unusual" and "record-breaking" are not the same thing. Something can be unusual for a city (happens a few times a year) without being anywhere close to that city's actual historical record. We built two separate tiers so we're not crying wolf — Locally Unusual for "notably high," Severe Outlier reserved for genuinely rare events near or beyond the historical max.

---

## Why this is a good project for a lab that studies uncertainty and climate science

The lab you're applying to (QUEST Lab) works on exactly this kind of problem — using AI for ocean and climate science, and specifically caring about uncertainty quantification (how confident should we be in a model's output, and when should we not trust it blindly). This project isn't just "an app that uses AI" — it's an app whose entire point is being honest about when AI forecasts should and shouldn't be trusted, which is directly the kind of thinking that research area cares about.

---

## What we deliberately did NOT do, and why that's fine

- We didn't train our own AI model. We're using existing, already-trained models (IFS and AIFS) through a free API, and building smart logic and a good interface around their outputs. That's a legitimate, honest scope for a 72-hour project — trying to train a real model in that time would likely produce something broken or meaningless, which would look worse, not better.
- We didn't build hyper-local, minute-by-minute nowcasting (the kind of feature paid apps advertise) — that needs radar infrastructure we don't have access to.
- We kept the tech simple on purpose: one web app, no separate backend servers, no user accounts. The interesting part of this project is the idea and the judgment behind it, not how many moving technical parts it has.
