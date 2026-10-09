import type { RiskResult } from "./risk.js";

export interface WeatherRiskInput {
  latitude: number;
  longitude: number;
  citizenReportsScore: number;
  waterDepthScore: number;
  vulnerabilityScore: number;
}

export interface WeatherRiskResult {
  location: {
    latitude: number;
    longitude: number;
  };
  weather: {
    source: "OPEN_METEO";
    timezone: string;
    fetchedAt: string;
    horizonHours: 24;
    rainfallTotalMm: number;
    rainfallScore: number;
    rainfallTrendScore: number;
  };
  risk: RiskResult;
  dataQuality: {
    status: "COMPLETE";
    forecastHours: 24;
    requiredForecastHours: 24;
  };
  metadata: {
    forecastSource: "OPEN_METEO";
    limitations: string[];
  };
}
