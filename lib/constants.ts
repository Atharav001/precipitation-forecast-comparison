export const DIVERGENCE_MIN_MM = 2;
export const DIVERGENCE_FRACTION = 0.25;
export const HISTORICAL_WINDOW_DAYS = 10;
export const HISTORICAL_YEARS = 10;
export const MIN_HISTORICAL_SAMPLE = 150;
export const MIN_ENSEMBLE_MEMBERS = 10;
export const CONSENSUS_WEIGHTS = {
  ROUTINE: { ifs: 0.4, aifs: 0.6 },
  LOCALLY_UNUSUAL: { ifs: 0.65, aifs: 0.35 },
  SEVERE_OUTLIER: { ifs: 0.8, aifs: 0.2 }
} as const;
