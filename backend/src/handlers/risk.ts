import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { RiskInput } from "../models/risk.js";
import { calculateRisk } from "../services/riskService.js";

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

const requiredFields: Array<keyof RiskInput> = [
  "rainfallScore",
  "rainfallTrendScore",
  "citizenReportsScore",
  "waterDepthScore",
  "vulnerabilityScore"
];

class RiskRequestError extends Error {}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseRiskInput = (body: string): RiskInput => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(body);
  } catch {
    throw new RiskRequestError("request body must be valid JSON");
  }

  if (!isRecord(parsed)) {
    throw new RiskRequestError("request body must be a JSON object");
  }

  for (const field of requiredFields) {
    if (!Object.prototype.hasOwnProperty.call(parsed, field)) {
      throw new RiskRequestError(`${field} is required`);
    }

    const value = parsed[field];
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new RiskRequestError(`${field} must be a finite number`);
    }
    if (value < 0 || value > 100) {
      throw new RiskRequestError(`${field} must be between 0 and 100`);
    }
  }

  return {
    rainfallScore: parsed.rainfallScore as number,
    rainfallTrendScore: parsed.rainfallTrendScore as number,
    citizenReportsScore: parsed.citizenReportsScore as number,
    waterDepthScore: parsed.waterDepthScore as number,
    vulnerabilityScore: parsed.vulnerabilityScore as number
  };
};

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") {
    return response(204, null);
  }

  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed" });
  }

  if (!event.body) {
    return response(400, {
      error: "Invalid request",
      message: "request body is required"
    });
  }

  try {
    return response(200, calculateRisk(parseRiskInput(event.body)));
  } catch (error) {
    if (error instanceof RiskRequestError) {
      return response(400, {
        error: "Invalid request",
        message: error.message
      });
    }

    console.error("Risk calculation failed", error);
    return response(500, { error: "Internal server error" });
  }
};
