import type { Tier } from "@/types/weather";

const styles: Record<Tier, string> = {
  ROUTINE: "border-[#cbded6] bg-[#edf4ef] text-[#416d60]",
  LOCALLY_UNUSUAL: "border-[#ead5a7] bg-[#fff6df] text-[#8b6321]",
  SEVERE_OUTLIER: "border-[#edb5a1] bg-[#fff0e9] text-[#9b4c34]"
};
const labels: Record<Tier, string> = {
  ROUTINE: "Routine range",
  LOCALLY_UNUSUAL: "Locally Unusual",
  SEVERE_OUTLIER: "Severe Outlier"
};

export default function SeverityBadge({ tier }: { tier: Tier }) {
  return <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${styles[tier]}`}>
    <span aria-hidden="true">{tier === "ROUTINE" ? "○" : tier === "LOCALLY_UNUSUAL" ? "△" : "!"}</span>{labels[tier]}
  </span>;
}
