# PRAVAH backend

The backend is the AWS serverless foundation for PRAVAH. It currently provides
health, citizen reports, and stateless risk calculation endpoints, along with
the DynamoDB infrastructure and data model for reports. It remains
intentionally free of external integrations, authentication, and notification
resources.

## Architecture

- **Amazon API Gateway** exposes the HTTP API.
- **AWS Lambda** runs the TypeScript health, citizen-report, and weather-risk
  handlers.
- **Amazon DynamoDB** provides the on-demand `ReportsTable` foundation.
- **AWS SAM** defines and builds the serverless application locally.
- **Node.js 22.x and TypeScript** provide the runtime and source language.

The `STAGE`, `CORS_ALLOWED_ORIGIN`, and API Gateway throttle settings are
configured through SAM parameters. `AWS_REGION` is read from Lambda's
built-in runtime environment. The reports and integrated weather-risk functions
receive the DynamoDB table name through `REPORTS_TABLE_NAME`. No secrets are
stored in the repository.

## Prerequisites

- Node.js 22.x or later
- npm
- AWS SAM CLI
- Docker Desktop running for `sam local start-api`

## Install dependencies

From this directory:

```powershell
npm install
```

## Build

Compile TypeScript:

```powershell
npm run build
```

Run the backend unit and handler tests:

```powershell
npm test
```

These tests use mocked weather-provider and DynamoDB boundaries. They do not
require AWS credentials, a deployed API, Docker, or an external weather
provider.

Build the SAM application:

```powershell
sam build
```

The default local API configuration allows only `http://localhost:5173`.
For a future controlled deployment, supply `AllowedOrigin` as the exact
deployed HTTPS frontend origin and review the throttle parameters. Deployment
is intentionally outside this phase.

The weather-risk function uses a 15-second Lambda timeout. Open-Meteo's
request timeout remains 9 seconds, leaving approximately six seconds for
DynamoDB access, risk calculation, serialization, and a controlled error
response. API Gateway REST integrations have a shorter service-side timeout
ceiling than Lambda, so this does not make long synchronous requests
unbounded; provider latency remains an upstream limitation. Increasing the
timeout can increase the maximum billed duration for slow requests, while the
current 128 MB memory setting keeps the prototype conservative.

## Run the local API

With Docker running, start API Gateway and Lambda locally:

```powershell
sam local start-api
```

Then request the health endpoint:

```powershell
curl http://127.0.0.1:3000/health
```

## Health endpoint

`GET /health` returns HTTP 200 with JSON and the configured CORS origin:

```json
{
  "status": "ok",
  "service": "pravah-api",
  "version": "0.1.0"
}
```

## DynamoDB foundation

The SAM template creates an on-demand `ReportsTable` with `reportId` as its
string partition key. The report model is defined in
`src/models/report.ts`. The table does not store image binaries; `imageKey` is
reserved for a future S3 object reference.

The table resource declares point-in-time recovery and deletion protection.
CloudFormation also uses `DeletionPolicy: Retain` and
`UpdateReplacePolicy: Retain`, so stack deletion or a replacement does not
automatically delete the table. These settings protect submitted reports but
also mean development cleanup requires an explicit table deletion workflow;
they have not been applied to a live AWS table in this phase.

## Citizen reports API

The reports Lambda provides:

- `POST /reports` to validate and store a citizen report in DynamoDB.
- `GET /reports` to return stored reports.

The reports function receives the table name through `REPORTS_TABLE_NAME` and
has only `dynamodb:PutItem` and `dynamodb:Scan` permissions. The opt-in
weather-risk integration receives the same table name and only
`dynamodb:Scan` access; legacy weather-risk requests do not retrieve reports.
Report descriptions are limited to 2,000 characters, image keys to 512
characters, and JSON request bodies to 32 KiB.

Report retrieval follows DynamoDB scan pagination through `LastEvaluatedKey`
and `ExclusiveStartKey`. A successful empty scan returns an empty list, while
any page failure is surfaced as a repository error rather than an empty
result. This is a small-MVP full-table scan because the current table has only
the `reportId` key and no geographic index. Scans are eventually consistent
and do not provide a point-in-time snapshot across pages. A geographic and
time-oriented key or index should be designed before production scale.
See [docs/api.md](../docs/api.md) for request fields, validation rules,
response examples, and status codes.

There are currently two full-table scan paths:

- `GET /reports` scans all report pages to preserve the existing complete-list
  response contract.
- `POST /risk/weather` with `useCitizenReports: true` scans all report pages
  so the aggregation service can apply its existing 2 km and six-hour
  eligibility rules.

These scans are not safely bounded with the current `reportId`-only key without
silently truncating results or changing the API contract. The deferred design
is a location/time access pattern: store a normalized geospatial partition
(for example, a geohash or fixed grid cell) as the partition key and an
observation timestamp as the sort key, then query the relevant neighboring
cells with a six-hour lower-bound condition. A GSI may preserve the current
write model while enabling that query, but it requires a migration/backfill,
capacity and privacy review, and a repository/API rollout plan. `GET /reports`
would additionally need an explicit pagination contract before it can stop
returning the complete list.

The current `ReportsFunction` and `WeatherRiskFunction` IAM policies are scoped
to the single table ARN. No wildcard table resources, delete permissions, or
table-management permissions are granted.

