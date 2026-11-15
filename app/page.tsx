import BrandHeader from "@/components/BrandHeader";
import CitySearch from "@/components/CitySearch";
import SiteFooter from "@/components/SiteFooter";

export default function Home() {
  return <main className="min-h-screen bg-[#f6f5ef] text-[#193b3e]">
    <BrandHeader />
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:px-8 sm:pt-20">
      <section className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#cbd9d3] bg-[#eaf1eb] px-4 py-2 text-xs font-bold uppercase tracking-[0.15em] text-[#386b69]"><span className="h-2 w-2 rounded-full bg-[#c77b50]" />Forecasts with perspective</div>
          <h1 className="mt-7 max-w-2xl font-[Georgia] text-5xl leading-[1.06] tracking-[-0.045em] text-[#173a3e] sm:text-6xl lg:text-7xl">Rain looks different from <em className="font-normal text-[#b46d47]">both sides.</em></h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#5e7673]">Compare daily precipitation from a physics model and an AI model, then see exactly when their forecasts drift apart.</p>
          <div className="mt-10"><CitySearch /></div>
        </div>
        <div className="relative rounded-[2rem] bg-[#173a3e] p-6 text-[#f7f6ef] shadow-[0_28px_70px_rgba(21,58,60,0.18)] sm:p-9">
          <div className="absolute right-7 top-7 grid h-11 w-11 place-items-center rounded-full border border-[#527477] text-[#cce0da]" aria-hidden="true">↗</div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a9c9c1]">Inside a PreciCast forecast</p>
          <h2 className="mt-7 max-w-sm font-[Georgia] text-3xl leading-tight sm:text-4xl">One place to see the whole comparison.</h2>
          <div className="mt-9 space-y-3">
            <div className="flex gap-4 rounded-2xl bg-[#244b4e] p-4"><span className="text-[#e9b08a]">01</span><span><strong className="block">Two model views</strong><span className="mt-1 block text-sm text-[#b9d0c9]">IFS and AIFS daily rainfall, side by side.</span></span></div>
            <div className="flex gap-4 rounded-2xl bg-[#244b4e] p-4"><span className="text-[#e9b08a]">02</span><span><strong className="block">A seven-day outlook</strong><span className="mt-1 block text-sm text-[#b9d0c9]">Clear daily values and visual comparison bars.</span></span></div>
            <div className="flex gap-4 rounded-2xl bg-[#244b4e] p-4"><span className="text-[#e9b08a]">03</span><span><strong className="block">Disagreement in plain sight</strong><span className="mt-1 block text-sm text-[#b9d0c9]">A labelled alert when the models diverge.</span></span></div>
          </div>
        </div>
      </section>
      <SiteFooter context="PreciCast · Data from Open-Meteo · Forecast values are model estimates, not observations." />
    </div>
  </main>;
}
