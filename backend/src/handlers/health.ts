import type { APIGatewayProxyResult } from "aws-lambda";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,OPTIONS"
};

export const handler = async (): Promise<APIGatewayProxyResult> => ({
  statusCode: 200,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    status: "ok",
    service: "pravah-api",
    version: "0.1.0"
  })
});
