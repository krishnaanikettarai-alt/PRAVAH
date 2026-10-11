# PRAVAH

**Environmental risk intelligence for localized rainfall, waterlogging, and
citizen observations.**

PRAVAH combines a 24-hour Open-Meteo precipitation forecast with an
explainable rules-based risk engine and recent citizen reports. The current
prototype presents the resulting assessment and report markers for the fixed
demo location **Bhubaneswar, Odisha**. It is intended for situational
awareness, not as an official warning or scientifically validated flood
prediction.

## Current implementation

### Implemented

- React and TypeScript dashboard with:
  - Live weather-risk assessment from the backend.
  - OpenStreetMap/Leaflet map centered on Bhubaneswar.
  - Calculated geographic risk marker and distinct citizen-report markers.
  - Citizen report submission, retrieval, loading, retry, and error states.
  - Severity, timestamp, optional water-depth, and description display.
- AWS SAM backend using Node.js 22.x and TypeScript.
- API Gateway and Lambda handlers for:
  - Health checks.
  - Citizen report creation and listing.
  - Stateless normalized risk calculation.
  - Open-Meteo weather-risk calculation with optional citizen-report
    integration.
- DynamoDB `ReportsTable` foundation using on-demand billing.
- Server-side validation, explicit-origin CORS, preflight handling, request
  size limits, and conservative API Gateway stage throttling.
- Paginated DynamoDB scans with explicit error handling.
- Configurable Lambda log retention and optional CloudWatch alarm declarations.

### Planned or deferred

- Geographic/time-based DynamoDB query design to replace full-table scans at
  production scale.
- Authentication, authorization, WAF, usage plans, and per-user quotas.
- S3 image storage and image upload.
- AI image analysis.
- Notifications through SNS or EventBridge.
- Production deployment, custom domains, and operational alert delivery.
- GPS or arbitrary location selection in the frontend.

S3 image storage, AI analysis, notifications, authentication, and production
AWS resources are **not implemented** in the current project.

## Technology stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS, Leaflet, and
  React Leaflet.
- **Backend:** Node.js 22.x, TypeScript, AWS Lambda, Amazon API Gateway, and
  AWS SAM.
- **Data:** Amazon DynamoDB through the AWS SDK for JavaScript v3.
- **Weather:** Open-Meteo forecast API.
- **Local development:** AWS SAM CLI, Docker Desktop, and DynamoDB Local.
- **Testing:** Node's test runner through `tsx`, TypeScript compiler, and Vite
  production builds.

## Architecture and data flow

The browser calls the API rather than accessing AWS services directly.

```text
React dashboard
    -> API Gateway
        -> Lambda handlers
            -> Open-Meteo forecast (weather-risk path)
            -> DynamoDB ReportsTable (report paths and opt-in integration)
            -> rules-based risk engine
    <- JSON risk assessment and citizen reports
```

The frontend uses `VITE_API_BASE_URL` when provided and otherwise defaults to
`http://127.0.0.1:3000`. The SAM template defines the API, Lambda functions,
DynamoDB table, CORS, throttling, log groups, optional alarms, and
non-secret outputs. These resources are configured for future deployment and
local SAM use; this repository has not been deployed to AWS.

See [docs/architecture.md](docs/architecture.md) for the broader architecture
and [backend/README.md](backend/README.md) for backend-specific configuration,
security, observability, and deployment-readiness notes.

## Risk model

The current risk engine calculates a normalized score from five factors:

| Factor | Weight |
| --- | ---: |
| Recent rainfall | 25% |
| Rainfall intensity/trend | 20% |
| Citizen reports | 25% |
| Reported water depth | 20% |
| Historical/geographical vulnerability | 10% |

Risk bands are:

| Score | Band |
| ---: | --- |
| 0–30 | LOW |
| 31–50 | MODERATE |
| 51–70 | HIGH |
| 71–100 | CRITICAL |

These are MVP engineering assumptions, not validated flood-prediction
thresholds. Citizen-reported severity is kept separate from the calculated
geographic risk score. Weather factors come from an Open-Meteo forecast, not
direct current observations.

## Prerequisites

For the frontend and backend tests/builds:

- Node.js 22.x or later
- npm

For the local SAM API:

- AWS SAM CLI
- Docker Desktop running

For DynamoDB-backed local API flows:

