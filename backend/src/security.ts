import type { APIGatewayProxyEvent } from "aws-lambda";

export const allowedOrigin =
  process.env.CORS_ALLOWED_ORIGIN ?? "http://localhost:5173";

export const corsHeaders = (
  event: Pick<APIGatewayProxyEvent, "headers">,
  methods: string
): Record<string, string> => {
  const requestOrigin = event.headers?.origin ?? event.headers?.Origin;
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": methods,
    Vary: "Origin"
  };

  if (!requestOrigin || requestOrigin === allowedOrigin) {
    headers["Access-Control-Allow-Origin"] = allowedOrigin;
  }

  return headers;
};

export const MAX_JSON_BODY_BYTES = 32 * 1024;

export const isBodyWithinLimit = (body: string): boolean =>
  Buffer.byteLength(body, "utf8") <= MAX_JSON_BODY_BYTES;
