import Link from "next/link";
import DivergenceBadge from "@/components/DivergenceBadge";
import LimitationsPanel from "@/components/LimitationsPanel";
import { computeDivergence } from "@/lib/divergence";
import { getPointForecast } from "@/lib/openMeteo";
import type { ForecastData } from "@/types/weather";

export default async function ForecastPage({ params, searchParams }: { params: { city: string }; searchParams: { lat?: string; lon?: string } }) {
  const city = decodeURIComponent(params.city);
  const lat = Number(searchParams.lat);
  const lon = Number(searchParams.lon);
  let forecast: ForecastData | null = null;
  let errorMessage = "";
  if (searchParams.lat === undefined || searchParams.lon === undefined) errorMessage = "Choose a city from the search results to load its forecast.";
  else {
    try { forecast = await getPointForecast(lat, lon); }
    catch (error: unknown) { errorMessage = error instanceof Error ? error.message : "Forecast is temporarily unavailable."; }
  }

  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100"><div className="mx-auto max-w-5xl">
    <header className="border-b border-slate-800 pb-6"><Link href="/" className="text-lg font-semibold">RainScope</Link></header>
    <section className="py-12"><p className="text-sm uppercase tracking-widest text-sky-400">15-day precipitation forecast</p><h1 className="mt-3 text-4xl font-semibold capitalize">{city}</h1>
      {errorMessage && <div role="alert" className="mt-8 rounded-2xl border border-amber-600/40 bg-amber-600/10 p-6 text-amber-200">{errorMessage}</div>}
      {forecast && <><p className="mt-3 text-slate-400">Daily precipitation totals in millimetres, compared across two ECMWF models.</p><div className="mt-8 space-y-4">{forecast.daily.map(day => {
        const divergence = computeDivergence(day);
        return <article key={day.date} className="rounded-2xl border border-slate-800 bg-slate-900 p-6"><h2 className="font-semibold">{day.date}</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><div>IFS <strong className="ml-2 text-2xl">{day.ifsValueMm.toFixed(1)} mm</strong></div><div>AIFS <strong className="ml-2 text-2xl">{day.aifsValueMm.toFixed(1)} mm</strong></div></div><div className="mt-4"><DivergenceBadge {...divergence} /></div></article>;
      })}</div></>}
      <div className="mt-6"><LimitationsPanel /></div>
    </section></div></main>;
}
