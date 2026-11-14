import { WeatherApiError, getHistoricalPrecipitation } from "@/lib/openMeteo";
import { HISTORICAL_WINDOW_DAYS, HISTORICAL_YEARS, MIN_HISTORICAL_SAMPLE } from "@/lib/constants";
import type { ClimatologyData } from "@/types/weather";

// Map all years to a 365-day seasonal calendar, omitting February 29.
function seasonalDay(date: string): number | null {
  const [, month, day] = date.split("-").map(Number);
  if (month === 2 && day === 29) return null;
  const utc = Date.UTC(2021, month - 1, day);
  return Math.floor((utc - Date.UTC(2021, 0, 1)) / 86400000);
}

function percentile(sorted: number[], p: number): number {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

export async function getClimatology(lat: number, lon: number, dates: string[]): Promise<ClimatologyData> {
  const lastYear = new Date().getUTCFullYear() - 1;
  const start = `${lastYear - HISTORICAL_YEARS + 1}-01-01`;
  const end = `${lastYear}-12-31`;
  const archive = await getHistoricalPrecipitation(lat, lon, start, end);
  if (archive.dates.length < 3650 || archive.dates.length !== archive.values.length) throw new WeatherApiError("Historical rainfall record is incomplete.", "BAD_RESPONSE");
  const records = archive.dates.flatMap((date, index) => {
    const day = seasonalDay(date);
    const value = archive.values[index];
    return day === null || value === null ? [] : [{ day, value }];
  });
  return {
    period: { start, end }, source: "ERA5 reanalysis",
    daily: dates.map(date => {
      const target = seasonalDay(date) ?? seasonalDay(`${date.slice(0, 4)}-02-28`)!;
      const sample = records.filter(record => {
        const distance = Math.abs(record.day - target);
        return Math.min(distance, 365 - distance) <= HISTORICAL_WINDOW_DAYS;
      }).map(record => record.value).sort((a, b) => a - b);
      if (sample.length < MIN_HISTORICAL_SAMPLE) throw new WeatherApiError(`Insufficient historical rainfall data for ${date}.`, "BAD_RESPONSE");
      return { date, p90Mm: percentile(sample, 0.9), maxMm: sample[sample.length - 1], sampleSize: sample.length };
    })
  };
}
