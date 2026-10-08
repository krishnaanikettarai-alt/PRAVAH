export const config = {
  stage: process.env.STAGE ?? "dev",
  region: process.env.AWS_REGION ?? "local",
  reportsTableName: process.env.REPORTS_TABLE_NAME,
  dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT
} as const;
