import type { CityLocation, EnsembleBand, EnsembleData, ForecastData } from "@/types/weather";
import { MIN_ENSEMBLE_MEMBERS } from "@/lib/constants";

type ErrorCode = "INVALID_INPUT" | "NETWORK" | "HTTP" | "BAD_RESPONSE";

export class WeatherApiError extends Error {
  readonly code: ErrorCode;
  readonly status?: number;
  constructor(message: string, code: ErrorCode, status?: number) {
    super(message);
    this.name = "WeatherApiError";
    this.code = code;
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestJson(url: URL, revalidate?: number): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, revalidate === undefined ? { cache: "no-store" } : { next: { revalidate } }); }
  catch (error: unknown) { throw new WeatherApiError(`Open-Meteo request failed: ${error instanceof Error ? error.message : String(error)}`, "NETWORK"); }
  let body: unknown;
  try { body = await response.json(); }
  catch (error: unknown) { throw new WeatherApiError(`Open-Meteo returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`, "BAD_RESPONSE", response.status); }
  if (!response.ok) {
    const reason = isRecord(body) && typeof body.reason === "string" ? body.reason : response.statusText;
    throw new WeatherApiError(`Open-Meteo error: ${reason}`, "HTTP", response.status);
  }
  return body;
}

function finitePrecipitation(value: unknown): number | null {
  if (value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < -1) throw new WeatherApiError("Forecast contains an invalid precipitation value.", "BAD_RESPONSE");
  // Open-Meteo occasionally returns small negative rounding artefacts for precipitation.
  return Math.max(0, value);
}

function datesAndUnits(body: unknown, fields: string[], expectedDays?: number): { dates: string[]; daily: Record<string, unknown> } {
  if (!isRecord(body) || !isRecord(body.daily) || !isRecord(body.daily_units) || !Array.isArray(body.daily.time)) throw new WeatherApiError("Weather response has an unexpected shape.", "BAD_RESPONSE");
  const dates = body.daily.time;
  if (!dates.length || (expectedDays !== undefined && dates.length !== expectedDays) || !dates.every((date): date is string => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date))) throw new WeatherApiError("Weather response has invalid or incomplete dates.", "BAD_RESPONSE");
  const timestamps = dates.map(date => {
    const timestamp = Date.parse(`${date}T00:00:00Z`);
    if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) throw new WeatherApiError("Weather response has an invalid calendar date.", "BAD_RESPONSE");
    return timestamp;
  });
  if (timestamps.some((timestamp, index) => index > 0 && timestamp - timestamps[index - 1] !== 86_400_000)) throw new WeatherApiError("Weather response has missing or duplicate dates.", "BAD_RESPONSE");
  for (const field of fields) {
    if (!Array.isArray(body.daily[field]) || body.daily[field].length !== dates.length || body.daily_units[field] !== "mm") throw new WeatherApiError(`Weather response has missing ${field} values or units.`, "BAD_RESPONSE");
  }
  return { dates, daily: body.daily };
}

export async function geocodeCity(name: string): Promise<CityLocation[]> {
  if (name.trim().length < 2) throw new WeatherApiError("Enter at least two characters for a city.", "INVALID_INPUT");
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name.trim());
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  const body = await requestJson(url);
  if (!isRecord(body) || (body.results !== undefined && !Array.isArray(body.results))) throw new WeatherApiError("Geocoding response has an unexpected shape.", "BAD_RESPONSE");
  const results: unknown[] = body.results === undefined ? [] : body.results as unknown[];
  return results.map((item): CityLocation => {
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.country !== "string" || typeof item.latitude !== "number" || typeof item.longitude !== "number" || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude) || item.latitude < -90 || item.latitude > 90 || item.longitude < -180 || item.longitude > 180) throw new WeatherApiError("Geocoding result has an unexpected shape.", "BAD_RESPONSE");
    return {
      id: typeof item.id === "number" ? item.id : undefined,
      name: item.name,
      region: typeof item.admin1 === "string" && item.admin1.trim() ? item.admin1 : undefined,
      district: typeof item.admin2 === "string" && item.admin2.trim() ? item.admin2 : undefined,
      country: item.country,
      latitude: item.latitude,
      longitude: item.longitude
    };
  });
}

