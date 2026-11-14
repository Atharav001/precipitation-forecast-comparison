import Link from "next/link";

export default function BrandHeader() {
  return <header className="border-b border-[#dcded7] bg-[#faf9f5]">
    <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
      <Link href="/" className="flex items-center gap-3 text-[#173a3e]" aria-label="PreciCast home">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#173a3e] text-[#f6f1e5]" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" className="h-5 w-5"><path d="M12 2.5C9 7 5.5 10.5 5.5 15a6.5 6.5 0 0 0 13 0C18.5 10.5 15 7 12 2.5Z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 17c.6 1 1.5 1.5 3 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg></span>
        <span className="text-xl font-bold tracking-tight">PreciCast</span>
      </Link>
      <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-[#688083] sm:block">A clearer view of rain</span>
      <Link href="/" className="rounded-full border border-[#c7d3d1] px-4 py-2 text-sm font-semibold text-[#245a60] transition hover:bg-[#e9f1ed]">Find a city</Link>
    </div>
  </header>;
}
