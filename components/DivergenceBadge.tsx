export default function DivergenceBadge({ divergenceMm, divergenceFlag }: { divergenceMm: number; divergenceFlag: boolean }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${divergenceFlag ? "bg-[#faeadf] text-[#9b4d2e]" : "bg-[#e9f1ed] text-[#47746b]"}`}><span aria-hidden="true">{divergenceFlag ? "⚠" : "✓"}</span><span>{divergenceFlag ? `Models disagree by ${divergenceMm.toFixed(1)}mm for this forecast.` : `Models differ by ${divergenceMm.toFixed(1)}mm.`}</span></span>;
}
