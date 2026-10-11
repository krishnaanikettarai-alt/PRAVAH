import assert from "node:assert/strict";
import test from "node:test";
import type { APIGatewayProxyEvent } from "aws-lambda";
import type { Report } from "../models/report.js";
import { createHandler } from "./reports.js";

const event = (method: string, body: string | null): APIGatewayProxyEvent => ({
  httpMethod: method,
  body,
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  path: "/reports",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  requestContext: {} as APIGatewayProxyEvent["requestContext"],
  resource: "/reports",
  stageVariables: null
});

const report: Report = {
  reportId: "report-1",
  latitude: 20.2961,
  longitude: 85.8245,
  timestamp: "2026-10-11T08:30:00Z",
  severity: "HIGH",
  source: "CITIZEN",
  createdAt: "2026-10-11T08:31:00Z"
};

test("creates a report and returns the service response", async () => {
  let received: unknown;
  const handler = createHandler(async (input) => {
    received = input;
    return report;
  });

  const result = await handler(event("POST", JSON.stringify({
    latitude: report.latitude,
    longitude: report.longitude,
    timestamp: report.timestamp,
    severity: report.severity
  })));

  assert.equal(result.statusCode, 201);
  assert.deepEqual(received, {
    latitude: report.latitude,
    longitude: report.longitude,
    timestamp: report.timestamp,
    severity: report.severity
  });
  assert.deepEqual(JSON.parse(result.body), report);
});

test("rejects malformed and non-object JSON request bodies", async () => {
  const handler = createHandler(async () => report);

  for (const body of ["{", "null", "[]", JSON.stringify("report")]) {
    const result = await handler(event("POST", body));
    assert.equal(result.statusCode, 400);
    assert.match(JSON.parse(result.body).message, /request body/);
  }
});

test("returns reports from the list service", async () => {
  const handler = createHandler(async () => report, async () => [report]);
  const result = await handler(event("GET", null));

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { reports: [report] });
});

test("returns CORS preflight and method errors", async () => {
  const handler = createHandler(async () => report, async () => []);
  const options = await handler(event("OPTIONS", null));
  const unsupported = await handler(event("DELETE", null));

  assert.equal(options.statusCode, 204);
  assert.equal(options.headers?.["Access-Control-Allow-Methods"], "GET,POST,OPTIONS");
  assert.equal(unsupported.statusCode, 405);
});

test("maps service failures without exposing internal details", async () => {
  const handler = createHandler(async () => {
    throw new Error("database secret");
  });
  const result = await handler(event("POST", JSON.stringify({
    latitude: report.latitude,
    longitude: report.longitude,
    timestamp: report.timestamp,
    severity: report.severity
  })));

  assert.equal(result.statusCode, 500);
  assert.doesNotMatch(result.body, /database secret/);
});
