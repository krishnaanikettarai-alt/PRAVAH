
const isSamLocal = process.env.AWS_SAM_LOCAL === "true";

export const config = {
  stage: process.env.STAGE ?? "dev",
  region: process.env.AWS_REGION ?? "ap-south-1",
  reportsTableName: process.env.REPORTS_TABLE_NAME,
  dynamodbEndpoint:
    process.env.DYNAMODB_ENDPOINT ??
    (isSamLocal ? "http://host.docker.internal:8000" : undefined),
  isSamLocal
} as const;
