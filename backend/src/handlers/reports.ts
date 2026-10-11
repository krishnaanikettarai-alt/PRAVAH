import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  createReport,
  listReports,
  ReportValidationError,
  type CreateReportInput
} from "../services/reportService.js";
import type { Report } from "../models/report.js";
import { corsHeaders, isBodyWithinLimit } from "../security.js";

const response = (
  event: Pick<APIGatewayProxyEvent, "headers">,
  statusCode: number,
  body: unknown
): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    ...corsHeaders(event, "GET,POST,OPTIONS"),
    "Content-Type": "application/json"
  },
  body: JSON.stringify(body)
});

type CreateReport = (input: CreateReportInput) => Promise<Report>;
type ListReports = () => Promise<Report[]>;

export const createHandler = (
  create: CreateReport = createReport,
  list: ListReports = listReports
) => async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (event.httpMethod === "OPTIONS") {
    return response(event, 204, null);
  }

  try {
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return response(event, 400, {
          error: "Invalid request",
          message: "request body is required"
        });
      }
      if (!isBodyWithinLimit(event.body)) {
        return response(event, 400, {
          error: "Invalid request",
          message: "request body exceeds the 32 KB limit"
        });
      }

      let input: CreateReportInput;
      try {
        const parsed: unknown = JSON.parse(event.body);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return response(event, 400, {
            error: "Invalid request",
            message: "request body must be a JSON object"
          });
        }
        input = parsed as CreateReportInput;
      } catch {
        return response(event, 400, {
          error: "Invalid request",
          message: "request body must be valid JSON"
        });
      }

      return response(event, 201, await create(input));
    }

    if (event.httpMethod === "GET") {
      return response(event, 200, { reports: await list() });
    }

    return response(event, 405, { error: "Method not allowed" });
  } catch (error) {
    if (error instanceof ReportValidationError) {
      return response(event, 400, {
        error: "Invalid request",
        message: error.message
      });
    }

    console.error(JSON.stringify({
      event: "reports_request_failed",
      errorName: error instanceof Error ? error.name : "UnknownError"
    }));
    return response(event, 500, { error: "Internal server error" });
  }
};

export const handler = createHandler();
