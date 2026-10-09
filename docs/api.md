# MVP API

These endpoints describe the current MVP contract. The health, citizen report,
and risk calculation endpoints are implemented.

## Conventions

- Responses are JSON.
- Timestamps use ISO 8601 in UTC.
- Locations use numeric latitude and longitude.
- Authentication is not part of this phase.

## `GET /health`

Returns service availability.

**Response:** `200 OK`

```json
{
  "status": "ok",
  "service": "pravah-api",
  "version": "0.1.0"
}
```

## `POST /reports`

Creates a citizen report about observed waterlogging, flooding, drainage, or
related local conditions.

**Request body:**

```json
{
  "latitude": 20.2961,
  "longitude": 85.8245,
  "timestamp": "2026-10-08T15:30:00Z",
  "waterDepthCm": 25,
  "severity": "HIGH",
  "description": "Water covering the road near the junction"
}
```

Required fields are `latitude`, `longitude`, `timestamp`, and `severity`.
Optional fields are `waterDepthCm`, `description`, and `imageKey`.

Validation rules:

- `latitude` must be a finite number from -90 to 90.
- `longitude` must be a finite number from -180 to 180.
- `timestamp` must be an ISO 8601 date/time string.
- `severity` must be `LOW`, `MODERATE`, `HIGH`, or `CRITICAL`.
- `waterDepthCm`, when supplied, must be a finite number greater than or
  equal to zero.
- `description` and `imageKey`, when supplied, must be strings.

**Response:** `201 Created`

The response contains the stored report, including generated `reportId`,
`createdAt`, and `source: "CITIZEN"`.

```json
{
  "reportId": "2f3a3ad3-5c1c-4e4d-8799-0c0cba0af000",
  "latitude": 20.2961,
  "longitude": 85.8245,
  "timestamp": "2026-10-08T15:30:00Z",
  "waterDepthCm": 25,
  "severity": "HIGH",
  "description": "Water covering the road near the junction",
  "source": "CITIZEN",
  "createdAt": "2026-10-08T15:31:00.000Z"
}
```

Invalid JSON or fields return `400 Bad Request`:

```json
{
  "error": "Invalid request",
  "message": "latitude must be between -90 and 90"
}
```

## `GET /reports`

Lists all stored citizen reports.

**Response:** `200 OK`

```json
{
  "reports": [
    {
      "reportId": "2f3a3ad3-5c1c-4e4d-8799-0c0cba0af000",
      "latitude": 20.2961,
      "longitude": 85.8245,
      "timestamp": "2026-10-08T15:30:00Z",
      "waterDepthCm": 25,
      "severity": "HIGH",
      "description": "Water covering the road near the junction",
      "source": "CITIZEN",
      "createdAt": "2026-10-08T15:31:00.000Z"
    }
  ]
}
```

The implementation currently uses a DynamoDB `Scan`. This is acceptable only
for the small MVP table and must be replaced with access-pattern-driven
queries and an appropriate key/index design before production scale.

## Status codes

- `200 OK` — health or report list succeeded.
- `201 Created` — report was stored.
- `400 Bad Request` — invalid JSON or report fields.
- `405 Method Not Allowed` — unsupported method.
- `500 Internal Server Error` — unexpected service or DynamoDB failure.

Reports are stored in the on-demand DynamoDB `ReportsTable`. Geographic
querying, pagination, image upload, and S3 storage are not part of this phase.

## `POST /risk/calculate`

Calculates an indicative risk result from normalized MVP factor scores. This
endpoint is stateless and does not access DynamoDB or external services.

**Request body:**

```json
{
  "rainfallScore": 80,
  "rainfallTrendScore": 60,
  "citizenReportsScore": 40,
  "waterDepthScore": 20,
  "vulnerabilityScore": 10
}
```

All five fields are required finite numbers in the inclusive range `0` to
`100`. The values are currently normalized MVP inputs.

**Response:** `200 OK`

```json
{
  "score": 47,
  "band": "MODERATE",
  "factors": {
    "rainfall": 80,
    "rainfallTrend": 60,
    "citizenReports": 40,
    "waterDepth": 20,
    "vulnerability": 10
  },
  "recommendedAction": "Monitor rainfall and local reports. Avoid unnecessary travel through waterlogged areas."
}
```

Invalid JSON, missing fields, non-finite values, and values outside the
allowed range return `400 Bad Request`. Unsupported methods return `405
Method Not Allowed`; unexpected failures return `500 Internal Server Error`.

The risk weights, thresholds, and recommended actions are MVP engineering
assumptions and are not scientifically validated flood thresholds.
