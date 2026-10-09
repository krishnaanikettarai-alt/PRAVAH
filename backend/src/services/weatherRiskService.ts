import type { RiskInput, RiskResult } from "../models/risk.js";
import type { WeatherForecast, WeatherInput } from "../models/weather.js";
import type { WeatherRiskInput, WeatherRiskResult } from "../models/weatherRisk.js";
import { getPrecipitationForecast, OpenMeteoTimeoutError } from "./openMeteoService.js";
import { calculateRisk } from "./riskService.js";

const FORECAST_HOURS = 24;
const RAINFALL_MAX_MM = 50;
const TREND_MAX_INCREASE_MM_PER_HOUR = 2;
const LIMITATIONS = [
  "Weather factors are derived from an Open-Meteo forecast, not direct observations.",
  "Risk weights, thresholds, and actions are MVP engineering assumptions and are not scientifically validated flood thresholds."
];
const localTimestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

export class WeatherRiskTimeoutError extends Error {}
export class WeatherRiskProviderError extends Error {}
export class WeatherRiskInputError extends Error {}

export type ForecastProvider = (input: WeatherInput) => Promise<WeatherForecast>;

const validateScore = (name: keyof WeatherRiskInput, value: number): void => {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new WeatherRiskInputError(`${name} must be a finite number between 0 and 100`);
  }
};

const validateInput = (input: WeatherRiskInput): void => {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new WeatherRiskInputError("latitude must be a finite number between -90 and 90");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new WeatherRiskInputError("longitude must be a finite number between -180 and 180");
  }
  validateScore("citizenReportsScore", input.citizenReportsScore);
  validateScore("waterDepthScore", input.waterDepthScore);
  validateScore("vulnerabilityScore", input.vulnerabilityScore);
};

const calculateRainfallScore = (totalMm: number): number =>
  Math.min(100, Math.max(0, totalMm / RAINFALL_MAX_MM * 100));

const calculateTrendScore = (hourly: WeatherForecast["hourly"]): number => {
  const firstAverage = hourly
    .slice(0, 12)
    .reduce((total, item) => total + item.precipitationMm, 0) / 12;
  const secondAverage = hourly
    .slice(12, 24)
    .reduce((total, item) => total + item.precipitationMm, 0) / 12;
  const increase = secondAverage - firstAverage;

  return increase <= 0
    ? 0
    : Math.min(100, increase / TREND_MAX_INCREASE_MM_PER_HOUR * 100);
};

const timestampToSlot = (value: string): number | null => {
  const match = localTimestampPattern.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ));

  if (
    date.getUTCFullYear() !== Number(year) ||
    date.getUTCMonth() !== Number(month) - 1 ||
    date.getUTCDate() !== Number(day) ||
    date.getUTCHours() !== Number(hour) ||
    date.getUTCMinutes() !== Number(minute) ||
    date.getUTCSeconds() !== Number(second)
  ) {
    return null;
  }

  return date.getTime();
};

const validateForecast = (forecast: WeatherForecast): WeatherForecast["hourly"] => {
  if (
    typeof forecast !== "object" ||
    forecast === null ||
    !Array.isArray(forecast.hourly) ||
    forecast.hourly.length < FORECAST_HOURS
  ) {
    throw new WeatherRiskProviderError();
  }

  const hourly = forecast.hourly.slice(0, FORECAST_HOURS);
  let previousSlot: number | undefined;
  for (const item of hourly) {
    if (
      typeof item !== "object" ||
      item === null ||
      typeof item.time !== "string" ||
      !Number.isFinite(item.precipitationMm) ||
      item.precipitationMm < 0
    ) {
      throw new WeatherRiskProviderError();
    }

    const slot = timestampToSlot(item.time);
    if (slot === null || (previousSlot !== undefined && slot !== previousSlot + 60 * 60 * 1000)) {
      throw new WeatherRiskProviderError();
    }
    previousSlot = slot;
  }

  return hourly;
};

export const calculateWeatherRisk = async (
  input: WeatherRiskInput,
  forecastProvider: ForecastProvider = getPrecipitationForecast
): Promise<WeatherRiskResult> => {
  validateInput(input);

  let forecast: WeatherForecast;
  try {
    forecast = await forecastProvider({
      latitude: input.latitude,
      longitude: input.longitude
    });
  } catch (error) {
    if (error instanceof OpenMeteoTimeoutError) {
      throw new WeatherRiskTimeoutError();
    }
    throw new WeatherRiskProviderError();
  }

  const hourly = validateForecast(forecast);
  const rainfallTotalMm = hourly.reduce((total, item) => total + item.precipitationMm, 0);
  const rainfallScore = calculateRainfallScore(rainfallTotalMm);
  const rainfallTrendScore = calculateTrendScore(hourly);
  const riskInput: RiskInput = {
    rainfallScore,
    rainfallTrendScore,
    citizenReportsScore: input.citizenReportsScore,
    waterDepthScore: input.waterDepthScore,
    vulnerabilityScore: input.vulnerabilityScore
  };
  const risk: RiskResult = calculateRisk(riskInput);

  return {
    location: {
      latitude: input.latitude,
      longitude: input.longitude
    },
    weather: {
      source: forecast.source,
      timezone: forecast.timezone,
      fetchedAt: forecast.fetchedAt,
      horizonHours: FORECAST_HOURS,
      rainfallTotalMm,
      rainfallScore,
      rainfallTrendScore
    },
    risk,
    dataQuality: {
      status: "COMPLETE",
      forecastHours: FORECAST_HOURS,
      requiredForecastHours: FORECAST_HOURS
    },
    metadata: {
      forecastSource: forecast.source,
      limitations: LIMITATIONS
    }
  };
};
