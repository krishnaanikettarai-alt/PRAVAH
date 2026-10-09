# Data model

Phase 2A provisions the initial DynamoDB table for citizen reports. The
entities below describe the information the MVP is expected to retain in
DynamoDB, with images and other large objects reserved for S3 in a later
phase.

## Environmental and weather observations

An observation represents a provider reading or forecast associated with a
location and observation time. Planned fields include:

- Observation identifier and provider/source identifier.
- Measurement type, value, unit, and quality or availability status.
- Observation time, ingestion time, and optional forecast period.
- Latitude, longitude, and any source region or grid identifier.
- Raw-source reference or provenance metadata where permitted.

The schema should preserve source timestamps and units so that stale or
incompatible data is not silently treated as current.

## Risk scores

A risk score represents an assessment generated for a location and evaluation
period. Planned fields include:

- Score identifier, category, and normalized score.
- Evaluation timestamp and validity or freshness window.
- Location and spatial resolution.
- Contributing observations, reports, and image-analysis references.
- Explanation, data-quality indicators, and known limitations.
- Risk-engine version or configuration identifier.

Risk scores are indicative intelligence and must not be represented as
official warnings or validated flood predictions.

## Citizen reports

Phase 2A creates the `ReportsTable` DynamoDB table for citizen
environmental/flood/waterlogging reports. Its physical name is
`pravah-reports-${Stage}` and its primary key is:

| Attribute | Type | Key role |
| --- | --- | --- |
| `reportId` | String | Partition key |

The table uses `PAY_PER_REQUEST` billing to avoid provisioned-capacity charges
while the MVP usage pattern is unknown. No GSI is currently required because
the report API and its access patterns have not been implemented yet.

The current TypeScript model contains:

- `reportId: string`
- `latitude: number`
- `longitude: number`
- `timestamp: string` (ISO 8601)
- `waterDepthCm?: number`
- `severity: LOW | MODERATE | HIGH | CRITICAL`
- `description?: string`
- `source: CITIZEN`
- `imageKey?: string` (future S3 object reference only)
- `createdAt: string` (ISO 8601)

The model does not contain user identity fields or image binary data.
Validation and DynamoDB read/write behavior are implemented by the citizen
report API. Repository reads use a paginated full-table scan, following
`LastEvaluatedKey` with `ExclusiveStartKey` until all pages are retrieved. A
failed page fails the complete read rather than returning partial results,
while a successful empty table returns an empty list. Scan results are
eventually consistent and do not provide a point-in-time snapshot across
pages. This is a small-MVP strategy because the table has no geographic or
time-based index; a future key design or GSI will be needed for scalable
location and time queries. The opt-in weather-risk integration uses this
repository read with only `dynamodb:Scan` permission scoped to this table;
legacy weather-risk requests do not access DynamoDB.

This is an MVP engineering model for storing citizen observations. It is not a
scientifically validated environmental data model.

## Image metadata

Image metadata links an optional submitted image to a report without storing
the binary in DynamoDB. Planned fields include:

- Image and report identifiers.
- S3 object key and storage metadata.
- Content type, byte size, checksum, and upload timestamp.
- Image dimensions and processing status.
- Retention or deletion status.

Access should use controlled upload and retrieval mechanisms when implemented.

## AI analysis

An AI analysis record stores the output of an optional image-analysis step.
Planned fields include:

- Analysis identifier, image identifier, and model or service version.
- Processing timestamp and status.
- Observations, labels, confidence values, and explanation metadata.
- Error or limitation details when analysis is incomplete.

AI output is supplementary and uncertain. It should remain distinguishable
from direct measurements and citizen-provided observations.

## Timestamps and location information

All entities should record the relevant event or observation timestamp and the
server ingestion/creation timestamp. Times will be stored in UTC using an
ISO-compatible representation at the API boundary.

Locations will include latitude and longitude with validation and a documented
coordinate reference system. Additional geospatial indexing fields may be
added for map queries. Location precision and any privacy-preserving
generalization will be decided before citizen reporting is implemented.

## Storage and access principles

DynamoDB access patterns should eventually be designed around the MVP queries:
recent risk by location, reports within an area and time range, and
report-to-image or report-to-analysis lookup. The current table has only the
report identifier key; additional geographic or time-oriented indexes should
be added only when the API access patterns justify them. S3 is reserved for
binary objects. Retention, privacy, cost controls, and backup requirements
will be finalized before broader production use.
