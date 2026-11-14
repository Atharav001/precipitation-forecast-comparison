"use client";

import { Area, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { EnsembleData } from "@/types/weather";

function BandChart({ title, color, data }: { title: string; color: string; data: Array<{ date: string; lower: number | null; range: number | null; mean: number | null }> }) {
  return <div className="min-w-0 rounded-2xl border border-[#dbe2da] bg-white p-4 sm:p-5"><h3 className="text-sm font-semibold text-[#25484a]">{title}</h3>{data.every(day => day.mean === null) ? <p className="mt-4 text-sm text-[#758985]">This model&apos;s ensemble data is unavailable.</p> : <div className="mt-4 h-52 w-full"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 6, right: 5, left: -20, bottom: 4 }}>
    <XAxis dataKey="date" tickFormatter={value => value.slice(5)} tick={{ fontSize: 11 }} />
    <YAxis tick={{ fontSize: 11 }} unit="mm" />
    <Area dataKey="lower" stackId="band" stroke="none" fill="transparent" legendType="none" tooltipType="none" />
    <Area dataKey="range" stackId="band" stroke="none" fill={color} fillOpacity={0.22} connectNulls={false} />
    <Line dataKey="mean" stroke={color} strokeWidth={2.5} dot={{ r: 2 }} connectNulls={false} />
  </ComposedChart></ResponsiveContainer></div>}</div>;
}

export default function EnsembleChart({ ensemble }: { ensemble: EnsembleData }) {
  const data = (model: "ifs" | "aifs") => ensemble.daily.map(day => ({ date: day.date, lower: day[model]?.p10Mm ?? null, range: day[model] ? day[model]!.p90Mm - day[model]!.p10Mm : null, mean: day[model]?.meanMm ?? null }));
  return <section className="mt-10" aria-label="Ensemble uncertainty bands"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae704b]">Uncertainty</p><h2 className="mt-1 font-[Georgia] text-3xl text-[#173a3e]">How much forecasts vary</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#5e7673]">Each band spans the 10th to 90th percentile across that model&apos;s own ensemble members. Lines show member means. The IFS and AIFS ensembles are separate; their members are not paired.</p><div className="mt-5 grid gap-4 lg:grid-cols-2"><BandChart title="IFS ensemble" color="#3a777c" data={data("ifs")} /><BandChart title="AIFS ensemble" color="#c47b53" data={data("aifs")} /></div></section>;
}
