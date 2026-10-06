# Development plan

This phased plan is a proposed sequence, not a commitment to a delivery date.
Each phase should preserve the distinction between indicative risk
intelligence and official or scientifically validated flood prediction.

## Phase 1: Project foundation

- Confirm product assumptions, MVP geography, and data responsibilities.
- Establish repository conventions and environment configuration patterns.
- Keep frontend and backend workspace boundaries clear.
- Define initial API, database, location, timestamp, and error contracts.

## Phase 2: Frontend

- Create the React + TypeScript application shell.
- Add routing, configuration handling, loading/error states, and accessible
  layout.
- Build reusable map, risk-summary, and report UI foundations.

## Phase 3: AWS backend

- Define the API Gateway and Lambda application structure.
- Implement the health endpoint and request validation patterns.
- Design DynamoDB access patterns and S3 object-handling boundaries without
  exposing cloud credentials to the browser.

## Phase 4: Weather integration

- Select a weather/environmental provider with suitable regional coverage.
- Implement provider normalization, provenance, units, timestamps, and
  freshness checks.
- Store a small, observable set of inputs before adding more signals.

## Phase 5: Risk engine

- Document the initial signals, thresholds, weights, and data-quality rules.
- Implement an explainable rules-based assessment.
- Return score, category, contributing factors, freshness, and limitations.
- Validate behavior against representative scenarios without claiming
  scientific accuracy.

## Phase 6: Map

- Add the map provider and location search or viewport behavior.
- Render risk areas, summaries, timestamps, and explanations.
- Handle missing, stale, and low-confidence data clearly.

## Phase 7: Citizen reporting

- Implement report creation and listing with coordinate and timestamp
  validation.
- Add pagination, basic abuse protections, and useful report categories.
- Show report provenance and observation time on the map.

## Phase 8: Image storage

- Add controlled image-upload flow and S3 metadata tracking.
- Validate content type, size, ownership of report reference, and processing
  status.
- Define retention, failure, and deletion behavior.

## Phase 9: AI image analysis

- Evaluate an appropriate bounded image-analysis capability.
- Process images asynchronously where practical.
- Store model/service version, observations, confidence, and limitations.
- Keep AI observations separate from verified environmental measurements.

## Phase 10: Prediction

- Assess whether historical data is sufficient for a limited predictive
  experiment.
- Establish evaluation metrics, baselines, and geographic/time splits before
  considering a model.
- Do not introduce complex ML until the rules-based baseline and data quality
  are understood.

## Phase 11: Alerts

- Define alert conditions, freshness requirements, audience, and opt-in
  behavior.
- Add EventBridge scheduling and SNS delivery only after the risk contract is
  stable.
- Make clear that alerts are informational and do not replace official
  emergency communications.

## Phase 12: Testing

- Add unit tests for normalization, validation, risk calculations, and
  explanation output.
- Add API integration tests and frontend component or flow tests.
- Test stale data, missing data, invalid locations, large/invalid images,
  provider failures, duplicate reports, and notification failures.
- Review accessibility, performance, privacy, and cost assumptions.

## Phase 13: Deployment

- Define repeatable infrastructure and environment configuration.
- Add separate development and production safeguards if both are needed.
- Configure monitoring, logs, alarms, data retention, and rollback procedures.
- Deploy only after an explicit readiness review.

## Phase 14: Documentation

- Keep API, architecture, database, setup, data-source, and limitations
  documentation current.
- Document the risk methodology, provenance, known failure modes, and
  responsible-use guidance.
- Record operational runbooks and privacy/retention decisions.

## Phase 15: Demo

- Prepare a small, reproducible scenario using clearly labeled sample or
  permitted data.
- Demonstrate ingestion, risk explanation, map display, report submission,
  optional image analysis, and any alerts that are actually implemented.
- State assumptions, uncertainty, and out-of-scope features during the demo.

