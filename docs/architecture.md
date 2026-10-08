# Planned architecture

## Architectural goals

PRAVAH is planned as a small, serverless web platform that can ingest
location-aware environmental signals and community observations without
pretending that incomplete data provides certainty. The architecture should
keep data provenance, timestamps, and risk explanations available to the
frontend.

## Components

### React + TypeScript frontend

The browser application will provide the map, risk summaries, report
submission flow, and supporting explanations. It will request data through the
API rather than accessing AWS services directly.

### Serverless backend foundation

The backend is defined with AWS SAM. Amazon API Gateway exposes the initial
`GET /health` route and invokes a Node.js 22.x AWS Lambda function built from
strict TypeScript. This foundation keeps stage and AWS Region configuration in
environment variables while deferring persistent storage and other AWS
integrations until the corresponding workflows are implemented.

### API Gateway

Amazon API Gateway will expose the planned HTTP API, apply request routing,
and provide a boundary for validation, throttling, and CORS configuration.

### AWS Lambda

Lambda functions will handle health checks, risk queries, report creation and
listing, data normalization, and scheduled or event-driven processing. The
functions should remain small and focused, with explicit error handling.

### DynamoDB

DynamoDB will store operational records such as normalized environmental
observations, risk scores, citizen reports, image metadata, and AI analysis
results. Records will include timestamps and location information.

### S3

Amazon S3 will store citizen-submitted images and, where appropriate, derived
analysis artifacts. The API will keep metadata and references in DynamoDB
rather than exposing the bucket as the application data store.

### External weather and environmental data

A provider or set of providers will supply weather and environmental signals
such as rainfall, forecast conditions, temperature, water level, or other
available indicators. Provider limitations, timestamps, units, licensing, and
source identifiers must be preserved during normalization.

### AI image analysis

The core MVP AI image-analysis service will analyze citizen-submitted
flood/waterlogging images and produce bounded observations such as visible
standing water, road visibility, approximate severity indicators, and
potentially affected vehicles. Its output will remain uncertain supporting
evidence and must not be treated as a verified measurement or decision by
itself.

### Risk engine

The initial risk engine will combine documented signals, recency, location,
and data quality into an explainable risk score or category. It should expose
the contributing factors and avoid presenting the result as a scientifically
validated flood prediction.

The initial transparent scoring model for the hackathon MVP is:

| Factor | Weight |
| --- | ---: |
| Recent rainfall | 25% |
| Rainfall intensity/trend | 20% |
| Citizen reports | 25% |
| Reported water depth | 20% |
| Historical/geographical vulnerability | 10% |
| **Total** | **100%** |

Initial risk bands are:

| Score | Category |
| ---: | --- |
| 0-30 | LOW |
| 31-50 | MODERATE |
| 51-70 | HIGH |
| 71-100 | CRITICAL |

These weights and thresholds are initial engineering assumptions for the
hackathon MVP. They are not scientifically validated flood-prediction
thresholds. The risk engine should expose the contributing factors so a user
can understand why a location received its score. AI image-analysis output is
used as supporting evidence and is not treated as ground truth.

## Risk prediction

After the current-risk workflow is established, PRAVAH will estimate
near-term changes in risk using:

- Current environmental conditions.
- Recent rainfall intensity and trends.
- Incoming citizen observations.
- Recent risk history where available.

The output will be a near-term risk estimate with uncertainty, not a
guaranteed forecast. For example, if rainfall is increasing and multiple
recent citizen reports indicate rising water levels, the predicted risk for
that location may increase from the current category toward a higher
category.

### Optional event and operations components

- **EventBridge** may schedule weather ingestion or trigger asynchronous
  processing.
- **SNS** may distribute configured risk notifications.
- **CloudWatch** may collect logs, metrics, alarms, and operational traces.

These components are optional until the MVP workflows and notification
requirements are validated.

## Data flow

1. Environmental data, citizen reports, and submitted images enter through
   ingestion or API endpoints.
2. Lambda processing validates, timestamps, normalizes units, and associates
   inputs with location information.
3. Images are stored in S3, while structured observations, reports, image
   metadata, and analysis results are stored in DynamoDB.
4. AI image analysis produces bounded observations from submitted images.
5. The risk engine uses those AI observations as supporting evidence, combines
   them with environmental and community signals, and records current risk,
   predicted risk, contributing factors, source timestamps, and data
   limitations.
6. The API exposes current risk, predicted risk, and explanations to the
   frontend.
7. The map presents risk intelligence, recommendations, and report context;
   optional alert workflows can use EventBridge and SNS for configured
   notifications.

In shorthand:

```text
environmental data + citizen reports + images
        -> validation and normalization
        -> AI image analysis
        -> risk engine
        -> current risk + predicted risk + explanations
        -> map + recommendations + optional alerts
```

## Initial boundary

The first implementation should favor a transparent rules-based engine and a
small number of reliable data sources. Model training, autonomous actions,
official-warning replacement, and broad geographic scaling are not part of
this initial architecture.
