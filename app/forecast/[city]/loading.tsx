import BrandHeader from "@/components/BrandHeader";

export default function Loading() {
  return <main className="min-h-screen bg-[#f6f5ef] text-[#193b3e]"><BrandHeader /><div className="mx-auto max-w-6xl px-4 py-12 sm:px-8"><p role="status" className="rounded-2xl border border-[#dbe2da] bg-white p-8 text-sm text-[#5e7673]">Loading forecasts, ensemble ranges, and historical context…</p></div></main>;
}
