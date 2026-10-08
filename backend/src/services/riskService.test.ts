import assert from "node:assert/strict";
import test from "node:test";
import { calculateRisk } from "./riskService.js";
import type { RiskInput } from "../models/risk.js";

const inputWith = (value: number): RiskInput => ({
  rainfallScore: value,
  rainfallTrendScore: value,
  citizenReportsScore: value,
  waterDepthScore: value,
  vulnerabilityScore: value
});

test("returns LOW for all zero factors", () => {
  const result = calculateRisk(inputWith(0));

  assert.equal(result.score, 0);
  assert.equal(result.band, "LOW");
});

test("returns CRITICAL for all maximum factors", () => {
  const result = calculateRisk(inputWith(100));

  assert.equal(result.score, 100);
  assert.equal(result.band, "CRITICAL");
});

test("returns MODERATE for a moderate score", () => {
  const result = calculateRisk(inputWith(40));

  assert.equal(result.score, 40);
  assert.equal(result.band, "MODERATE");
});

test("returns HIGH for a high score", () => {
  const result = calculateRisk(inputWith(60));

  assert.equal(result.score, 60);
  assert.equal(result.band, "HIGH");
});

test("uses the specified risk band boundaries", () => {
  assert.equal(calculateRisk(inputWith(30)).band, "LOW");
  assert.equal(calculateRisk(inputWith(31)).band, "MODERATE");
  assert.equal(calculateRisk(inputWith(50)).band, "MODERATE");
  assert.equal(calculateRisk(inputWith(51)).band, "HIGH");
  assert.equal(calculateRisk(inputWith(70)).band, "HIGH");
  assert.equal(calculateRisk(inputWith(71)).band, "CRITICAL");
});

test("calculates the weighted score and preserves factor scores", () => {
  const result = calculateRisk({
    rainfallScore: 80,
    rainfallTrendScore: 60,
    citizenReportsScore: 40,
    waterDepthScore: 20,
    vulnerabilityScore: 10
  });

  assert.equal(result.score, 47);
  assert.equal(result.band, "MODERATE");
  assert.deepEqual(result.factors, {
    rainfall: 80,
    rainfallTrend: 60,
    citizenReports: 40,
    waterDepth: 20,
    vulnerability: 10
  });
});

test("does not mutate the input", () => {
  const input = inputWith(25);
  const original = { ...input };

  calculateRisk(input);

  assert.deepEqual(input, original);
});

for (const [name, value] of [
  ["negative", -1],
  ["greater than 100", 101],
  ["NaN", Number.NaN],
  ["Infinity", Number.POSITIVE_INFINITY]
] as const) {
  test(`rejects ${name} values`, () => {
    assert.throws(() => calculateRisk({ ...inputWith(0), rainfallScore: value }), {
      message: /rainfallScore/
    });
  });
}
