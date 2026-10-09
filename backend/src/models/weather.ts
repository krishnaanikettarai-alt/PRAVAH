export interface WeatherInput {
  latitude: number;
  longitude: number;
}

export interface HourlyPrecipitation {
  time: string;
  precipitationMm: number;
  precipitationProbabilityPercent: number | null;
}

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  fetchedAt: string;
  source: "OPEN_METEO";
  hourly: HourlyPrecipitation[];
}
