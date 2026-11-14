"""Reproduce a small archived IFS/AIFS precipitation check against ERA5.

ERA5 is reanalysis, not independent rain-gauge truth. This is an exploratory
data/skill diagnostic, not a validation of forecast accuracy.
"""

import json
import math
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path


CITIES = {
    "Bengaluru": (12.97194, 77.59369),
    "Mumbai": (19.07283, 72.88261),
    "Jaisalmer": (26.91763, 70.90387),
    "Shimla": (31.10442, 77.16662),
    "London, UK": (51.50853, -0.12574),
}
RUNS = ["2026-04-15T00:00", "2026-06-15T00:00", "2026-08-15T00:00", "2026-10-15T00:00"]
FIELDS = ("precipitation_ecmwf_ifs025", "precipitation_ecmwf_aifs025_single")
MODELS = ("IFS", "AIFS", "Equal blend", "App blend")


def get_json(host, params):
    url = host + "?" + urllib.parse.urlencode(params)
    for attempt in range(3):
        try:
            with urllib.request.urlopen(url, timeout=40) as response:
                return json.load(response)
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 2:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("Unreachable")


def full_days(hourly):
    if hourly.get("time") is None or len(hourly["time"]) == 0:
        return {}
    buckets = defaultdict(lambda: [[], []])
    for index, timestamp in enumerate(hourly["time"]):
        day = timestamp[:10]
        for model_index, field in enumerate(FIELDS):
            series = hourly.get(field)
            if not isinstance(series, list) or index >= len(series):
                continue
            buckets[day][model_index].append(series[index])
    result = {}
    for day, pair in buckets.items():
        if any(len(values) != 24 or any(value is None or not isinstance(value, (int, float)) or not math.isfinite(value) or value < -1 for value in values) for values in pair):
            continue
        result[day] = [round(sum(max(0, value) for value in values), 3) for values in pair]
    return result


def metrics(rows):
    if not rows:
        return None
    errors = [row["predicted_mm"] - row["era5_mm"] for row in rows]
    return {
        "n": len(rows),
        "mae_mm": round(statistics.mean(abs(error) for error in errors), 3),
        "bias_mm": round(statistics.mean(errors), 3),
        "rmse_mm": round(math.sqrt(statistics.mean(error * error for error in errors)), 3),
    }


def seasonal_day(value):
    parsed = date.fromisoformat(value)
    if parsed.month == 2 and parsed.day == 29:
        return None
    return (date(2021, parsed.month, parsed.day) - date(2021, 1, 1)).days


def percentile(values, fraction):
    position = (len(values) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    return values[lower] + (values[upper] - values[lower]) * (position - lower)


def historical_thresholds(history, target):
    target_day = seasonal_day(target)
    if target_day is None:
        target_day = seasonal_day(target[:4] + "-02-28")
    values = []
    for day, value in history.items():
        day_number = seasonal_day(day)
        if day_number is None or value is None:
            continue
        distance = abs(day_number - target_day)
        if min(distance, 365 - distance) <= 10:
            values.append(max(0, value))
    values.sort()
    if len(values) < 150:
        raise ValueError("Insufficient historical sample")
    return percentile(values, 0.9), values[-1]


def main():
    rows = []
    skips = []
    for city, (latitude, longitude) in CITIES.items():
        archive = get_json("https://archive-api.open-meteo.com/v1/archive", {
            "latitude": latitude, "longitude": longitude,
            "start_date": "2026-04-16", "end_date": "2026-10-22",
            "daily": "precipitation_sum", "models": "era5", "timezone": "auto", "precipitation_unit": "mm",
        })
        if archive.get("daily_units", {}).get("precipitation_sum") != "mm":
            raise ValueError("ERA5 precipitation unit is not mm")
        truth = dict(zip(archive["daily"]["time"], archive["daily"]["precipitation_sum"]))
        historical = get_json("https://archive-api.open-meteo.com/v1/archive", {
            "latitude": latitude, "longitude": longitude,
            "start_date": "2016-01-01", "end_date": "2025-12-31",
            "daily": "precipitation_sum", "models": "era5", "timezone": "auto", "precipitation_unit": "mm",
        })
        if historical.get("daily_units", {}).get("precipitation_sum") != "mm":
            raise ValueError("Historical precipitation unit is not mm")
        history = dict(zip(historical["daily"]["time"], historical["daily"]["precipitation_sum"]))
        for run in RUNS:
            forecast = get_json("https://single-runs-api.open-meteo.com/v1/forecast", {
                "latitude": latitude, "longitude": longitude,
                "run": run, "hourly": "precipitation",
                "models": "ecmwf_ifs025,ecmwf_aifs025_single",
                "forecast_days": 7, "timezone": "auto", "precipitation_unit": "mm",
            })
            units = forecast.get("hourly_units", {})
            if any(units.get(field) != "mm" for field in FIELDS):
                raise ValueError(f"Forecast precipitation unit is not mm for {city} {run}")
            full = full_days(forecast["hourly"])
            run_day = date.fromisoformat(run[:10])
            for lead in range(1, 7):
                day = (run_day + timedelta(days=lead)).isoformat()
                pair = full.get(day)
                observed = truth.get(day)
                if pair is None or observed is None or not math.isfinite(observed):
                    skips.append({"city": city, "run": run, "date": day, "reason": "Incomplete forecast or ERA5 day"})
                    continue
                ifs, aifs = pair
                p90, historical_max = historical_thresholds(history, day)
                higher = max(ifs, aifs)
                if higher > 0 and historical_max > 0 and higher >= 0.95 * historical_max:
                    tier, weight = "SEVERE_OUTLIER", 0.8
                elif higher > 0 and higher >= p90:
                    tier, weight = "LOCALLY_UNUSUAL", 0.65
                else:
                    tier, weight = "ROUTINE", 0.4
                flagged = abs(ifs - aifs) > max(2, 0.25 * higher)
                for model, predicted in (("IFS", ifs), ("AIFS", aifs), ("Equal blend", (ifs + aifs) / 2), ("App blend", weight * ifs + (1 - weight) * aifs)):
                    rows.append({"city": city, "run": run, "lead_day": lead, "date": day, "model": model, "predicted_mm": round(predicted, 3), "era5_mm": observed, "tier": tier, "divergence_flag": flagged})
            time.sleep(0.15)
    summary = {
        "method": "Full 24-hour local-day sums from archived 00 UTC model runs; ERA5 daily reanalysis proxy; leads 1-6 only",
        "runs": RUNS,
        "cities": list(CITIES),
        "samples_per_model": len([row for row in rows if row["model"] == "IFS"]),
        "skips": skips,
        "overall": {model: metrics([row for row in rows if row["model"] == model]) for model in MODELS},
        "by_city": {city: {model: metrics([row for row in rows if row["city"] == city and row["model"] == model]) for model in MODELS} for city in CITIES},
        "by_lead": {str(lead): {model: metrics([row for row in rows if row["lead_day"] == lead and row["model"] == model]) for model in MODELS} for lead in range(1, 7)},
        "divergence": {str(flag): {model: metrics([row for row in rows if row["model"] == model and row["divergence_flag"] == flag]) for model in MODELS} for flag in (False, True)},
        "tiers": {tier: len([row for row in rows if row["model"] == "IFS" and row["tier"] == tier]) for tier in ("ROUTINE", "LOCALLY_UNUSUAL", "SEVERE_OUTLIER")},
        "rows": rows,
    }
    output = Path(__file__).with_name("backtest-results.json")
    output.write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({key: value for key, value in summary.items() if key != "rows"}, indent=2))
    print(f"Wrote {output}")


if __name__ == "__main__":
    main()
