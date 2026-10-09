import assert from "node:assert/strict";
import test from "node:test";
import type { APIGatewayProxyEvent } from "aws-lambda";
import { handler } from "./risk.js";

const event = (httpMethod: string, body: string | null): APIGatewayProxyEvent => ({
  httpMethod,
  body,
  headers: {},
  multiValueHeaders: {},
  isBase64Encoded: false,
  path: "/risk/calculate",
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  requestContext: {
    accountId: "test-account",
    apiId: "test-api",
    authorizer: null,
    protocol: "HTTP/1.1",
    httpMethod,
    identity: {
      accessKey: null,
      accountId: null,
      apiKey: null,
      apiKeyId: null,
      caller: null,
      clientCert: null,
      cognitoAuthenticationProvider: null,
      cognitoAuthenticationType: null,
      cognitoIdentityId: null,
      cognitoIdentityPoolId: null,
      principalOrgId: null,
      sourceIp: "127.0.0.1",
      user: null,
      userAgent: null,
      userArn: null
    },
    path: "/risk/calculate",
    stage: "test",
    requestId: "test-request",
    requestTimeEpoch: 0,
    resourceId: "test-resource",
    resourcePath: "/risk/calculate"
  },
  resource: "/risk/calculate",
  stageVariables: null
});

const validInput = {
  rainfallScore: 80,
  rainfallTrendScore: 60,
  citizenReportsScore: 40,
  waterDepthScore: 20,
  vulnerabilityScore: 10
};

test("returns the existing Risk Engine result for a valid POST", async () => {
  const result = await handler(event("POST", JSON.stringify(validInput)));

  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), {
    score: 47,
    band: "MODERATE",
    factors: {
      rainfall: 80,
      rainfallTrend: 60,
      citizenReports: 40,
      waterDepth: 20,
      vulnerability: 10
    },
    recommendedAction: "Monitor rainfall and local reports. Avoid unnecessary travel through waterlogged areas."
  });
});

test("rejects malformed JSON", async () => {
  const result = await handler(event("POST", "{"));

  assert.equal(result.statusCode, 400);
});

test("rejects a missing required field", async () => {
  const { vulnerabilityScore: _, ...missingField } = validInput;
  const result = await handler(event("POST", JSON.stringify(missingField)));

  assert.equal(result.statusCode, 400);
  assert.match(JSON.parse(result.body).message, /vulnerabilityScore/);
});

test("rejects non-numeric, non-finite, and out-of-range values", async () => {
  for (const value of ["80", Number.NaN, Number.POSITIVE_INFINITY, -1, 101]) {
    const result = await handler(event("POST", JSON.stringify({
      ...validInput,
      rainfallScore: value
    })));

    assert.equal(result.statusCode, 400);
  }
});

test("rejects non-object request bodies", async () => {
  const result = await handler(event("POST", JSON.stringify([validInput])));

  assert.equal(result.statusCode, 400);
});

test("returns 405 for unsupported methods", async () => {
  const result = await handler(event("GET", null));

  assert.equal(result.statusCode, 405);
});

test("supports CORS preflight", async () => {
  const result = await handler(event("OPTIONS", null));

  assert.equal(result.statusCode, 204);
  assert.equal(result.headers?.["Access-Control-Allow-Methods"], "GET,POST,OPTIONS");
});
