import assert from "node:assert/strict";
import test from "node:test";
import type { Report } from "../models/report.js";
import {
  aggregateCitizenReportRisk,
  CITIZEN_REPORT_RADIUS_KM,
  CITIZEN_REPORT_WINDOW_HOURS
} from "./citizenReportRiskService.js";

const evaluationTime = "2026-10-09T12:00:00Z";
const baseReport = (overrides: Partial<Report> = {}): Report => ({
  reportId: "report-1",
  latitude: 20.2961,
  longitude: 85.8245,
  timestamp: evaluationTime,
  severity: "HIGH",
  source: "CITIZEN",
  createdAt: evaluationTime,
  ...overrides
});
const inputWith = (reports: readonly Report[]) => ({
  latitude: 20.2961,
  longitude: 85.8245,
  reports,
  evaluationTime
});

test("maps severity and returns a weighted score", () => {
  const result = aggregateCitizenReportRisk(inputWith([baseReport({ severity: "CRITICAL" })]));

  assert.equal(result.severityScore, 100);
  assert.equal(result.metadata.status, "AVAILABLE");
  assert.equal(result.metadata.eligibleReportCount, 1);
});

test("keeps a single report's normalized score independent of its weight", () => {
  const longitudeOffset = 1 / 111.32;
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ longitude: 85.8245 + longitudeOffset, severity: "CRITICAL" })
  ]));

  assert.equal(result.metadata.eligibleReportCount, 1);
  assert.equal(result.severityScore, 100);
});

test("weights recent reports more strongly than older reports", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ severity: "LOW", timestamp: "2026-10-09T07:00:00.000Z" }),
    baseReport({ reportId: "report-2", severity: "CRITICAL" })
  ]));

  assert.ok(result.severityScore > 50);
  assert.equal(result.metadata.eligibleReportCount, 2);
});

test("uses weight sums so a low-weight report does not arbitrarily dilute the score", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ severity: "CRITICAL" }),
    baseReport({
      reportId: "report-2",
      severity: "LOW",
      timestamp: "2026-10-09T07:00:00.000Z"
    })
  ]));

  assert.ok(Math.abs(result.severityScore - 625 / 7) < 1e-9);
});

test("calculates water depth separately from severity", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ severity: "LOW", waterDepthCm: 50 })
  ]));

  assert.equal(result.severityScore, 25);
  assert.equal(result.waterDepthScore, 50);
  assert.equal(result.metadata.eligibleWaterDepthReportCount, 1);
});

test("calculates water depth with an independent weighted mean", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ waterDepthCm: 100 }),
    baseReport({
      reportId: "report-2",
      waterDepthCm: 0,
      timestamp: "2026-10-09T07:00:00.000Z"
    })
  ]));

  assert.ok(result.waterDepthScore !== null);
  assert.ok(Math.abs((result.waterDepthScore ?? -1) - 600 / 7) < 1e-9);
});

test("treats reports with zero total weight as unavailable evidence", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({
      longitude: 85.8245 + CITIZEN_REPORT_RADIUS_KM / 111.32,
      waterDepthCm: 100,
      timestamp: "2026-10-09T06:00:00Z"
    })
  ]));

  assert.equal(result.metadata.eligibleReportCount, 1);
  assert.equal(result.metadata.status, "NO_DATA");
  assert.equal(result.severityScore, 0);
  assert.equal(result.waterDepthScore, null);
});

test("excludes invalid, future, stale, and distant reports", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ latitude: 91 }),
    baseReport({ reportId: "future", timestamp: "2026-10-09T12:01:00Z" }),
    baseReport({ reportId: "stale", timestamp: "2026-10-09T05:59:59Z" }),
    baseReport({ reportId: "distant", longitude: 86.5 })
  ]));

  assert.equal(result.metadata.eligibleReportCount, 0);
  assert.equal(result.metadata.excludedReportCount, 4);
  assert.equal(result.metadata.status, "NO_DATA");
  assert.equal(result.waterDepthScore, null);
});

test("returns NO_DATA without treating missing evidence as zero risk", () => {
  const result = aggregateCitizenReportRisk(inputWith([]));

  assert.equal(result.metadata.status, "NO_DATA");
  assert.equal(result.metadata.eligibleReportCount, 0);
  assert.equal(result.severityScore, 0);
  assert.equal(result.waterDepthScore, null);
});

test("reports configured metadata and keeps scores bounded", () => {
  const result = aggregateCitizenReportRisk(inputWith([
    baseReport({ severity: "CRITICAL", waterDepthCm: 1000 })
  ]));

  assert.equal(result.metadata.radiusKm, CITIZEN_REPORT_RADIUS_KM);
  assert.equal(result.metadata.observationWindowHours, CITIZEN_REPORT_WINDOW_HOURS);
  assert.equal(result.severityScore, 100);
  assert.equal(result.waterDepthScore, 100);
});

test("validates target coordinates and malformed report records safely", () => {
  assert.throws(
    () => aggregateCitizenReportRisk({ ...inputWith([]), latitude: 91 }),
    /latitude/
  );

  const result = aggregateCitizenReportRisk(inputWith([
    { ...baseReport(), timestamp: "2026-10-09 12:00:00" },
    { ...baseReport({ reportId: "malformed" }), severity: "UNKNOWN" as Report["severity"] }
  ]));
  assert.equal(result.metadata.status, "NO_DATA");
  assert.equal(result.metadata.excludedReportCount, 2);
});

test("rejects ambiguous, timezone-less, and invalid observation timestamps", () => {
  const timestamps = [
    "2026-10-09T12:00:00",
    "2026-02-30T12:00:00Z",
    "2026-10-09T12:00:00+25:00"
  ];

  for (const [index, timestamp] of timestamps.entries()) {
    const result = aggregateCitizenReportRisk(inputWith([
      baseReport({ reportId: `invalid-${index}`, timestamp })
    ]));
    assert.equal(result.metadata.status, "NO_DATA");
    assert.equal(result.metadata.excludedReportCount, 1);
  }
});
