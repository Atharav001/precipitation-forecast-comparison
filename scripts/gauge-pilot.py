"""Exploratory station check; never use this sparse sample to tune app weights."""

import json
import statistics
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
STATIONS = {
    "Bengaluru": {"id": "IN009010100", "distance_km": 1.3},
    "Jaisalmer": {"id": "IN019140400", "distance_km": 2.3},
    "Shimla": {"id": "IN007101600", "distance_km": 0.5},
}
MODELS = ("IFS", "AIFS", "Equal blend", "App blend")


def observations(station_id):
    params = urllib.parse.urlencode({
        "dataset": "daily-summaries",
        "dataTypes": "PRCP",
        "stations": station_id,
        "startDate": "2026-04-16",
        "endDate": "2026-10-21",
        "units": "metric",
        "includeAttributes": "true",
        "format": "json",
    })
    url = "https://www.ncei.noaa.gov/access/services/data/v1?" + params
    with urllib.request.urlopen(url, timeout=40) as response:
        records = json.load(response)
    values = {}
    for record in records:
        flags = record.get("PRCP_ATTRIBUTES", "").split(",")
        if "PRCP" not in record or len(flags) < 2 or flags[1]:
            continue
        value = float(record["PRCP"])
        if value >= 0:
            values[record["DATE"]] = value
    return values


def main():
    forecast_rows = json.loads((ROOT / "backtest-results.json").read_text())["rows"]
    result = {
        "source": "NOAA NCEI daily-summaries PRCP; nearest available checked stations",
        "warning": "Station observation accumulation windows and model local-calendar days were not confirmed identical. This sparse, selected pilot cannot calibrate weights or badges.",
        "cities": {},
    }
    for city, station in STATIONS.items():
        observed = observations(station["id"])
        by_model = {}
        for model in MODELS:
            matched = [row for row in forecast_rows if row["city"] == city and row["model"] == model and row["date"] in observed]
            by_model[model] = {
                "n": len(matched),
                "mae_mm": round(statistics.mean(abs(row["predicted_mm"] - observed[row["date"]]) for row in matched), 3) if matched else None,
            }
        result["cities"][city] = {
            "station_id": station["id"],
            "distance_km": station["distance_km"],
            "usable_observation_days_in_period": len(observed),
            "paired_forecast_days": by_model["IFS"]["n"],
            "models": by_model,
        }
    (ROOT / "gauge-pilot-results.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
