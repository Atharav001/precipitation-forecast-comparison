import CitySearch from "@/components/CitySearch";

export default function Home() {
  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-slate-800 pb-6 text-lg font-semibold">RainScope</header>
      <section className="grid gap-12 py-20 lg:grid-cols-2 lg:items-center">
        <div><p className="text-sm uppercase tracking-widest text-sky-400">Precipitation forecasts</p><h1 className="mt-4 text-5xl font-semibold leading-tight">See where rain forecasts agree.</h1><p className="mt-6 text-lg text-slate-400">Compare two weather models in one clear view.</p><div className="mt-10"><CitySearch /></div></div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7"><p className="text-sm text-slate-400">Forecast preview</p><div className="mt-8 grid grid-cols-2 gap-4"><div className="rounded-2xl bg-slate-800 p-5">IFS<br /><span className="text-3xl">-- mm</span></div><div className="rounded-2xl bg-slate-800 p-5">AIFS<br /><span className="text-3xl">-- mm</span></div></div><div className="mt-4 h-32 rounded-2xl border border-dashed border-slate-700 p-5 text-sm text-slate-500">Forecast chart placeholder</div></div>
      </section>
    </div>
  </main>;
}
