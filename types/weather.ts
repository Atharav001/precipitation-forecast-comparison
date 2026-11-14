export interface CityLocation { id?: number; name: string; region?: string; district?: string; country: string; latitude: number; longitude: number; }
export interface DailyForecast { date: string; ifsValueMm: number | null; aifsValueMm: number | null; }
export interface ForecastData {
  coordinates: { latitude: number; longitude: number };
  timezone: string;
  fetchedAt: string;
  source: "live" | "snapshot";
  daily: DailyForecast[];
}
export type Tier = "ROUTINE" | "LOCALLY_UNUSUAL" | "SEVERE_OUTLIER";
export interface ConsensusInput { ifsValueMm: number; aifsValueMm: number; climatologyP90Mm: number; climatologyMaxMm: number; }
export interface ConsensusOutput { consensusValueMm: number; tier: Tier; weightIfs: number; weightAifs: number; divergenceMm: number; divergenceFlag: boolean; }
export interface EnsembleBand { p10Mm: number; medianMm: number; p90Mm: number; meanMm: number; memberCount: number; }
export interface EnsembleDay { date: string; ifs: EnsembleBand | null; aifs: EnsembleBand | null; }
export interface EnsembleData { daily: EnsembleDay[]; fetchedAt: string; }
export interface ClimatologyDay { date: string; p90Mm: number; maxMm: number; sampleSize: number; }
export interface ClimatologyData { daily: ClimatologyDay[]; period: { start: string; end: string }; source: "ERA5 reanalysis"; }
