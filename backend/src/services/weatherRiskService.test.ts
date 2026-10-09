import assert from "node:assert/strict";
import test from "node:test";
import type { WeatherForecast } from "../models/weather.js";
import { OpenMeteoTimeoutError } from "./openMeteoService.js";
import { calculateWeatherRisk, WeatherRiskProviderError, WeatherRiskTimeoutError } from "./weatherRiskService.js";

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
