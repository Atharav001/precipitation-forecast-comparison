"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ lat, lon, city }: { lat: number; lon: number; city: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { center: [lat, lon], zoom: 8, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
    L.circleMarker([lat, lon], { radius: 9, color: "#173a3e", fillColor: "#c47b53", fillOpacity: 0.9, weight: 3 }).addTo(map);
    return () => { map.remove(); };
  }, [lat, lon]);
  return <section className="mt-10" aria-label="Forecast location map"><p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ae704b]">Location</p><h2 className="mt-1 font-[Georgia] text-3xl text-[#173a3e]">Forecast grid point</h2><p className="mt-2 text-sm text-[#5e7673]">Model values represent a grid area around {city}, not a rain gauge at this exact coordinate.</p><div ref={container} className="mt-5 h-64 overflow-hidden rounded-2xl border border-[#dbe2da]" /></section>;
}
