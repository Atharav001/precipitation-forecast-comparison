import { DIVERGENCE_FRACTION, DIVERGENCE_MIN_MM } from "@/lib/constants";
export function computeDivergence({ ifsValueMm, aifsValueMm }: { ifsValueMm: number; aifsValueMm: number }) {
  const divergenceMm = Math.abs(ifsValueMm - aifsValueMm);
  const divergenceThreshold = Math.max(DIVERGENCE_MIN_MM, DIVERGENCE_FRACTION * Math.max(ifsValueMm, aifsValueMm));
  return { divergenceMm, divergenceThreshold, divergenceFlag: divergenceMm > divergenceThreshold };
}
