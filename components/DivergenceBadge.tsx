export default function DivergenceBadge({ divergenceMm, divergenceFlag }: { divergenceMm: number; divergenceFlag: boolean }) {
  return <div className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-xs leading-5 sm:text-sm ${divergenceFlag ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-slate-700 bg-slate-800/60 text-slate-300"}`}><span aria-hidden="true">{divergenceFlag ? "⚠" : "✓"}</span><span>{divergenceFlag ? `Models disagree by ${divergenceMm.toFixed(1)}mm for this forecast.` : `Models differ by ${divergenceMm.toFixed(1)}mm.`}</span></div>;
}
