import Link from "next/link";
import DivergenceBadge from "@/components/DivergenceBadge";
import LimitationsPanel from "@/components/LimitationsPanel";

export default function ForecastPage({ params }: { params: { city: string } }) {
  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100"><div className="mx-auto max-w-5xl">
    <header className="border-b border-slate-800 pb-6"><Link href="/" className="text-lg font-semibold">RainScope</Link></header>
    <section className="py-12"><p className="text-sm uppercase tracking-widest text-sky-400">Forecast overview</p><h1 className="mt-3 text-4xl font-semibold capitalize">{decodeURIComponent(params.city)}</h1><p className="mt-3 text-slate-400">Forecast data will appear in the next phase.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2"><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">IFS precipitation<br /><span className="text-4xl">-- mm</span></div><div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">AIFS precipitation<br /><span className="text-4xl">-- mm</span></div></div>
      <div className="mt-5"><DivergenceBadge /></div><div className="mt-5 h-64 rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-6 text-slate-500">Forecast chart placeholder</div><div className="mt-6"><LimitationsPanel /></div>
    </section></div></main>;
}
