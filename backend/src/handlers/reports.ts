import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
  createReport,
  listReports,
  ReportValidationError,
  type CreateReportInput
} from "../services/reportService.js";
import type { Report } from "../models/report.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

const response = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    ...corsHeaders,
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
    return response(204, null);
  }

  try {
    if (event.httpMethod === "POST") {
      if (!event.body) {
        return response(400, {
          error: "Invalid request",
          message: "request body is required"
        });
      }

      let input: CreateReportInput;
      try {
        const parsed: unknown = JSON.parse(event.body);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          return response(400, {
            error: "Invalid request",
            message: "request body must be a JSON object"
          });
        }
        input = parsed as CreateReportInput;
      } catch {
        return response(400, {
          error: "Invalid request",
          message: "request body must be valid JSON"
        });
      }

      return response(201, await create(input));
    }

    if (event.httpMethod === "GET") {
      return response(200, { reports: await list() });
    }

    return response(405, { error: "Method not allowed" });
  } catch (error) {
    if (error instanceof ReportValidationError) {
      return response(400, {
        error: "Invalid request",
        message: error.message
      });
    }

    console.error("Reports request failed", error);
    return response(500, { error: "Internal server error" });
  }
};

export const handler = createHandler();
