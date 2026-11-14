import { getClimatology } from "../lib/climatology";
import { computeConsensus } from "../lib/consensus";
import { computeDivergence } from "../lib/divergence";
import { getEnsembleForecast, getPointForecast } from "../lib/openMeteo";

const cities = [
  { name: "Bengaluru", lat: 12.97194, lon: 77.59369 },
  { name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { name: "Jaisalmer", lat: 26.9157, lon: 70.9083 },
  { name: "Shimla", lat: 31.1048, lon: 77.1734 },
  { name: "London", lat: 51.5072, lon: -0.1276 }
];
async function main() { for (const city of cities) {
  try {
    const forecast = await getPointForecast(city.lat, city.lon);
    const [ensemble, history] = await Promise.all([
      getEnsembleForecast(city.lat, city.lon),
      getClimatology(city.lat, city.lon, forecast.daily.map(day => day.date))
    ]);
    const flags = forecast.daily.filter(day => day.ifsValueMm !== null && day.aifsValueMm !== null && computeDivergence({ ifsValueMm: day.ifsValueMm, aifsValueMm: day.aifsValueMm }).divergenceFlag).length;
    const tiers = forecast.daily.map((day, index) => day.ifsValueMm === null || day.aifsValueMm === null ? "MISSING" : computeConsensus({ ifsValueMm: day.ifsValueMm, aifsValueMm: day.aifsValueMm, climatologyP90Mm: history.daily[index].p90Mm, climatologyMaxMm: history.daily[index].maxMm }).tier);
    console.log(JSON.stringify({ city: city.name, firstDate: forecast.daily[0].date, days: forecast.daily.length, missing: forecast.daily.filter(day => day.ifsValueMm === null || day.aifsValueMm === null).length, flags, tiers, ensembleDays: ensemble.daily.length, firstEnsembleMembers: [ensemble.daily[0].ifs?.memberCount, ensemble.daily[0].aifs?.memberCount], historicalPeriod: history.period, historicalSample: history.daily[0].sampleSize }));
  } catch (error) {
    console.error(city.name, error);
    process.exitCode = 1;
  }
} }

void main();
