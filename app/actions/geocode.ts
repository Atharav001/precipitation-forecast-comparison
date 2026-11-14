"use server";
import type { CityLocation } from "@/types/weather";
import { geocodeCity } from "@/lib/openMeteo";
export async function searchCity(name: string): Promise<CityLocation[]> { return geocodeCity(name); }
