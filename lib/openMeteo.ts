import type { CityLocation, ForecastData } from "@/types/weather";
// Function signatures only. Data integration follows in the next phase.
export declare function geocodeCity(name: string): Promise<CityLocation[]>;
export declare function getPointForecast(lat: number, lon: number): Promise<ForecastData>;
