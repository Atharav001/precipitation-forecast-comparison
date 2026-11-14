export default function DivergenceBadge({ divergenceMm, divergenceFlag }: { divergenceMm: number; divergenceFlag: boolean }) {
  return <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${divergenceFlag ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-slate-700 text-slate-400"}`}><span aria-hidden="true">{divergenceFlag ? "⚠" : "✓"}</span>{divergenceFlag ? `Models disagree by ${divergenceMm.toFixed(1)} mm for this forecast.` : `Models differ by ${divergenceMm.toFixed(1)} mm.`}</div>;
}
