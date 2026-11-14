import { computeDivergence } from "@/lib/divergence";
import { CONSENSUS_WEIGHTS } from "@/lib/constants";
import type { ConsensusInput, ConsensusOutput, Tier } from "@/types/weather";

export function computeConsensus(input: ConsensusInput): ConsensusOutput {
  const { ifsValueMm, aifsValueMm, climatologyP90Mm, climatologyMaxMm } = input;
  for (const value of [ifsValueMm, aifsValueMm, climatologyP90Mm, climatologyMaxMm]) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError("Consensus inputs must be finite, nonnegative millimetres.");
  }
  const higherValue = Math.max(ifsValueMm, aifsValueMm);
  let tier: Tier;
  // A zero-rain forecast cannot be unusual even when a dry-season P90 is zero.
  if (higherValue > 0 && climatologyMaxMm > 0 && higherValue >= climatologyMaxMm * 0.95) {
    tier = "SEVERE_OUTLIER";
  } else if (higherValue > 0 && higherValue >= climatologyP90Mm) {
    tier = "LOCALLY_UNUSUAL";
  } else {
    tier = "ROUTINE";
  }
  const weightIfs = CONSENSUS_WEIGHTS[tier].ifs;
  const weightAifs = CONSENSUS_WEIGHTS[tier].aifs;
  const divergence = computeDivergence({ ifsValueMm, aifsValueMm });
  return { consensusValueMm: weightIfs * ifsValueMm + weightAifs * aifsValueMm, tier, weightIfs, weightAifs, divergenceMm: divergence.divergenceMm, divergenceFlag: divergence.divergenceFlag };
}
