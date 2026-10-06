# PRAVAH

## Predictive Risk Assessment & Vulnerability Analysis Hub

**See the flow. Predict the risk.**

## Problem statement

Heavy rainfall, cyclones, and inadequate drainage can create highly localized
flooding and waterlogging. Residents and response teams often need a clearer
view of changing conditions at neighborhood scale, while relevant weather,
environmental, and community information may be fragmented across sources.

## Proposed solution

PRAVAH is a planned AI-assisted environmental risk intelligence platform that
will combine external weather and environmental observations, citizen reports,
location and geographical context, submitted images, and AI-assisted image
analysis to estimate current hyperlocal flood and waterlogging risk and
identify how that risk may change as conditions evolve. It will present
interpretable, location-aware risk intelligence through a map and future
alerts.

The initial product is intended to support situational awareness and
prioritization. It will not claim scientifically accurate flood prediction,
replace official warnings, or serve as an emergency response system.

## MVP scope

The first milestone is a focused hyperlocal flood and waterlogging risk
prototype for heavy-rainfall and cyclone-prone regions such as Odisha. It is
planned to include:

- A web map showing current risk information by location.
- A health check and read-only risk API.
- Weather/environmental observations from a selected external source.
- A transparent initial risk engine using documented signals and thresholds.
- Citizen reports containing a location, description, timestamp, and optional
  image.
- Object storage for submitted images and metadata.
- AI-assisted image analysis of submitted flood/waterlogging images to provide
  supporting observations such as visible water coverage, road visibility, and
  severity indicators.
- A simple risk explanation and clearly labeled uncertainty.

Authentication, chatbots, admin dashboards, mobile applications, IoT
functionality, complex machine-learning models, and automated emergency
dispatch are outside the MVP.

## Planned technology stack

- **Frontend:** React, TypeScript, and a web mapping library.
- **API and compute:** API Gateway and AWS Lambda.
- **Data:** Amazon DynamoDB for operational records and Amazon S3 for images
  and related objects.
- **External data:** Weather and environmental data providers, subject to
  availability, licensing, and rate limits.
- **AI analysis:** A bounded image-analysis service or model for the core MVP,
  treated as supplementary evidence rather than ground truth.
- **Operations:** Optional Amazon EventBridge, Amazon SNS, and Amazon
  CloudWatch integrations.

The exact providers, mapping library, and AI service will be selected during
implementation based on cost, access, regional coverage, and validation needs.

## High-level architecture

External environmental data and citizen submissions enter an API and
processing layer. Normalized observations and reports are stored in DynamoDB,
while submitted images are stored in S3. A risk engine combines available
signals into a location-aware score with an explanation. The frontend
retrieves risk intelligence and displays it on a map; optional notification
components can deliver alerts when configured.

See [docs/architecture.md](docs/architecture.md) for the planned components
and data flow.

## Development status

**Status: Project foundation and planning.**

This repository currently contains documentation and empty frontend/backend
workspace directories. No application logic, APIs, database tables, AWS
resources, or deployments have been created yet.

See [docs/development-plan.md](docs/development-plan.md) for the proposed
implementation phases.
