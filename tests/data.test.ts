import assert from "node:assert/strict";
import { test } from "node:test";
import { computeConsensus } from "../lib/consensus";
import { computeDivergence } from "../lib/divergence";
import { getPointForecast, getEnsembleForecast, geocodeCity, WeatherApiError } from "../lib/openMeteo";
import { getClimatology } from "../lib/climatology";
import { loadForecast } from "../lib/forecast-state";

function mockJson(value: unknown) {
  globalThis.fetch = async () => new Response(JSON.stringify(value), { status: 200, headers: { "content-type": "application/json" } });
}
const week = Array.from({ length: 7 }, (_, index) => `2026-11-${String(14 + index).padStart(2, "0")}`);

test("geocoding preserves regions for same-name cities", async () => {
  mockJson({ results: [
    { id: 1, name: "London", admin1: "England", country: "United Kingdom", latitude: 51.5, longitude: -0.1 },
    { id: 2, name: "London", admin1: "Ontario", country: "Canada", latitude: 42.98, longitude: -81.24 },
    { id: 3, name: "London", admin1: "Ohio", country: "United States", latitude: 39.88, longitude: -83.45 }
  ] });
  const cities = await geocodeCity("London");
  assert.deepEqual(cities.map(city => [city.id, city.region, city.country]), [
    [1, "England", "United Kingdom"], [2, "Ontario", "Canada"], [3, "Ohio", "United States"]
  ]);
});

test("geocoding rejects an out-of-range location", async () => {
  mockJson({ results: [{ name: "Broken", country: "Nowhere", latitude: 120, longitude: 0 }] });
  await assert.rejects(geocodeCity("Broken"), (error: unknown) => error instanceof WeatherApiError && error.code === "BAD_RESPONSE");
});

test("failed live forecast has a readable retry state and never uses expired data", async () => {
  const result = await loadForecast(12.97, 77.59, async () => { throw new WeatherApiError("upstream unavailable", "NETWORK"); });
  assert.deepEqual(result, { forecast: null, error: "Forecast temporarily unavailable. Please retry shortly." });
  const invalid = await loadForecast(999, 0, async () => { throw new WeatherApiError("Invalid latitude", "INVALID_INPUT"); });
  assert.equal(invalid.error, "Invalid latitude or longitude. Choose a city from search.");
});

test("divergence threshold and tier boundaries", () => {
  assert.equal(computeDivergence({ ifsValueMm: 10, aifsValueMm: 12 }).divergenceFlag, false);
  assert.equal(computeDivergence({ ifsValueMm: 10, aifsValueMm: 13 }).divergenceFlag, false);
  assert.equal(computeDivergence({ ifsValueMm: 10, aifsValueMm: 14 }).divergenceFlag, true);
  assert.equal(computeConsensus({ ifsValueMm: 0, aifsValueMm: 0, climatologyP90Mm: 0, climatologyMaxMm: 0 }).tier, "ROUTINE");
  assert.equal(computeConsensus({ ifsValueMm: 10, aifsValueMm: 8, climatologyP90Mm: 10, climatologyMaxMm: 50 }).tier, "LOCALLY_UNUSUAL");
  assert.equal(computeConsensus({ ifsValueMm: 19, aifsValueMm: 12, climatologyP90Mm: 10, climatologyMaxMm: 20 }).tier, "SEVERE_OUTLIER");
});

test("point forecast preserves missing data and clips small negative artefacts", async () => {
  mockJson({ timezone: "Asia/Kolkata", daily_units: { precipitation_sum_ecmwf_ifs025: "mm", precipitation_sum_ecmwf_aifs025_single: "mm" }, daily: { time: week, precipitation_sum_ecmwf_ifs025: [-0.2, null, 0, 0, 0, 0, 0], precipitation_sum_ecmwf_aifs025_single: [2.5, 3, 0, 0, 0, 0, 0] } });
  const result = await getPointForecast(12.97, 77.59);
  assert.equal(result.daily[0].ifsValueMm, 0);
  assert.equal(result.daily[1].ifsValueMm, null);
  assert.equal(result.daily[1].aifsValueMm, 3);
});