- DynamoDB Local running in Docker

No AWS credentials or AWS deployment are required for the unit tests or
frontend build. Local environment files are ignored by Git; do not commit
credentials or secrets.

## Windows PowerShell setup

From the repository root:

```powershell
cd C:\Users\KIIT\Desktop\PRAVAH

cd frontend
npm.cmd install

cd ..\backend
npm.cmd install
```

The frontend API base URL defaults to the local SAM API. To use another local
or deployed API, set `VITE_API_BASE_URL` in the ignored
`frontend/.env.local` file before starting Vite.

## Run the frontend

Start the Vite development server:

```powershell
cd C:\Users\KIIT\Desktop\PRAVAH\frontend
npm.cmd run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

Build the frontend for production output:

```powershell
npm.cmd run build
```

Preview an already-built frontend:

```powershell
npm.cmd run preview
```

## Run the backend API locally

Install dependencies and compile the backend:

```powershell
cd C:\Users\KIIT\Desktop\PRAVAH\backend
npm.cmd install
npm.cmd run build
```

Build the SAM application:

```powershell
sam build
```

Start the local API with Docker running:

```powershell
sam local start-api
```

The local API listens on `http://127.0.0.1:3000` by default. Test health:

```powershell
curl http://127.0.0.1:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "pravah-api",
  "version": "0.1.0"
}
```

The backend's local configuration can use the ignored
`backend/env.local.json` file for DynamoDB Local endpoint and table settings.
Do not print or commit that file. SAM Local containers can reach a host
DynamoDB Local process through `http://host.docker.internal:8000`.

## Run DynamoDB Local

DynamoDB Local is not an npm dependency or an AWS resource. With Docker
Desktop running, start it in a separate PowerShell window:

```powershell
docker run --rm -p 8000:8000 amazon/dynamodb-local:latest -jar DynamoDBLocal.jar -sharedDb
```

Use the ignored backend local-environment configuration to point the SAM
functions at `http://host.docker.internal:8000`. The SAM template's deployed
configuration does not use static AWS credentials or a local DynamoDB
endpoint.

## API

The implemented endpoints are:

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Service health check |
| `POST` | `/reports` | Validate and store a citizen report |
| `GET` | `/reports` | List stored citizen reports |
| `POST` | `/risk/calculate` | Calculate risk from five normalized factor scores |
| `POST` | `/risk/weather` | Calculate risk from a 24-hour Open-Meteo forecast, with optional report integration |

All endpoints return JSON. Authentication is not implemented. Request limits,
validation rules, response examples, error codes, report fields, and weather
integration behavior are documented in [docs/api.md](docs/api.md).

## Tests and verified validation commands

Backend tests:

```powershell
cd C:\Users\KIIT\Desktop\PRAVAH\backend
npm.cmd test
```

Backend type-check:

```powershell
npx.cmd tsc --noEmit
```

Frontend production build:

```powershell
cd ..\frontend
npm.cmd run build
```

Repository diff validation:

```powershell
cd ..
git diff --check
```

The current verified local state includes 71 passing backend tests, a passing
backend type-check, a passing frontend production build, and a passing
`git diff --check`. On the developer's Windows machine,
`sam validate --template-file backend/template.yaml` passed basic SAM
validation. `cfn-lint` is unavailable. No AWS deployment or live-resource
verification has occurred.

## Limitations and deployment status

- The risk formula, weights, and thresholds are a transparent prototype model;
  they are not scientifically validated flood predictions.
- The weather path uses an external Open-Meteo forecast and can return
  controlled errors when the provider is unavailable or incomplete.
- The current frontend is fixed to Bhubaneswar, Odisha; arbitrary location
  selection and GPS are not implemented.
- `GET /reports` and report-integrated `/risk/weather` currently use complete
  DynamoDB scans. This is acceptable only for a small MVP table and is not a
  scalable geographic/time query design.
- Public API routes have no authentication or authorization. CORS and API
  Gateway throttling are not authentication and do not prevent all abuse.
- The SAM template includes DynamoDB protection, logging, and optional alarm
  declarations, but no AWS resources are active until an explicit deployment.
- No production deployment has been performed, and no deployment URL is
  available.

See [docs/database.md](docs/database.md) for the current report schema,
retention protections, scan behavior, and deferred query redesign.

## Demo

Demo video: **[Link to be added]**
