import assert from "node:assert/strict";
import test from "node:test";
import type { Report } from "../models/report.js";
import type { WeatherForecast } from "../models/weather.js";
import { OpenMeteoTimeoutError } from "./openMeteoService.js";
import { ReportRepositoryError } from "../repositories/reportRepository.js";
import {
  calculateWeatherRisk,
  WeatherRiskInsufficientDataError,
  WeatherRiskProviderError,
  WeatherRiskTimeoutError
} from "./weatherRiskService.js";

const forecast = (values: number[]): WeatherForecast => ({
  latitude: 20.2961,
  longitude: 85.8245,
  timezone: "Asia/Kolkata",
  fetchedAt: "2026-10-09T12:00:00.000Z",
  source: "OPEN_METEO",
  hourly: values.map((precipitationMm, index) => ({
    time: `2026-10-09T${String(index).padStart(2, "0")}:00`,
    precipitationMm,
    precipitationProbabilityPercent: null
  }))
});

const input = {
  latitude: 20.2961,
  longitude: 85.8245,
  citizenReportsScore: 40,
  waterDepthScore: 20,
  vulnerabilityScore: 10
};
const integrationInput = {
  latitude: 20.2961,
  longitude: 85.8245,
  vulnerabilityScore: 10,
  useCitizenReports: true
};
const report = (overrides: Partial<Report> = {}): Report => ({
  reportId: "report-1",
  latitude: 20.2961,
  longitude: 85.8245,
  timestamp: "2026-10-09T12:00:00Z",
  severity: "HIGH",
  waterDepthCm: 50,
  source: "CITIZEN",
  createdAt: "2026-10-09T12:00:00Z",
  ...overrides
});

test("calculates rainfall and trend scores from the next 24 hours", async () => {
  const values = [...Array(12).fill(0.5), ...Array(12).fill(1.5)];
  const result = await calculateWeatherRisk(input, async () => forecast(values));

  assert.equal(result.weather.rainfallTotalMm, 24);
  assert.equal(result.weather.rainfallScore, 48);
  assert.equal(result.weather.rainfallTrendScore, 50);
  assert.equal(result.risk.factors.rainfall, 48);
  assert.equal(result.risk.factors.rainfallTrend, 50);
});

test("clamps rainfall and trend scores and assigns zero to decreasing trends", async () => {
  const values = [...Array(12).fill(3), ...Array(12).fill(1)];
  const result = await calculateWeatherRisk(input, async () => forecast(values));

  assert.equal(result.weather.rainfallScore, 96);
  assert.equal(result.weather.rainfallTrendScore, 0);

  const maximum = await calculateWeatherRisk(input, async () => forecast(Array(24).fill(3)));
  assert.equal(maximum.weather.rainfallScore, 100);
  assert.equal(maximum.weather.rainfallTrendScore, 0);
});

test("rejects incomplete forecasts", async () => {
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => forecast(Array(23).fill(1))),
    WeatherRiskProviderError
  );
});

test("rejects invalid precipitation and timestamps", async () => {
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => forecast([Number.NaN, ...Array(23).fill(1)])),
    WeatherRiskProviderError
  );
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => ({
      ...forecast(Array(24).fill(1)),
      hourly: [{ ...forecast(Array(24).fill(1)).hourly[0], time: "not-a-time" }, ...forecast(Array(24).fill(1)).hourly.slice(1)]
    })),
    WeatherRiskProviderError
  );
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => ({
      ...forecast(Array(24).fill(1)),
      hourly: [{ ...forecast(Array(24).fill(1)).hourly[0], time: "2026-02-30T00:00" }, ...forecast(Array(24).fill(1)).hourly.slice(1)]
    })),
    WeatherRiskProviderError
  );
});

test("rejects duplicate and missing hourly slots", async () => {
  const duplicate = forecast(Array(24).fill(1));
  duplicate.hourly[1].time = duplicate.hourly[0].time;
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => duplicate),
    WeatherRiskProviderError
  );

  const missing = forecast(Array(24).fill(1));
  missing.hourly[1].time = "2026-10-09T03:00";
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => missing),
    WeatherRiskProviderError
  );
});

test("maps the typed Open-Meteo timeout error", async () => {
  await assert.rejects(
    () => calculateWeatherRisk(input, async () => {
      throw new OpenMeteoTimeoutError();
    }),
    WeatherRiskTimeoutError
  );
});

test("preserves legacy caller-provided scores", async () => {
  const result = await calculateWeatherRisk(input, async () => forecast(Array(24).fill(1)));

  assert.equal(result.risk.factors.citizenReports, 40);
  assert.equal(result.risk.factors.waterDepth, 20);
});

test("integrates eligible reports and exposes aggregation metadata", async () => {
  const result = await calculateWeatherRisk(
    integrationInput,
    async () => forecast(Array(24).fill(1)),
    async () => [report()],
    () => "2026-10-09T12:00:00.000Z"
  );

  assert.equal(result.risk.factors.citizenReports, 75);
  assert.equal(result.risk.factors.waterDepth, 50);
  assert.deepEqual(result.citizenReports, {
    status: "AVAILABLE",
    severityScore: 75,
    waterDepthScore: 50,
    eligibleReportCount: 1,
    excludedReportCount: 0,
    eligibleWaterDepthReportCount: 1,
    radiusKm: 2,
    observationWindowHours: 6,
    evaluationTime: "2026-10-09T12:00:00.000Z"
  });
});

test("returns insufficient-data errors for no reports and unavailable depth", async () => {
  await assert.rejects(
    () => calculateWeatherRisk(
      integrationInput,
      async () => forecast(Array(24).fill(1)),
      async () => [],
      () => "2026-10-09T12:00:00.000Z"
    ),
    (error: unknown) => error instanceof WeatherRiskInsufficientDataError &&
      error.reason === "NO_ELIGIBLE_REPORTS"
  );
  await assert.rejects(
    () => calculateWeatherRisk(
      integrationInput,
      async () => forecast(Array(24).fill(1)),
      async () => [report({ waterDepthCm: undefined })],
      () => "2026-10-09T12:00:00.000Z"
    ),
    (error: unknown) => error instanceof WeatherRiskInsufficientDataError &&
      error.reason === "WATER_DEPTH_UNAVAILABLE"
  );
});

test("propagates repository failures without calculating risk", async () => {
  await assert.rejects(
    () => calculateWeatherRisk(
      integrationInput,
      async () => forecast(Array(24).fill(1)),
      async () => {
        throw new ReportRepositoryError();
      }
    ),
    ReportRepositoryError
  );
});

test("starts weather and report retrieval concurrently and shares evaluation time", async () => {
  const started: string[] = [];
  let reportEvaluationTime: string | undefined;
  const result = await calculateWeatherRisk(
    integrationInput,
    async () => {
      started.push("weather");
      await Promise.resolve();
      return forecast(Array(24).fill(1));
    },
    async () => {
      started.push("reports");
      return [report()];
    },
    () => {
      reportEvaluationTime = "2026-10-09T12:00:00.000Z";
      return reportEvaluationTime;
    }
  );

  assert.deepEqual(started, ["weather", "reports"]);
  assert.equal(result.citizenReports?.evaluationTime, reportEvaluationTime);
});