test("point forecast rejects malformed units", async () => {
  mockJson({ daily_units: { precipitation_sum_ecmwf_ifs025: "inch", precipitation_sum_ecmwf_aifs025_single: "mm" }, daily: { time: ["2026-11-14"], precipitation_sum_ecmwf_ifs025: [1], precipitation_sum_ecmwf_aifs025_single: [2] } });
  await assert.rejects(getPointForecast(12.97, 77.59), (error: unknown) => error instanceof WeatherApiError && error.code === "BAD_RESPONSE");
});

test("point forecast keeps one available model when the other series is deleted", async () => {
  mockJson({ timezone: "UTC", daily_units: { precipitation_sum_ecmwf_ifs025: "mm" }, daily: { time: week, precipitation_sum_ecmwf_ifs025: [4.2, 0, 0, 0, 0, 0, 0] } });
  const result = await getPointForecast(12.97, 77.59);
  assert.equal(result.daily[0].ifsValueMm, 4.2);
  assert.equal(result.daily[0].aifsValueMm, null);
});

test("point forecast rejects a fully missing model response", async () => {
  mockJson({ daily_units: {}, daily: { time: ["2026-11-14"] } });
  await assert.rejects(getPointForecast(12.97, 77.59), (error: unknown) => error instanceof WeatherApiError && error.code === "BAD_RESPONSE");
});

test("point forecast rejects shortened, invalid, or gapped date series", async () => {
  for (const dates of [week.slice(0, 6), [...week.slice(0, 3), "2026-11-31", ...week.slice(4)], [...week.slice(0, 3), "2026-11-18", ...week.slice(4)]]) {
    mockJson({ timezone: "UTC", daily_units: { precipitation_sum_ecmwf_ifs025: "mm" }, daily: { time: dates, precipitation_sum_ecmwf_ifs025: dates.map(() => 1) } });
    await assert.rejects(getPointForecast(12.97, 77.59), (error: unknown) => error instanceof WeatherApiError && error.code === "BAD_RESPONSE");
  }
});

test("point forecast rejects a missing timezone", async () => {
  mockJson({ daily_units: { precipitation_sum_ecmwf_ifs025: "mm" }, daily: { time: week, precipitation_sum_ecmwf_ifs025: week.map(() => 1) } });
  await assert.rejects(getPointForecast(12.97, 77.59), (error: unknown) => error instanceof WeatherApiError && error.code === "BAD_RESPONSE");
});

test("ensemble bands use separate members and tolerate missing members", async () => {
  const daily: Record<string, unknown> = { time: week };
  const units: Record<string, string> = {};
  for (const model of ["ecmwf_ifs025_ensemble", "ecmwf_aifs025_ensemble"]) {
    for (let n = 1; n <= 10; n++) {
      const key = `precipitation_sum_member${String(n).padStart(2, "0")}_${model}`;
      daily[key] = week.map(() => model.startsWith("ecmwf_ifs") ? n : n * 2);
      units[key] = "mm";
    }
  }
  mockJson({ daily, daily_units: units });
  const result = await getEnsembleForecast(12.97, 77.59);
  assert.equal(result.daily[0].ifs?.memberCount, 10);
  assert.equal(result.daily[0].ifs?.meanMm, 5.5);
  assert.equal(result.daily[0].aifs?.meanMm, 11);
  assert.ok(result.daily[0].ifs!.p90Mm < result.daily[0].aifs!.p90Mm);
});

test("climatology uses ten complete calendar years and a seasonal window", async () => {
  const lastYear = new Date().getUTCFullYear() - 1;
  const start = new Date(Date.UTC(lastYear - 9, 0, 1));
  const end = new Date(Date.UTC(lastYear, 11, 31));
  const time: string[] = [];
  const rainfall: number[] = [];
  for (let current = start; current <= end; current = new Date(current.getTime() + 86400000)) {
    time.push(current.toISOString().slice(0, 10));
    rainfall.push(current.getUTCMonth() === 10 ? 20 : 0);
  }
  mockJson({ daily: { time, precipitation_sum: rainfall }, daily_units: { precipitation_sum: "mm" } });
  const result = await getClimatology(12.97, 77.59, [`${lastYear + 1}-11-14`]);
  assert.equal(result.period.start, `${lastYear - 9}-01-01`);
  assert.equal(result.daily[0].p90Mm, 20);
  assert.equal(result.daily[0].maxMm, 20);
  assert.ok(result.daily[0].sampleSize >= 200);
});