For local SAM, `DYNAMODB_ENDPOINT` and local credentials are read only from the
ignored `backend/env.local.json`. Deployed Lambda functions receive no static
AWS credentials from the template; AWS execution-role credentials are used
instead. Local environment files must remain untracked.

## Logging and monitoring

The template declares one CloudWatch log group per Lambda function with a
configurable `LogRetentionDays` parameter, defaulting to 14 days. The log
groups use retention policies so deleting or replacing the stack does not
automatically delete historical logs. Retention controls storage cost; it does
not prevent log ingestion charges.

Handler and repository failures are logged as small JSON records containing an
event category and error name only. They do not log request bodies, report
descriptions, coordinates, credentials, or environment variables. Expected
client validation errors are returned without error logging.

Optional prototype alarms can be declared with
`EnableMonitoringAlarms=true`. They are disabled by default and have no
notification actions configured. When enabled, the template declares
five-minute, one-period alarms for:

- Lambda `Errors` and `Throttles` for each function, dimensioned by
  `FunctionName`.
- API Gateway `5XXError`, dimensioned by `ApiName` and `Stage`.
- DynamoDB `ThrottledRequests` and `SystemErrors`, dimensioned by
  `TableName`.

The default threshold is one event in a five-minute period and missing data is
treated as not breaching. These are conservative detection alarms, not a
complete incident response system, and can be noisy during intentional tests.
No SNS actions, notification endpoints, or paid alerting resources are
declared. Verify metric dimensions and generated resource names with
`sam validate`/`sam build` and a non-production deployment review before
enabling them.

CloudWatch alarms are declarations in this template only; no alarms or log
groups have been created or verified in AWS by this phase.

## Cost controls and deployment checks

The main current cost risks are API Gateway traffic, Lambda duration during
weather-provider waits, DynamoDB full-table scans, report-table growth, and
CloudWatch log ingestion/retention. API Gateway stage throttling limits
aggregate request rate but is not a spending cap or identity-based abuse
control. Pay-per-request DynamoDB avoids idle provisioned capacity but does not
make unbounded scans free. Open-Meteo latency is an external reliability
dependency and is not an AWS cost guarantee.

Before deployment, review request volumes, scan growth, Lambda duration,
CloudWatch retention, alarm behavior, and AWS pricing for the selected region.
Confirm the stage and `AllowedOrigin` are explicit, inspect the generated API
URL output, and decide whether optional alarms should be enabled with
notification actions managed separately.

The automated tests mock DynamoDB and Open-Meteo. A live local API workflow
requires SAM CLI and Docker, plus access to a configured DynamoDB table and
internet access to Open-Meteo. The repository does not provision a local
DynamoDB emulator automatically.

## API security boundary

API Gateway and Lambda use the same exact `CORS_ALLOWED_ORIGIN` value. CORS
controls which browser origins may read responses; it is not authentication
and does not prevent direct HTTP clients from calling the public routes.
The API currently has no authentication, WAF, usage plan, per-client quota, or
spam-prevention mechanism. API Gateway stage throttling defaults to a
10-request-per-second rate and a 20-request burst, which limits aggregate
stage traffic but does not provide identity-based abuse prevention.

Lambda handlers remain the authoritative validation boundary for JSON shape,
numeric ranges, integration-mode score restrictions, optional string types,
and field sizes. API Gateway request validators can reject malformed JSON
schemas when explicit models are attached, but they cannot express all
conditional `/risk/weather` integration rules and do not replace Lambda
validation. No separate API Gateway models are currently attached.

Run the focused security and full backend checks locally:

```powershell
npm test
npx.cmd tsc --noEmit
```

These commands do not deploy or contact AWS.

## Risk engine

The pure risk engine is available through `calculateRisk` in
`src/services/riskService.ts`. It combines normalized factor scores using the
MVP weights and returns a score, risk band, factor scores, and a recommended
action. Its thresholds and recommendations are engineering assumptions, not
scientifically validated flood thresholds. The engine does not access AWS,
environment variables, or external services.

The `POST /risk/calculate` endpoint exposes this calculation through a
stateless Lambda function. It accepts five normalized factor scores from 0 to
100 and returns the risk result without accessing DynamoDB or other external
services. Invalid JSON or values return `400 Bad Request`.

The `POST /risk/weather` endpoint preserves its legacy request contract by
using caller-provided citizen-report, water-depth, and vulnerability scores.
With `useCitizenReports: true`, the service instead retrieves reports through
the paginated repository and derives severity and water-depth scores using the
pure citizen-report aggregation service. This opt-in mode requires eligible
reports with usable water-depth evidence; either missing evidence returns
`422`, while report repository failures return a generic `502`. The weather
and report reads run concurrently using one evaluation timestamp. The
prototype rainfall, trend, and report scoring thresholds are engineering
assumptions, not scientifically validated flood thresholds. Invalid input
returns `400`; provider timeouts return `504`; other provider failures return
`502`. See [docs/api.md](../docs/api.md) for the complete contract.

## Open-Meteo weather service

The isolated `getPrecipitationForecast` service retrieves two days of hourly
precipitation and precipitation-probability forecasts from Open-Meteo. It
returns location, timezone, fetch time, source, and normalized hourly
precipitation records. This data is a forecast, not a direct observation, and
forecasts are not guaranteed to be accurate. Any future UI displaying this
data must attribute Open-Meteo in accordance with its
[terms](https://open-meteo.com/en/terms).
