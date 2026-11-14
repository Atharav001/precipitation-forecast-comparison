import { getPointForecast, WeatherApiError } from "@/lib/openMeteo";
import type { ForecastData } from "@/types/weather";

export type ForecastState = { forecast: ForecastData; error: null } | { forecast: null; error: string };

export async function loadForecast(
  lat: number,
  lon: number,
  fetchForecast: (lat: number, lon: number) => Promise<ForecastData> = getPointForecast
): Promise<ForecastState> {
  try {
    return { forecast: await fetchForecast(lat, lon), error: null };
  } catch (error: unknown) {
    if (error instanceof WeatherApiError && error.code === "INVALID_INPUT") {
      return { forecast: null, error: "Invalid latitude or longitude. Choose a city from search." };
    }
    return { forecast: null, error: "Forecast temporarily unavailable. Please retry shortly." };
  }
}
