## Current Build Status

Due to time constraints, this build includes city geocoding, a seven-day IFS versus AIFS precipitation comparison, a divergence badge, and a limitations panel. Historical severity tiers, the weighted consensus algorithm, ensemble bands, a map, and Vercel KV caching were part of the original design and were not implemented in this build.

# PreciCast

PreciCast lets you search for a city and compare daily precipitation forecasts from ECMWF's physics-based IFS model and AI-based AIFS model. It flags days when the models disagree by more than the project's stated threshold and explains the limits of applying research on other AI weather models to AIFS.

Run locally with `npm install` and `npm run dev`.
