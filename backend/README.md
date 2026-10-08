# PRAVAH backend

The backend is the AWS serverless foundation for PRAVAH. It currently provides
a health endpoint and the DynamoDB infrastructure and data model for future
citizen reports. The citizen report API is not implemented yet. It remains
intentionally free of external integrations, authentication, and notification
resources.

## Architecture

- **Amazon API Gateway** exposes the HTTP API.
- **AWS Lambda** runs the TypeScript health handler.
- **Amazon DynamoDB** provides the on-demand `ReportsTable` foundation.
- **AWS SAM** defines and builds the serverless application locally.
- **Node.js 22.x and TypeScript** provide the runtime and source language.

The `STAGE` environment variable is configured by SAM, while `AWS_REGION` is
read from Lambda's built-in runtime environment through the backend
configuration module. The table name is not injected into the health function
because no report handler consumes it yet; it will be provided through
environment configuration when that API is introduced. No secrets are stored
in the repository.

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

Build the SAM application:

```powershell
sam build
```

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

`GET /health` returns HTTP 200 with JSON and permissive CORS headers:

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
`src/models/report.ts`, but no report read or write API is implemented in this
phase. The table does not store image binaries; `imageKey` is reserved for a
future S3 object reference.

## Citizen reports API

The reports Lambda provides:

- `POST /reports` to validate and store a citizen report in DynamoDB.
- `GET /reports` to return stored reports.

The reports function receives the table name through `REPORTS_TABLE_NAME` and
has only `dynamodb:PutItem` and `dynamodb:Scan` permissions. `GET /reports`
currently uses a DynamoDB `Scan`, which is suitable only for the small MVP
table and must be replaced with access-pattern-driven querying before
production scale. See [docs/api.md](../docs/api.md) for request fields,
validation rules, response examples, and status codes.
