"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false, loading: () => <p className="mt-10 text-sm text-[#5e7673]">Loading map…</p> });

export default function MapSection(props: { lat: number; lon: number; city: string }) { return <MapView {...props} />; }
