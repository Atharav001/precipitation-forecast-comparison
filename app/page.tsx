import CitySearch from "@/components/CitySearch";

export default function Home() {
  return <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
    <div className="mx-auto max-w-5xl">
      <header className="border-b border-slate-800 pb-6 text-lg font-semibold">RainScope</header>
      <section className="grid gap-12 py-20 lg:grid-cols-2 lg:items-center">
        <div><p className="text-sm uppercase tracking-widest text-sky-400">Precipitation forecasts</p><h1 className="mt-4 text-5xl font-semibold leading-tight">See where rain forecasts agree.</h1><p className="mt-6 text-lg text-slate-400">Compare two weather models in one clear view.</p><div className="mt-10"><CitySearch /></div></div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-7"><p className="text-sm font-semibold uppercase tracking-wider text-sky-400">What you’ll see</p><ol className="mt-8 space-y-6 text-slate-300"><li className="flex gap-4"><span className="font-semibold text-sky-400">01</span><span>Choose the right city from the location results.</span></li><li className="flex gap-4"><span className="font-semibold text-sky-400">02</span><span>Compare IFS and AIFS daily precipitation for seven days.</span></li><li className="flex gap-4"><span className="font-semibold text-sky-400">03</span><span>Spot days when the two models meaningfully disagree.</span></li></ol></div>
      </section>
    </div>
  </main>;
}
