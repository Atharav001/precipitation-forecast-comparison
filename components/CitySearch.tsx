"use client";

import { useState } from "react";
import Link from "next/link";
import { searchCity } from "@/app/actions/geocode";
import type { CityLocation } from "@/types/weather";

export default function CitySearch() {
  const [name, setName] = useState("");
  const [results, setResults] = useState<CityLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setResults([]);
    setMessage("");
    try {
      const places = await searchCity(name);
      setResults(places);
      if (places.length === 0) setMessage("No matching cities found. Try another name.");
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "City search is temporarily unavailable.");
    } finally { setLoading(false); }
  }

  return <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-2 shadow-xl shadow-black/20">
    <form onSubmit={submit} className="flex flex-col gap-2 min-[390px]:flex-row"><input aria-label="City" value={name} onChange={event => setName(event.target.value)} placeholder="Search for a city" className="min-w-0 flex-1 rounded-xl bg-slate-800 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:ring-2 focus:ring-sky-400" /><button disabled={loading} className="rounded-xl bg-sky-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-sky-300 disabled:cursor-wait disabled:opacity-50">{loading ? "Searching…" : "Search"}</button></form>
    {message && <p role="status" className="px-4 pb-2 text-sm text-amber-300">{message}</p>}
    {results.length > 0 && <div className="mt-2 border-t border-slate-700 pt-2"><p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Select a location</p><ul>{results.map((city, index) => <li key={`${city.latitude}-${city.longitude}-${index}`}><Link className="block rounded-lg px-4 py-3 text-sm transition hover:bg-slate-800 focus:bg-slate-800 focus:outline-none" href={`/forecast/${encodeURIComponent(city.name)}?lat=${city.latitude}&lon=${city.longitude}`}>{city.name}, {city.country}</Link></li>)}</ul></div>}
  </div>;
}
