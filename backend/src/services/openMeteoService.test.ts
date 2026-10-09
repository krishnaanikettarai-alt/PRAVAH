import assert from "node:assert/strict";
import test from "node:test";
import { getPrecipitationForecast } from "./openMeteoService.js";

const input = { latitude: 20.2961, longitude: 85.8245 };

const providerResponse = (body: unknown, ok = true): Response =>
  new Response(JSON.stringify(body), { status: ok ? 200 : 503 });

const directProviderResponse = (body: unknown): Response => ({
  ok: true,
  json: async () => body
} as Response);

const validProviderBody = {
  latitude: 20.2961,
  longitude: 85.8245,
  timezone: "Asia/Kolkata",
  hourly: {
    time: ["2026-10-09T00:00", "2026-10-09T01:00"],
    precipitation: [0.2, 1.5],
    precipitation_probability: [20, null]
  }
};

test("normalizes a valid Open-Meteo response", async () => {
  const result = await getPrecipitationForecast(input, async () => providerResponse(validProviderBody));

  assert.equal(result.latitude, 20.2961);
  assert.equal(result.longitude, 85.8245);
  assert.equal(result.timezone, "Asia/Kolkata");
  assert.equal(result.source, "OPEN_METEO");
  assert.match(result.fetchedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.deepEqual(result.hourly, [
    { time: "2026-10-09T00:00", precipitationMm: 0.2, precipitationProbabilityPercent: 20 },
    { time: "2026-10-09T01:00", precipitationMm: 1.5, precipitationProbabilityPercent: null }
  ]);
});

test("constructs the required request URL", async () => {
  let requestedUrl = "";
  await getPrecipitationForecast(input, async (url) => {
    requestedUrl = String(url);
    return providerResponse(validProviderBody);
  });

  const parsedUrl = new URL(requestedUrl);
  assert.equal(parsedUrl.origin, "https://api.open-meteo.com");
  assert.equal(parsedUrl.pathname, "/v1/forecast");
  assert.equal(parsedUrl.searchParams.get("latitude"), "20.2961");
  assert.equal(parsedUrl.searchParams.get("longitude"), "85.8245");
  assert.equal(parsedUrl.searchParams.get("hourly"), "precipitation,precipitation_probability");
  assert.equal(parsedUrl.searchParams.get("forecast_days"), "2");
  assert.equal(parsedUrl.searchParams.get("timezone"), "auto");
});

test("rejects invalid coordinates", async () => {
  await assert.rejects(() => getPrecipitationForecast({ latitude: 91, longitude: 0 }), /latitude/);
  await assert.rejects(() => getPrecipitationForecast({ latitude: 0, longitude: -181 }), /longitude/);
});

test("rejects invalid provider location metadata", async () => {
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({
      ...validProviderBody,
      latitude: 91
    })),
    /invalid location metadata/
  );
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({
      ...validProviderBody,
      longitude: -181
    })),
    /invalid location metadata/
  );
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({
      ...validProviderBody,
      timezone: " "
    })),
    /invalid location metadata/
  );
});

test("rejects HTTP errors and network failures", async () => {
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({}, false)),
    /Open-Meteo request failed/
  );
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => { throw new Error("network detail"); }),
    /Open-Meteo request failed/
  );
});

test("rejects aborted requests without exposing provider details", async () => {
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => {
      throw new DOMException("aborted", "AbortError");
    }),
    /Open-Meteo request timed out/
  );
});

test("rejects missing or inconsistent hourly data", async () => {
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({ timezone: "UTC" })),
    /missing hourly data/
  );
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => directProviderResponse({
      ...validProviderBody,
      hourly: { ...validProviderBody.hourly, precipitation: [1] }
    })),
    /inconsistent lengths/
  );
});

test("rejects invalid timestamps and precipitation values", async () => {
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({
      ...validProviderBody,
      hourly: { ...validProviderBody.hourly, time: ["not-a-time", "2026-10-09T01:00"] }
    })),
    /invalid timestamp/
  );
  await assert.rejects(
    () => getPrecipitationForecast(input, async () => providerResponse({
      ...validProviderBody,
      hourly: { ...validProviderBody.hourly, time: ["2026-02-30T01:00", "2026-10-09T01:00"] }
    })),
    /invalid timestamp/
  );
  for (const precipitation of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      () => getPrecipitationForecast(input, async () => providerResponse({
        ...validProviderBody,
        hourly: { ...validProviderBody.hourly, precipitation: [precipitation, 1] }
      })),
      /invalid precipitation/
    );
  }
});

test("applies the timeout while reading the response body", async () => {
  const fetchWithSlowBody = async (_url: Parameters<typeof fetch>[0], options?: RequestInit): Promise<Response> => ({
    ok: true,
    json: () => new Promise((_, reject) => {
      const signal = options?.signal;
      const rejectOnAbort = (): void => reject(new DOMException("aborted", "AbortError"));
      if (signal?.aborted) {
        rejectOnAbort();
      } else {
        signal?.addEventListener("abort", rejectOnAbort, { once: true });
      }
    })
  } as Response);

  await assert.rejects(
    () => getPrecipitationForecast(input, fetchWithSlowBody, 0),
    /Open-Meteo request timed out/
  );
});

test("rejects invalid precipitation probabilities", async () => {
  for (const probability of [-1, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
    await assert.rejects(
      () => getPrecipitationForecast(input, async () => directProviderResponse({
        ...validProviderBody,
        hourly: {
          ...validProviderBody.hourly,
          precipitation_probability: [probability, null]
        }
      })),
      /invalid precipitation probability/
    );
  }
});
