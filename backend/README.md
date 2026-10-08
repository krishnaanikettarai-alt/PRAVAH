# PRAVAH backend

The backend is the AWS serverless foundation for PRAVAH. It currently
provides a single health endpoint and is intentionally free of persistent
storage, external integrations, authentication, and notification resources.

## Architecture

- **Amazon API Gateway** exposes the HTTP API.
- **AWS Lambda** runs the TypeScript health handler.
- **AWS SAM** defines and builds the serverless application locally.
- **Node.js 22.x and TypeScript** provide the runtime and source language.

The `STAGE` environment variable is configured by SAM, while `AWS_REGION` is
read from Lambda's built-in runtime environment through the backend
configuration module. No secrets are stored in the repository.

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
