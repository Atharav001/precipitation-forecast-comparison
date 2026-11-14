import type { ConsensusInput } from "@/types/weather";
export function computeDivergence({ ifsValueMm, aifsValueMm }: ConsensusInput) {
  const divergenceMm = Math.abs(ifsValueMm - aifsValueMm);
  const divergenceThreshold = Math.max(2, 0.25 * Math.max(ifsValueMm, aifsValueMm));
  return { divergenceMm, divergenceThreshold, divergenceFlag: divergenceMm > divergenceThreshold };
}
