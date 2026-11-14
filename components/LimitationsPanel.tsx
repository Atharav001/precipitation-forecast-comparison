export default function LimitationsPanel() {
  return <details className="group rounded-2xl border border-slate-800 bg-slate-900 p-5 text-sm text-slate-300 sm:p-6">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 [&::-webkit-details-marker]:hidden">About these models and their limitations<span aria-hidden="true" className="text-lg text-sky-400 transition group-open:rotate-45">+</span></summary>
    <p className="mt-4 max-w-3xl leading-7">This app compares ECMWF&apos;s physics-based IFS model with ECMWF&apos;s AI-based AIFS model. AIFS shares its underlying approach — a graph neural network trained on historical reanalysis data — with other AI weather models (GraphCast, Pangu-Weather, Fuxi) that a 2026 study (Zhang &amp; Engelke, <em>Science Advances</em>) found to underestimate the frequency and intensity of record-breaking extreme weather events. That study did not test AIFS directly, but because of the shared approach, we apply the same caution here.</p>
  </details>;
}
