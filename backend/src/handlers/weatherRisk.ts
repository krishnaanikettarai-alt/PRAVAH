import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { WeatherRiskInput } from "../models/weatherRisk.js";
import {
  calculateWeatherRisk,
  WeatherRiskInputError,
  WeatherRiskProviderError,
  WeatherRiskTimeoutError,
  type ForecastProvider
} from "../services/weatherRiskService.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const response = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

class RequestError extends Error {
  public constructor(message: string, public readonly statusCode = 400) {
    super(message);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseInput = (body: string): WeatherRiskInput => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new RequestError("request body must be valid JSON");
  }
  if (!isRecord(parsed)) {
    throw new RequestError("request body must be a JSON object");
  }

  const missing = ["latitude", "longitude", "citizenReportsScore", "waterDepthScore", "vulnerabilityScore"]
    .filter((field) => !Object.prototype.hasOwnProperty.call(parsed, field));
  if (missing.length > 0) {
    throw new RequestError(`missing required fields: ${missing.join(", ")}`, 422);
  }

  return {
    latitude: parsed.latitude as number,
    longitude: parsed.longitude as number,
    citizenReportsScore: parsed.citizenReportsScore as number,
    waterDepthScore: parsed.waterDepthScore as number,
    vulnerabilityScore: parsed.vulnerabilityScore as number
  };
};

export const createHandler = (
  forecastProvider?: ForecastProvider
) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") {
    return response(204, null);
  }
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }
  if (!event.body) {
    return response(400, { error: "Invalid request", message: "request body is required" });
  }

  try {
    return response(200, await calculateWeatherRisk(parseInput(event.body), forecastProvider));
  } catch (error) {
    if (error instanceof RequestError) {
      return response(error.statusCode, {
        error: "Invalid request",
        message: error.message
      });
    }
    if (error instanceof WeatherRiskInputError) {
      return response(400, {
        error: "Invalid request",
        message: error.message
      });
    }
    if (error instanceof WeatherRiskTimeoutError) {
      return response(504, { error: "Weather provider timeout" });
    }
    if (error instanceof WeatherRiskProviderError) {
      return response(502, { error: "Weather provider unavailable" });
    }

    console.error("Weather risk calculation failed", error);
    return response(500, { error: "Internal server error" });
  }
};

export const handler = createHandler();
