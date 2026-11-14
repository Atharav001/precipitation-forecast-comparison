import type { CityLocation, ForecastData } from "@/types/weather";

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

async function requestJson(url: URL): Promise<unknown> {
  let response: Response;
  try { response = await fetch(url, { cache: "no-store" }); }
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
    if (!isRecord(item) || typeof item.name !== "string" || typeof item.country !== "string" || typeof item.latitude !== "number" || typeof item.longitude !== "number") throw new WeatherApiError("Geocoding result has an unexpected shape.", "BAD_RESPONSE");
    return { name: item.name, country: item.country, latitude: item.latitude, longitude: item.longitude };
  });
}

export async function getPointForecast(lat: number, lon: number): Promise<ForecastData> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new WeatherApiError("Invalid latitude or longitude.", "INVALID_INPUT");
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("daily", "precipitation_sum");
  url.searchParams.set("models", "ecmwf_ifs025,ecmwf_aifs025_single");
  url.searchParams.set("forecast_days", "15");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("precipitation_unit", "mm");
  const body = await requestJson(url);
  if (!isRecord(body) || !isRecord(body.daily) || !isRecord(body.daily_units) || !Array.isArray(body.daily.time) || !Array.isArray(body.daily.precipitation_sum_ecmwf_ifs025) || !Array.isArray(body.daily.precipitation_sum_ecmwf_aifs025_single) || body.daily_units.precipitation_sum_ecmwf_ifs025 !== "mm" || body.daily_units.precipitation_sum_ecmwf_aifs025_single !== "mm") throw new WeatherApiError("Forecast response has an unexpected shape or units.", "BAD_RESPONSE");
  const dates: unknown[] = body.daily.time;
  const ifs: unknown[] = body.daily.precipitation_sum_ecmwf_ifs025;
  const aifs: unknown[] = body.daily.precipitation_sum_ecmwf_aifs025_single;
  if (dates.length === 0 || dates.length !== ifs.length || dates.length !== aifs.length) throw new WeatherApiError("Forecast model series have mismatched lengths.", "BAD_RESPONSE");
  const daily = dates.map((date, index) => {
    if (typeof date !== "string" || typeof ifs[index] !== "number" || !Number.isFinite(ifs[index]) || typeof aifs[index] !== "number" || !Number.isFinite(aifs[index])) throw new WeatherApiError("Forecast contains missing or invalid daily values.", "BAD_RESPONSE");
    return { date, ifsValueMm: ifs[index] as number, aifsValueMm: aifs[index] as number };
  });
  return { coordinates: { latitude: lat, longitude: lon }, daily };
}
