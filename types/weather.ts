export interface CityLocation { name: string; country: string; latitude: number; longitude: number; }
export interface DailyForecast { date: string; ifsValueMm: number; aifsValueMm: number; }
export interface ForecastData { location: CityLocation; daily: DailyForecast[]; }
export interface ConsensusInput { ifsValueMm: number; aifsValueMm: number; }
export interface ConsensusOutput { consensusValueMm: number; weightIfs: number; weightAifs: number; divergenceMm: number; divergenceFlag: boolean; }
