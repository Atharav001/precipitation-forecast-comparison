"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchCity } from "@/app/actions/geocode";
import type { CityLocation } from "@/types/weather";

function cityUrl(city: CityLocation) {
  const query = new URLSearchParams({ lat: String(city.latitude), lon: String(city.longitude), country: city.country });
  if (city.region) query.set("region", city.region);
  return `/forecast/${encodeURIComponent(city.name)}?${query.toString()}`;
}

function placeDetail(city: CityLocation) {
  return [city.region || city.district, city.country].filter(Boolean).join(", ");
}

export default function CitySearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityLocation[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    const id = ++requestId.current;
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      setMessage("");
      setActiveIndex(-1);
      return;
    }
    setLoading(true);
    setMessage("");
    const timer = window.setTimeout(async () => {
      try {
        const places = await searchCity(trimmed);
        if (id !== requestId.current) return;
        setResults(places);
        setActiveIndex(-1);
        setMessage(places.length ? "" : "No matching cities found.");
        setOpen(true);
      } catch (error: unknown) {
        if (id !== requestId.current) return;
        setResults([]);
        setMessage(error instanceof Error ? error.message : "City search is temporarily unavailable.");
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  function choose(city: CityLocation) {
    setOpen(false);
    router.push(cityUrl(city));
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
    if (!open || !results.length) return;
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex(index => (index + 1) % results.length); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex(index => index <= 0 ? results.length - 1 : index - 1); }
    if (event.key === "Enter") { event.preventDefault(); choose(results[activeIndex >= 0 ? activeIndex : 0]); }
  }

  return <div className="relative w-full max-w-xl">
    <label htmlFor="city-search" className="mb-3 block text-sm font-semibold text-[#315b5d]">Search any city</label>
    <div className="flex items-center gap-3 rounded-2xl border border-[#bdcbc7] bg-white px-4 shadow-[0_12px_35px_rgba(25,54,53,0.09)] focus-within:border-[#3b777c] focus-within:ring-4 focus-within:ring-[#d5e8e5]">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 shrink-0 text-[#47777b]" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.8"/><path d="m15.5 15.5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
      <input id="city-search" role="combobox" aria-autocomplete="list" aria-expanded={open && (results.length > 0 || !!message)} aria-controls="city-results" aria-activedescendant={activeIndex >= 0 ? `city-option-${activeIndex}` : undefined} value={query} onChange={event => { setQuery(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown} autoComplete="off" placeholder="Try Bengaluru, London or Mumbai" className="min-w-0 flex-1 bg-transparent py-4 text-base text-[#173a3e] outline-none placeholder:text-[#8ba09d]" />
      {loading && <span role="status" className="text-xs font-medium text-[#618381]">Searching…</span>}
    </div>
    {open && query.trim().length >= 2 && (results.length > 0 || message) && <div id="city-results" role="listbox" aria-label="City suggestions" className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-[#d7e0dc] bg-white p-2 shadow-[0_20px_45px_rgba(25,54,53,0.16)]">
      {message && <p role="status" className="px-3 py-3 text-sm text-[#a45536]">{message}</p>}
      {results.map((city, index) => <button type="button" role="option" aria-selected={activeIndex === index} id={`city-option-${index}`} key={city.id ?? `${city.latitude}-${city.longitude}-${index}`} onMouseDown={event => event.preventDefault()} onClick={() => choose(city)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${activeIndex === index ? "bg-[#e7f0ec]" : "hover:bg-[#f2f5f1]"}`}><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#e8f0ed] text-[#3c7374]" aria-hidden="true">⌖</span><span><strong className="block font-semibold text-[#1f3d3d]">{city.name}</strong><span className="text-xs text-[#718481]">{placeDetail(city)}</span></span></button>)}
    </div>}
    <p className="mt-3 text-xs text-[#738784]">Suggestions appear as you type. Places with the same name are distinguished by region and country. Try “London, United Kingdom” to narrow the list.</p>
  </div>;
}
