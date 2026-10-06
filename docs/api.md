# Planned MVP API

These endpoints describe the intended MVP contract. They are documentation
only; no API has been implemented yet.

## Conventions

- Responses will be JSON.
- Timestamps will use ISO 8601 in UTC.
- Locations will use latitude and longitude, with a documented coordinate
  reference system.
- Risk results will include source or observation timestamps and an
  explanation where available.
- Validation and error response shapes will be finalized before implementation.

## `GET /health`

Returns service availability and a minimal version or environment indicator.

**Planned response:** `200 OK`

```json
{
  "status": "ok",
  "service": "pravah-api",
  "timestamp": "2026-01-01T00:00:00Z"
}
```

## `GET /risk`

Returns risk intelligence for a requested location or area.

**Planned query parameters:**

- `lat` and `lon` for a point query.
- Optional `radius` or bounding-box parameters for an area query.
- Optional time or freshness parameters, to be defined with the data model.

**Planned response fields:**

- Risk category and score.
- Location and evaluation timestamp.
- Contributing signals and their source timestamps.
- Explanation, limitations, and data quality indicators.

The response will distinguish an indicative risk assessment from an official
warning or scientifically validated prediction.

## `POST /reports`

Creates a citizen report about observed waterlogging, flooding, drainage, or
related local conditions.

**Planned request fields:**

- Location.
- Observation description and category.
- Observation timestamp.
- Optional image reference or upload workflow details.

The implementation will validate payload size, coordinates, timestamps, and
allowed values before storing a report. Authentication is not part of the
initial scope.

**Planned response:** `201 Created`, containing the report identifier,
normalized location, and server timestamps.

## `GET /reports`

Lists citizen reports for a location or time window.

**Planned query parameters:**

- Bounding box or center plus radius.
- Start and end timestamps.
- Pagination cursor and page size.
- Optional report category.

The response will include report identifiers, locations, observation
timestamps, descriptions or summaries, image metadata references where
available, and pagination information.

## Not yet defined

Authentication, authorization, rate limits, signed image-upload URLs, exact
error schemas, and versioning strategy will be designed before these
endpoints are implemented.

