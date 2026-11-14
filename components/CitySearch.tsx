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

  return <div className="max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-2">
    <form onSubmit={submit} className="flex gap-2"><input aria-label="City" value={name} onChange={event => setName(event.target.value)} placeholder="Search for a city" className="min-w-0 flex-1 bg-transparent px-4 py-3 text-slate-100 placeholder:text-slate-500" /><button disabled={loading} className="rounded-xl bg-sky-500 px-5 py-3 font-medium text-slate-950 disabled:opacity-50">{loading ? "Searching…" : "Search"}</button></form>
    {message && <p role="status" className="px-4 pb-2 text-sm text-amber-300">{message}</p>}
    {results.length > 0 && <ul className="border-t border-slate-700 py-2">{results.map((city, index) => <li key={`${city.latitude}-${city.longitude}-${index}`}><Link className="block rounded-lg px-4 py-3 hover:bg-slate-800" href={`/forecast/${encodeURIComponent(city.name)}?lat=${city.latitude}&lon=${city.longitude}`}>{city.name}, {city.country}</Link></li>)}</ul>}
  </div>;
}
