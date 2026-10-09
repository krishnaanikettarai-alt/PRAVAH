import assert from "node:assert/strict";
import test from "node:test";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type { WeatherForecast } from "../models/weather.js";
import { createHandler } from "./weatherRisk.js";
import { OpenMeteoTimeoutError } from "../services/openMeteoService.js";
import { ReportRepositoryError } from "../repositories/reportRepository.js";

const event = (method: string, body: string | null): APIGatewayProxyEvent => ({
  httpMethod: method,
  body,
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  path: "/risk/weather",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  requestContext: {} as APIGatewayProxyEvent["requestContext"],
  resource: "/risk/weather",
  stageVariables: null
});

const validBody = {
  latitude: 20.2961,
  longitude: 85.8245,
  citizenReportsScore: 40,
  waterDepthScore: 20,
  vulnerabilityScore: 10
};

const validForecast: WeatherForecast = {
  latitude: 20.2961,
  longitude: 85.8245,
  timezone: "Asia/Kolkata",
  fetchedAt: "2026-10-09T12:00:00.000Z",
  source: "OPEN_METEO",
  hourly: Array.from({ length: 24 }, (_, index) => ({
    time: `2026-10-09T${String(index).padStart(2, "0")}:00`,
    precipitationMm: 1,
    precipitationProbabilityPercent: null
  }))
};
const validReport = {
  reportId: "report-1",
  latitude: 20.2961,
  longitude: 85.8245,
  timestamp: "2026-10-09T12:00:00Z",
  severity: "HIGH" as const,
  waterDepthCm: 50,
  source: "CITIZEN" as const,
  createdAt: "2026-10-09T12:00:00Z"
};

test("returns a weather-derived risk result", async () => {
  const result = await createHandler(async () => validForecast)(
    event("POST", JSON.stringify(validBody))
  );
  const body = JSON.parse(result.body);

  assert.equal(result.statusCode, 200);
  assert.equal(body.weather.rainfallTotalMm, 24);
  assert.equal(body.weather.rainfallScore, 48);
  assert.equal(body.risk.factors.rainfall, 48);
  assert.equal(body.metadata.forecastSource, "OPEN_METEO");
  assert.equal(body.dataQuality.status, "COMPLETE");
});

test("returns 400 for malformed JSON and invalid scores", async () => {
  const handler = createHandler(async () => validForecast);
  assert.equal((await handler(event("POST", "{"))).statusCode, 400);
  assert.equal((await handler(event("POST", JSON.stringify({
    ...validBody,
    waterDepthScore: 101
  })))).statusCode, 400);
});

test("returns 422 for missing non-weather factors", async () => {
  const { vulnerabilityScore: _, ...missing } = validBody;
  const result = await createHandler(async () => validForecast)(
    event("POST", JSON.stringify(missing))
  );

  assert.equal(result.statusCode, 422);
  assert.match(JSON.parse(result.body).message, /vulnerabilityScore/);
});

test("maps provider timeout and failure without exposing internals", async () => {
  const timeoutHandler = createHandler(async () => {
    throw new OpenMeteoTimeoutError();
  });
  const failureHandler = createHandler(async () => {
    throw new Error("provider secret response");
  });

  assert.equal((await timeoutHandler(event("POST", JSON.stringify(validBody)))).statusCode, 504);
  const failure = await failureHandler(event("POST", JSON.stringify(validBody)));
  assert.equal(failure.statusCode, 502);
  assert.doesNotMatch(failure.body, /provider secret/);
});

test("supports opt-in report integration and rejects conflicting score fields", async () => {
  const handler = createHandler(
    async () => validForecast,
    async () => [validReport],
    () => "2026-10-09T12:00:00.000Z"
  );
  const success = await handler(event("POST", JSON.stringify({
    latitude: 20.2961,
    longitude: 85.8245,
    vulnerabilityScore: 10,
    useCitizenReports: true
  })));
  const body = JSON.parse(success.body);

  assert.equal(success.statusCode, 200);
  assert.equal(body.risk.factors.citizenReports, 75);
  assert.equal(body.risk.factors.waterDepth, 50);
  assert.equal(body.citizenReports.evaluationTime, "2026-10-09T12:00:00.000Z");

  const conflict = await handler(event("POST", JSON.stringify({
    latitude: 20.2961,
    longitude: 85.8245,
    vulnerabilityScore: 10,
    useCitizenReports: true,
    citizenReportsScore: 1
  })));
  assert.equal(conflict.statusCode, 400);
});

test("maps report no-data and repository failures without leaking details", async () => {
  const noData = await createHandler(
    async () => validForecast,
    async () => []
  )(event("POST", JSON.stringify({
    latitude: 20.2961,
    longitude: 85.8245,
    vulnerabilityScore: 10,
    useCitizenReports: true
  })));
  assert.equal(noData.statusCode, 422);
  assert.match(noData.body, /NO_ELIGIBLE_REPORTS/);

  const failure = await createHandler(
    async () => validForecast,
    async () => {
      throw new ReportRepositoryError("database secret");
    }
  )(event("POST", JSON.stringify({
    latitude: 20.2961,
    longitude: 85.8245,
    vulnerabilityScore: 10,
    useCitizenReports: true
  })));
  assert.equal(failure.statusCode, 502);
  assert.doesNotMatch(failure.body, /database secret/);
});