export async function getPointForecast(lat: number, lon: number): Promise<ForecastData> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new WeatherApiError("Invalid latitude or longitude.", "INVALID_INPUT");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("models", "ecmwf_ifs025,ecmwf_aifs025_single");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("precipitation_unit", "mm");
  const body = await requestJson(url);
  if (!isRecord(body) || !isRecord(body.daily) || !isRecord(body.daily_units)) throw new WeatherApiError("Forecast response has an unexpected shape.", "BAD_RESPONSE");
  const rawDaily: Record<string, unknown> = body.daily;
  const rawUnits: Record<string, unknown> = body.daily_units;
  const ifsField = "precipitation_sum_ecmwf_ifs025";
  const aifsField = "precipitation_sum_ecmwf_aifs025_single";
  const fields = [ifsField, aifsField].filter(field => rawDaily[field] !== undefined || rawUnits[field] !== undefined);
  if (!fields.length) throw new WeatherApiError("Both forecast model series are unavailable.", "BAD_RESPONSE");
  const { dates, daily: values } = datesAndUnits(body, fields, 7);
  const ifs = fields.includes(ifsField) ? values[ifsField] as unknown[] : Array(dates.length).fill(null);
  const aifs = fields.includes(aifsField) ? values[aifsField] as unknown[] : Array(dates.length).fill(null);
  const daily = dates.map((date, index) => {
    return { date, ifsValueMm: finitePrecipitation(ifs[index]), aifsValueMm: finitePrecipitation(aifs[index]) };
  });
  if (!daily.some(day => day.ifsValueMm !== null || day.aifsValueMm !== null)) throw new WeatherApiError("Both forecast models are unavailable.", "BAD_RESPONSE");
  if (typeof body.timezone !== "string" || !body.timezone) throw new WeatherApiError("Forecast response has no timezone.", "BAD_RESPONSE");
  return { coordinates: { latitude: lat, longitude: lon }, timezone: body.timezone, fetchedAt: new Date().toISOString(), source: "live", daily };
}

function quantile(sorted: number[], probability: number): number {
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function ensembleBand(daily: Record<string, unknown>, keys: string[], dayIndex: number): EnsembleBand | null {
  const members = keys.map(key => (daily[key] as unknown[])[dayIndex]).filter((value): value is number => typeof value === "number" && Number.isFinite(value) && value >= -1).map(value => Math.max(0, value)).sort((a, b) => a - b);
  if (members.length < MIN_ENSEMBLE_MEMBERS) return null;
  return { p10Mm: quantile(members, 0.1), medianMm: quantile(members, 0.5), p90Mm: quantile(members, 0.9), meanMm: members.reduce((sum, value) => sum + value, 0) / members.length, memberCount: members.length };
}

export async function getEnsembleForecast(lat: number, lon: number): Promise<EnsembleData> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new WeatherApiError("Invalid latitude or longitude.", "INVALID_INPUT");
  const url = new URL("https://ensemble-api.open-meteo.com/v1/ensemble");
  for (const [key, value] of Object.entries({ latitude: String(lat), longitude: String(lon), daily: "precipitation_sum", models: "ecmwf_ifs025_ensemble,ecmwf_aifs025_ensemble", forecast_days: "7", timezone: "auto", precipitation_unit: "mm" })) url.searchParams.set(key, value);
  const body = await requestJson(url, 3600);
  if (!isRecord(body) || !isRecord(body.daily) || !isRecord(body.daily_units)) throw new WeatherApiError("Ensemble response has an unexpected shape.", "BAD_RESPONSE");
  const ifsKeys = Object.keys(body.daily).filter(key => /^precipitation_sum_member\d+_ecmwf_ifs025_ensemble$/.test(key));
  const aifsKeys = Object.keys(body.daily).filter(key => /^precipitation_sum_member\d+_ecmwf_aifs025_ensemble$/.test(key));
  if (ifsKeys.length < MIN_ENSEMBLE_MEMBERS && aifsKeys.length < MIN_ENSEMBLE_MEMBERS) throw new WeatherApiError("Ensemble members are unavailable.", "BAD_RESPONSE");
  const { dates, daily } = datesAndUnits(body, [...ifsKeys, ...aifsKeys], 7);
  const result = dates.map((date, index) => ({ date, ifs: ifsKeys.length >= MIN_ENSEMBLE_MEMBERS ? ensembleBand(daily, ifsKeys, index) : null, aifs: aifsKeys.length >= MIN_ENSEMBLE_MEMBERS ? ensembleBand(daily, aifsKeys, index) : null }));
  if (!result.some(day => day.ifs || day.aifs)) throw new WeatherApiError("Ensemble values are unavailable.", "BAD_RESPONSE");
  return { daily: result, fetchedAt: new Date().toISOString() };
}

export async function getHistoricalPrecipitation(lat: number, lon: number, start: string, end: string): Promise<{ dates: string[]; values: Array<number | null> }> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new WeatherApiError("Invalid latitude or longitude.", "INVALID_INPUT");
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  for (const [key, value] of Object.entries({ latitude: String(lat), longitude: String(lon), start_date: start, end_date: end, daily: "precipitation_sum", models: "era5", timezone: "auto", precipitation_unit: "mm" })) url.searchParams.set(key, value);
  const body = await requestJson(url, 60 * 60 * 24 * 30);
  const { dates, daily } = datesAndUnits(body, ["precipitation_sum"]);
  if (dates[0] !== start || dates[dates.length - 1] !== end) throw new WeatherApiError("Historical rainfall record does not cover the requested dates.", "BAD_RESPONSE");
  return { dates, values: (daily.precipitation_sum as unknown[]).map(finitePrecipitation) };
}
