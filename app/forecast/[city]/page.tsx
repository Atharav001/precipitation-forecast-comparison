import BrandHeader from "@/components/BrandHeader";
import ConsensusCard from "@/components/ConsensusCard";
import DivergenceBadge from "@/components/DivergenceBadge";
import EnsembleChart from "@/components/EnsembleChart";
import LimitationsPanel from "@/components/LimitationsPanel";
import MapSection from "@/components/MapSection";
import { getClimatology } from "@/lib/climatology";
import { computeConsensus } from "@/lib/consensus";
import { computeDivergence } from "@/lib/divergence";
import { getEnsembleForecast, getPointForecast } from "@/lib/openMeteo";
import type { ClimatologyDay, DailyForecast, EnsembleData, ForecastData } from "@/types/weather";

function dayLabel(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}
function amount(value: number | null) { return value === null ? "Unavailable" : value.toFixed(1); }

function ForecastRow({ day, historical, max }: { day: DailyForecast; historical?: ClimatologyDay; max: number }) {
  const hasPair = day.ifsValueMm !== null && day.aifsValueMm !== null;
  const divergence = hasPair ? computeDivergence({ ifsValueMm: day.ifsValueMm!, aifsValueMm: day.aifsValueMm! }) : null;
  const consensus = hasPair && historical ? computeConsensus({ ifsValueMm: day.ifsValueMm!, aifsValueMm: day.aifsValueMm!, climatologyP90Mm: historical.p90Mm, climatologyMaxMm: historical.maxMm }) : null;
  return <article className="border-t border-[#e4e8e2] px-4 py-5 sm:px-7" aria-label={`Forecast for ${dayLabel(day.date)}`}>
    <div className="grid gap-4 lg:grid-cols-[105px_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-center lg:gap-6">
      <div><p className="text-sm font-bold text-[#25484a]">{dayLabel(day.date)}</p><p className="mt-1 text-xs text-[#83918b]">{day.date}</p></div>
      {(["ifsValueMm", "aifsValueMm"] as const).map((key, index) => <div key={key}><div className="flex items-baseline justify-between gap-3"><span className={`text-xs font-semibold lg:hidden ${index ? "text-[#9f6446]" : "text-[#416b6b]"}`}>{index ? "AIFS" : "IFS"}</span><strong className={`text-xl tabular-nums ${index ? "text-[#a86543]" : "text-[#244f58]"}`}>{amount(day[key])} {day[key] !== null && <span className="text-xs font-medium text-[#738985]">mm</span>}</strong></div><div role="img" aria-label={`${index ? "AIFS" : "IFS"} ${day[key] === null ? "unavailable" : `${amount(day[key])} millimetres`}`} className={`mt-2 h-2 overflow-hidden rounded-full ${index ? "bg-[#f6e9df]" : "bg-[#e5efec]"}`}><div className={`h-full rounded-full ${index ? "bg-[#c47b53]" : "bg-[#3a777c]"}`} style={{ width: day[key] === null || day[key] === 0 ? 0 : `${Math.max(4, day[key]! / max * 100)}%` }} /></div></div>)}
      <div className="lg:w-48">{divergence ? <DivergenceBadge {...divergence} /> : <span className="text-xs text-[#768a85]">Comparison unavailable</span>}</div>
    </div>
    {consensus && historical && <div className="mt-4 lg:ml-[129px]"><ConsensusCard result={consensus} p90Mm={historical.p90Mm} maxMm={historical.maxMm} sampleSize={historical.sampleSize} /></div>}
  </article>;
}

