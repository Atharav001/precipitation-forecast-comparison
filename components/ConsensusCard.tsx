import SeverityBadge from "@/components/SeverityBadge";
import type { ConsensusOutput } from "@/types/weather";

const tierExplanations = {
  ROUTINE: "The forecast is below the local seasonal threshold, or both models predict zero rainfall.",
  LOCALLY_UNUSUAL: "The higher model forecast is at or above the 90th percentile of this location's recent ERA5 rainfall history. In a dry season this threshold may be zero; this label does not indicate a hazardous amount.",
  SEVERE_OUTLIER: "The higher model forecast approaches or exceeds the maximum in this ten-year ERA5 seasonal sample. This is not a verified station record or a rainfall lower bound."
} as const;

export default function ConsensusCard({ result, p90Mm, maxMm, sampleSize }: { result: ConsensusOutput; p90Mm: number; maxMm: number; sampleSize: number }) {
  return <div className="rounded-2xl border border-[#dbe2da] bg-white p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-[#a56543]">Experimental blend</p><h3 className="mt-1 font-[Georgia] text-2xl text-[#173a3e]">Historical context</h3></div><SeverityBadge tier={result.tier} /></div>
    <p className="mt-4 text-3xl font-semibold tabular-nums text-[#244f58]">{result.consensusValueMm.toFixed(1)} <span className="text-base font-normal text-[#728985]">mm</span> <span className="align-middle text-xs font-bold uppercase tracking-wider text-[#a56543]">Experimental</span></p>
    <p className="mt-2 text-sm leading-6 text-[#5c7772]">{tierExplanations[result.tier]}</p>
    <p className="mt-2 text-sm leading-6 text-[#5c7772]">Heuristic blend: {Math.round(result.weightIfs * 100)}% IFS + {Math.round(result.weightAifs * 100)}% AIFS. These weights have not been validated against observed rainfall; compare the individual model values above.</p>
    <p className="mt-3 text-xs leading-5 text-[#758985]">ERA5 reanalysis, same seasonal window over {sampleSize} days: 90th percentile {p90Mm.toFixed(1)} mm · sample maximum {maxMm.toFixed(1)} mm. This is modelled historical context, not a station record.</p>
  </div>;
}
