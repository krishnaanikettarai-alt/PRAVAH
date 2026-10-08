import { randomUUID } from "node:crypto";
import type { Report, ReportSeverity } from "../models/report.js";
import * as reportRepository from "../repositories/reportRepository.js";

export interface CreateReportInput {
  latitude: unknown;
  longitude: unknown;
  timestamp: unknown;
  waterDepthCm?: unknown;
  severity: unknown;
  description?: unknown;
  imageKey?: unknown;
}

export class ReportValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ReportValidationError";
  }
}

const isSeverity = (value: unknown): value is ReportSeverity =>
  value === "LOW" ||
  value === "MODERATE" ||
  value === "HIGH" ||
  value === "CRITICAL";

const isIsoDateTime = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  !Number.isNaN(Date.parse(value));

const validateNumber = (value: unknown, field: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ReportValidationError(`${field} must be a number`);
  }

  return value;
};

const validateCreateInput = (input: CreateReportInput): Omit<Report, "reportId" | "createdAt" | "source"> => {
  const latitude = validateNumber(input.latitude, "latitude");
  if (latitude < -90 || latitude > 90) {
    throw new ReportValidationError("latitude must be between -90 and 90");
  }

  const longitude = validateNumber(input.longitude, "longitude");
  if (longitude < -180 || longitude > 180) {
    throw new ReportValidationError("longitude must be between -180 and 180");
  }

  if (typeof input.timestamp !== "string" || !isIsoDateTime(input.timestamp)) {
    throw new ReportValidationError("timestamp must be a valid ISO 8601 date/time string");
  }

  if (!isSeverity(input.severity)) {
    throw new ReportValidationError("severity must be LOW, MODERATE, HIGH, or CRITICAL");
  }

  let waterDepthCm: number | undefined;
  if (input.waterDepthCm !== undefined) {
    waterDepthCm = validateNumber(input.waterDepthCm, "waterDepthCm");
    if (waterDepthCm < 0) {
      throw new ReportValidationError("waterDepthCm must be greater than or equal to 0");
    }
  }

  if (input.description !== undefined && typeof input.description !== "string") {
    throw new ReportValidationError("description must be a string");
  }

  if (input.imageKey !== undefined && typeof input.imageKey !== "string") {
    throw new ReportValidationError("imageKey must be a string");
  }

  const description = typeof input.description === "string" ? input.description : undefined;
  const imageKey = typeof input.imageKey === "string" ? input.imageKey : undefined;

  return {
    latitude,
    longitude,
    timestamp: input.timestamp,
    ...(waterDepthCm !== undefined ? { waterDepthCm } : {}),
    severity: input.severity,
    ...(description !== undefined ? { description } : {}),
    ...(imageKey !== undefined ? { imageKey } : {})
  };
};

export const createReport = async (input: CreateReportInput): Promise<Report> => {
  const validatedInput = validateCreateInput(input);
  const report: Report = {
    ...validatedInput,
    reportId: randomUUID(),
    source: "CITIZEN",
    createdAt: new Date().toISOString()
  };

  await reportRepository.createReport(report);
  return report;
};

export const listReports = (): Promise<Report[]> => reportRepository.listReports();