export default async function ForecastPage({ params, searchParams }: { params: Promise<{ city: string }>; searchParams: Promise<{ lat?: string; lon?: string; region?: string; country?: string }> }) {
  const { city: cityParam } = await params;
  const { lat: latParam, lon: lonParam, region, country } = await searchParams;
  const city = decodeURIComponent(cityParam);
  const lat = Number(latParam);
  const lon = Number(lonParam);
  const locationDetail = [region, country].filter(Boolean).join(", ");
  let forecast: ForecastData | null = null;
  let ensemble: EnsembleData | null = null;
  let historical: ClimatologyDay[] = [];
  const notices: string[] = [];
  let errorMessage = "";
  if (latParam === undefined || lonParam === undefined) errorMessage = "Choose a city from the search results to load its forecast.";
  else {
    try { forecast = await getPointForecast(lat, lon); }
    catch { errorMessage = "Forecast temporarily unavailable. Please retry shortly."; }
    if (forecast) {
      const [ensembleResult, historyResult] = await Promise.allSettled([
        getEnsembleForecast(lat, lon),
        getClimatology(lat, lon, forecast.daily.map(day => day.date))
      ]);
      if (ensembleResult.status === "fulfilled") ensemble = ensembleResult.value;
      else notices.push("Ensemble uncertainty is temporarily unavailable.");
      if (historyResult.status === "fulfilled") historical = historyResult.value.daily;
      else notices.push("Historical context and experimental blend are temporarily unavailable.");
    }
  }
  const days = forecast?.daily.slice(0, 7) ?? [];
  const ifsTotal = days.reduce((sum, day) => sum + (day.ifsValueMm ?? 0), 0);
  const aifsTotal = days.reduce((sum, day) => sum + (day.aifsValueMm ?? 0), 0);
  const ifsCount = days.filter(day => day.ifsValueMm !== null).length;
  const aifsCount = days.filter(day => day.aifsValueMm !== null).length;
  const flagged = days.filter(day => day.ifsValueMm !== null && day.aifsValueMm !== null && computeDivergence({ ifsValueMm: day.ifsValueMm, aifsValueMm: day.aifsValueMm }).divergenceFlag).length;
  const max = Math.max(1, ...days.flatMap(day => [day.ifsValueMm ?? 0, day.aifsValueMm ?? 0]));

  return <main className="min-h-screen bg-[#f6f5ef] text-[#193b3e]">
    <BrandHeader />
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-8 sm:pt-12">
      <nav className="text-xs font-semibold uppercase tracking-[0.16em] text-[#78908b]">Forecast <span className="mx-2 text-[#bbc8c0]">/</span> {city}</nav>
      <section className="mt-6 overflow-hidden rounded-[1.75rem] bg-[#173a3e] p-6 text-[#f7f7ef] shadow-[0_20px_50px_rgba(27,65,64,0.12)] sm:p-9">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c8c0]">Your seven-day rain outlook</p><h1 className="mt-4 break-words font-[Georgia] text-4xl leading-tight sm:text-5xl">{city}</h1><p className="mt-3 text-sm text-[#bdd2cb]">{locationDetail ? `${locationDetail} · ` : ""}Two ECMWF model forecasts, shown side by side.</p></div><div className="flex items-center gap-2 self-start rounded-full border border-[#62817c] px-4 py-2 text-xs font-semibold text-[#cce0d5]">{forecast?.source === "live" ? "● Live forecast data" : forecast ? "◷ Dated forecast snapshot" : "Forecast unavailable"}</div></div>
        {days.length > 0 && <div className="mt-9 grid grid-cols-3 gap-2 border-t border-[#416267] pt-7 sm:gap-6"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a6c1b9] sm:text-xs">{ifsCount === days.length ? "IFS total" : "IFS partial total"}</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{ifsCount ? amount(ifsTotal) : "—"} <span className="text-sm font-normal text-[#a6c1b9]">mm</span></p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a6c1b9] sm:text-xs">{aifsCount === days.length ? "AIFS total" : "AIFS partial total"}</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{aifsCount ? amount(aifsTotal) : "—"} <span className="text-sm font-normal text-[#a6c1b9]">mm</span></p></div><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#a6c1b9] sm:text-xs">Flagged days</p><p className="mt-2 text-2xl font-semibold tabular-nums sm:text-3xl">{flagged} <span className="text-sm font-normal text-[#a6c1b9]">of {days.length}</span></p></div></div>}
      </section>
      {errorMessage && <div role="alert" className="mt-8 rounded-2xl border border-[#e8cbb8] bg-[#fcf0e8] p-6 text-[#934e30]">{errorMessage}</div>}
      {notices.map(notice => <p key={notice} role="status" className="mt-5 rounded-xl border border-[#ead5a7] bg-[#fff8e8] p-4 text-sm text-[#805d25]">{notice}</p>)}
      {days.length > 0 && <section className="mt-10" aria-label="Daily precipitation comparison"><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae704b]">Daily breakdown</p><h2 className="mt-1 font-[Georgia] text-3xl text-[#173a3e]">The forecast, day by day</h2></div><p className="text-sm text-[#6c837f]">Bars share one scale across the seven days.</p></div><div className="overflow-hidden rounded-2xl border border-[#dbe2da] bg-white shadow-[0_10px_35px_rgba(31,63,60,0.05)]"><div className="hidden grid-cols-[105px_minmax(0,1fr)_minmax(0,1fr)_auto] gap-6 bg-[#eef3ed] px-7 py-4 text-xs font-bold uppercase tracking-wider text-[#5c7772] lg:grid"><span>Day</span><span>IFS · physics</span><span>AIFS · AI</span><span className="w-48">Model comparison</span></div>{days.map(day => <ForecastRow key={day.date} day={day} historical={historical.find(item => item.date === day.date)} max={max} />)}</div><p className="mt-4 text-xs leading-5 text-[#758985]">Daily precipitation sums in millimetres. A missing model value is marked unavailable. Totals omit missing days ({ifsCount}/7 IFS, {aifsCount}/7 AIFS). Bar length shows amount, not probability. Data fetched {forecast && new Date(forecast.fetchedAt).toLocaleString("en-IN", { timeZone: forecast.timezone })} ({forecast?.timezone}).</p></section>}
      {ensemble && <EnsembleChart ensemble={ensemble} />}
      {forecast && <MapSection lat={lat} lon={lon} city={city} />}
      <section className="mt-10"><LimitationsPanel /></section>
      <footer className="mt-14 border-t border-[#d8ddd6] pt-6 text-xs text-[#788d87]">PreciCast · Forecast data: Open-Meteo / ECMWF · Historical context: ERA5 reanalysis</footer>
    </div>
  </main>;
}
