import snapshot from "@/public/cache/fallback-demo-data.json";
import type { ForecastData } from "@/types/weather";

export function getFallbackForecast(lat: number, lon: number): ForecastData | null {
  const city = snapshot.cities.find(item => Math.abs(item.latitude - lat) < 0.02 && Math.abs(item.longitude - lon) < 0.02);
  if (!city) return null;
  const parts = new Intl.DateTimeFormat("en", { timeZone: city.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  // Never present yesterday's forecast as a current forecast.
  if (city.daily[0]?.date !== today) return null;
  return {
    coordinates: { latitude: city.latitude, longitude: city.longitude },
    timezone: city.timezone,
    fetchedAt: snapshot.fetchedAt,
    source: "snapshot",
    daily: city.daily
  };
}
