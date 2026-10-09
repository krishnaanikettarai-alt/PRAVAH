import type {
  HourlyPrecipitation,
  WeatherForecast,
  WeatherInput
} from "../models/weather.js";

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const REQUEST_TIMEOUT_MS = 9000;

type FetchImplementation = typeof fetch;

export class OpenMeteoTimeoutError extends Error {
  public constructor() {
    super("Open-Meteo request timed out");
    this.name = "OpenMeteoTimeoutError";
  }
}

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  hourly: {
    time: string[];
    precipitation: number[];
    precipitation_probability: Array<number | null>;
  };
}

const localTimestampPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const validateCoordinates = (input: WeatherInput): void => {
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error("latitude must be a finite number between -90 and 90");
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error("longitude must be a finite number between -180 and 180");
  }
};

const isValidTimestamp = (value: unknown): value is string =>
  typeof value === "string" && (() => {
    const match = localTimestampPattern.exec(value);
    if (!match) {
      return false;
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

    return date.getUTCFullYear() === Number(year) &&
      date.getUTCMonth() === Number(month) - 1 &&
      date.getUTCDate() === Number(day) &&
      date.getUTCHours() === Number(hour) &&
      date.getUTCMinutes() === Number(minute) &&
      date.getUTCSeconds() === Number(second);
  })();

const parseProviderResponse = (value: unknown): OpenMeteoResponse => {
  if (!isRecord(value) || !isRecord(value.hourly)) {
    throw new Error("Open-Meteo response is missing hourly data");
  }

  const { hourly } = value;
  if (
    !Array.isArray(hourly.time) ||
    !Array.isArray(hourly.precipitation) ||
    !Array.isArray(hourly.precipitation_probability)
  ) {
    throw new Error("Open-Meteo response has invalid hourly arrays");
  }

  if (
    hourly.time.length !== hourly.precipitation.length ||
    hourly.time.length !== hourly.precipitation_probability.length
  ) {
    throw new Error("Open-Meteo hourly arrays have inconsistent lengths");
  }

  if (
    typeof value.latitude !== "number" ||
    !Number.isFinite(value.latitude) ||
    value.latitude < -90 ||
    value.latitude > 90 ||
    typeof value.longitude !== "number" ||
    !Number.isFinite(value.longitude) ||
    value.longitude < -180 ||
    value.longitude > 180 ||
    typeof value.timezone !== "string" ||
    value.timezone.trim().length === 0
  ) {
    throw new Error("Open-Meteo response has invalid location metadata");
  }

  return {
    latitude: value.latitude,
    longitude: value.longitude,
    timezone: value.timezone,
    hourly: {
      time: hourly.time as string[],
      precipitation: hourly.precipitation as number[],
      precipitation_probability: hourly.precipitation_probability as Array<number | null>
    }
  };
};

const normalizeHourly = (hourly: OpenMeteoResponse["hourly"]): HourlyPrecipitation[] =>
  hourly.time.map((time, index) => {
    if (!isValidTimestamp(time)) {
      throw new Error("Open-Meteo response contains an invalid timestamp");
    }

    const precipitation = hourly.precipitation[index];
    if (typeof precipitation !== "number" || !Number.isFinite(precipitation) || precipitation < 0) {
      throw new Error("Open-Meteo response contains an invalid precipitation value");
    }

    const probability = hourly.precipitation_probability[index];
    if (probability !== null && (
      typeof probability !== "number" ||
      !Number.isFinite(probability) ||
      probability < 0 ||
      probability > 100
    )) {
      throw new Error("Open-Meteo response contains an invalid precipitation probability");
    }

    return {
      time,
      precipitationMm: precipitation,
      precipitationProbabilityPercent: probability
    };
  });

export const getPrecipitationForecast = async (
  input: WeatherInput,
  fetchImplementation: FetchImplementation = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<WeatherForecast> => {
  validateCoordinates(input);

  const url = new URL(OPEN_METEO_URL);
  url.search = new URLSearchParams({
    latitude: String(input.latitude),
    longitude: String(input.longitude),
    hourly: "precipitation,precipitation_probability",
    forecast_days: "2",
    timezone: "auto"
  }).toString();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImplementation(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error("Open-Meteo request failed");
    }

    let providerData: unknown;
    try {
      providerData = await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw error;
      }
      throw new Error("Open-Meteo response was not valid JSON");
    }

    const parsed = parseProviderResponse(providerData);

    return {
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      timezone: parsed.timezone,
      fetchedAt: new Date().toISOString(),
      source: "OPEN_METEO",
      hourly: normalizeHourly(parsed.hourly)
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new OpenMeteoTimeoutError();
    }
    if (error instanceof Error && (
      error.message.startsWith("Open-Meteo") ||
      error.message.includes("invalid") ||
      error.message.includes("missing") ||
      error.message.includes("inconsistent")
    )) {
      throw error;
    }
    throw new Error("Open-Meteo request failed");
  } finally {
    clearTimeout(timeout);
  }
};
