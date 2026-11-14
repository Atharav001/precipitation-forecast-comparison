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

  return <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100 sm:px-8 sm:py-10"><div className="mx-auto max-w-5xl">
    <header className="flex items-center justify-between border-b border-slate-800 pb-6"><Link href="/" className="text-lg font-semibold tracking-tight">RainScope</Link><Link href="/" className="text-sm text-sky-400 hover:text-sky-300">← New search</Link></header>
    <section className="py-10 sm:py-14"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-400 sm:text-sm">Seven-day precipitation forecast</p><h1 className="mt-3 break-words text-4xl font-semibold capitalize tracking-tight sm:text-5xl">{city}</h1>
      {errorMessage && <div role="alert" className="mt-8 rounded-2xl border border-amber-600/40 bg-amber-600/10 p-6 text-amber-200">{errorMessage}</div>}
      {forecast && <><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">Daily precipitation totals in millimetres from ECMWF&apos;s physics-based IFS and AI-based AIFS models.</p><div className="mt-8 space-y-4">{forecast.daily.slice(0, 7).map(day => {
        const divergence = computeDivergence(day);
        return <article key={day.date} className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-black/10 sm:p-6"><h2 className="text-base font-semibold sm:text-lg">{day.date}</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5"><div className="min-w-0 rounded-xl bg-slate-800 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">IFS</p><p className="mt-2 whitespace-nowrap text-2xl font-semibold tabular-nums sm:text-3xl">{day.ifsValueMm.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-400">mm</span></p></div><div className="min-w-0 rounded-xl bg-slate-800 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">AIFS</p><p className="mt-2 whitespace-nowrap text-2xl font-semibold tabular-nums sm:text-3xl">{day.aifsValueMm.toFixed(1)}<span className="ml-1 text-sm font-normal text-slate-400">mm</span></p></div></div><div className="mt-4"><DivergenceBadge {...divergence} /></div></article>;
      })}</div></>}
      <div className="mt-8"><LimitationsPanel /></div>
    </section></div></main>;
}
