import BrandHeader from "@/components/BrandHeader";
import DivergenceBadge from "@/components/DivergenceBadge";
import LimitationsPanel from "@/components/LimitationsPanel";
import { computeDivergence } from "@/lib/divergence";
import { getPointForecast } from "@/lib/openMeteo";
import type { DailyForecast, ForecastData } from "@/types/weather";

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function amount(value: number) { return value.toFixed(1); }

function ForecastRow({ day, max }: { day: DailyForecast; max: number }) {
  const divergence = computeDivergence(day);
  return <article className="grid gap-4 border-t border-[#e4e8e2] px-4 py-5 sm:px-7 lg:grid-cols-[105px_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6" aria-label={`Forecast for ${dayLabel(day.date)}`}>
    <div><p className="text-sm font-bold text-[#25484a]">{dayLabel(day.date)}</p><p className="mt-1 text-xs text-[#83918b]">{day.date}</p></div>
    <div><div className="flex items-baseline justify-between gap-3"><span className="text-xs font-semibold text-[#416b6b] lg:hidden">IFS</span><strong className="text-xl tabular-nums text-[#244f58]">{amount(day.ifsValueMm)} <span className="text-xs font-medium text-[#738985]">mm</span></strong></div><div role="img" aria-label={`IFS ${amount(day.ifsValueMm)} millimetres`} className="mt-2 h-2 overflow-hidden rounded-full bg-[#e5efec]"><div className="h-full rounded-full bg-[#3a777c]" style={{ width: `${day.ifsValueMm === 0 ? 0 : Math.max(4, day.ifsValueMm / max * 100)}%` }} /></div></div>
    <div><div className="flex items-baseline justify-between gap-3"><span className="text-xs font-semibold text-[#9f6446] lg:hidden">AIFS</span><strong className="text-xl tabular-nums text-[#a86543]">{amount(day.aifsValueMm)} <span className="text-xs font-medium text-[#738985]">mm</span></strong></div><div role="img" aria-label={`AIFS ${amount(day.aifsValueMm)} millimetres`} className="mt-2 h-2 overflow-hidden rounded-full bg-[#f6e9df]"><div className="h-full rounded-full bg-[#c47b53]" style={{ width: `${day.aifsValueMm === 0 ? 0 : Math.max(4, day.aifsValueMm / max * 100)}%` }} /></div></div>
    <div className="lg:w-48"><DivergenceBadge {...divergence} /></div>
  </article>;
}

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
  const days = forecast?.daily.slice(0, 7) ?? [];
  const ifsTotal = days.reduce((sum, day) => sum + day.ifsValueMm, 0);
  const aifsTotal = days.reduce((sum, day) => sum + day.aifsValueMm, 0);
  const flagged = days.filter(day => computeDivergence(day).divergenceFlag).length;
  const max = Math.max(1, ...days.flatMap(day => [day.ifsValueMm, day.aifsValueMm]));

  return <main className="min-h-screen bg-[#f6f5ef] text-[#193b3e]">
    <BrandHeader />
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
      <nav className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78908b]">Forecast <span className="mx-2 text-[#bbc8c0]">/</span> {city}</nav>
      <section className="mt-6 overflow-hidden rounded-[1.75rem] bg-[#173a3e] p-6 text-[#f7f7ef] shadow-[0_20px_50px_rgba(27,65,64,0.12)] sm:p-9">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c8c0]">Your seven-day rain outlook</p><h1 className="mt-4 break-words font-[Georgia] text-4xl leading-tight sm:text-5xl">{city}</h1><p className="mt-3 text-sm text-[#bdd2cb]">Two ECMWF model forecasts, shown side by side.</p></div><div className="flex items-center gap-2 self-start rounded-full border border-[#62817c] px-4 py-2 text-xs font-semibold text-[#cce0d5]">● Live forecast data</div></div>
        {days.length > 0 && <div className="mt-9 grid grid-cols-3 gap-2 border-t border-[#416267] pt-7 sm:gap-6"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a6c1b9] sm:text-xs">IFS total</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{amount(ifsTotal)} <span className="text-sm font-normal text-[#a6c1b9]">mm</span></p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a6c1b9] sm:text-xs">AIFS total</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{amount(aifsTotal)} <span className="text-sm font-normal text-[#a6c1b9]">mm</span></p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a6c1b9] sm:text-xs">Flagged days</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{flagged} <span className="text-sm font-normal text-[#a6c1b9]">of 7</span></p></div></div>}
      </section>
      {errorMessage && <div role="alert" className="mt-8 rounded-2xl border border-[#e8cbb8] bg-[#fcf0e8] p-6 text-[#934e30]">{errorMessage}</div>}
      {days.length > 0 && <section className="mt-10" aria-label="Daily precipitation comparison"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae704b]">Daily breakdown</p><h2 className="mt-1 font-[Georgia] text-3xl text-[#173a3e]">The forecast, day by day</h2></div><p className="text-sm text-[#6c837f]">Bars share one scale across the seven days.</p></div>
        <div className="overflow-hidden rounded-2xl border border-[#dbe2da] bg-white shadow-[0_10px_35px_rgba(31,63,60,0.05)]"><div className="hidden grid-cols-[105px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-6 bg-[#eef3ed] px-7 py-4 text-xs font-bold uppercase tracking-wider text-[#5c7772] lg:grid"><span>Day</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#3a777c]" />IFS · physics</span><span><i className="mr-2 inline-block h-2 w-2 rounded-full bg-[#c47b53]" />AIFS · AI</span><span className="w-48">Model comparison</span></div>{days.map(day => <ForecastRow key={day.date} day={day} max={max} />)}</div>
        <p className="mt-4 text-xs leading-5 text-[#758985]">Values are daily precipitation sums in millimetres. Bar length compares amounts within this seven-day view; it does not indicate probability.</p>
      </section>}
      <section className="mt-10"><LimitationsPanel /></section>
      <footer className="mt-14 border-t border-[#d8ddd6] pt-6 text-xs text-[#788d87]">PreciCast · Forecast data: Open-Meteo / ECMWF</footer>
    </div>
  </main>;
}
