export const config = {
  stage: process.env.STAGE ?? "dev",
  region: process.env.AWS_REGION ?? "local"
} as const;
