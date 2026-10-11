import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "../security.js";

export const handler = async (
  event: Pick<APIGatewayProxyEvent, "httpMethod" | "headers">
): Promise<APIGatewayProxyResult> => {
  const headers = {
    ...corsHeaders(event, "GET,OPTIONS"),
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      status: "ok",
      service: "pravah-api",
      version: "0.1.0"
    })
  };
};
