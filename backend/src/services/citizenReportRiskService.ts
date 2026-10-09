import type { Report, ReportSeverity } from "../models/report.js";
import type {
  CitizenReportRiskInput,
  CitizenReportRiskResult
} from "../models/citizenReportRisk.js";

export const CITIZEN_REPORT_RADIUS_KM = 2;
export const CITIZEN_REPORT_WINDOW_HOURS = 6;
export const MAX_WATER_DEPTH_CM = 100;

const EARTH_RADIUS_KM = 6371;
const SEVERITY_SCORES: Record<ReportSeverity, number> = {
  LOW: 25,
  MODERATE: 50,
  HIGH: 75,
  CRITICAL: 100
};
const reportSeverities = new Set<ReportSeverity>(["LOW", "MODERATE", "HIGH", "CRITICAL"]);
const millisecondsPerHour = 60 * 60 * 1000;
const strictTimestampPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:\d{2})$/;

export class CitizenReportRiskInputError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "CitizenReportRiskInputError";
  }
}

const validateCoordinate = (value: number, name: string, minimum: number, maximum: number): void => {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new CitizenReportRiskInputError(`${name} must be a finite number between ${minimum} and ${maximum}`);
  }
};

const parseTimestamp = (value: unknown): number | null => {
  if (typeof value !== "string") {
    return null;
  }

  const match = strictTimestampPattern.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, , timezone] = match;
  if (timezone !== "Z") {
    const offset = timezone.slice(1).split(":").map(Number);
    if (offset[0] > 23 || offset[1] > 59) {
      return null;
    }
  }
  if (timezone === undefined) {
    return null;
  }

  const calendarDate = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second)
  ));
  if (
    calendarDate.getUTCFullYear() !== Number(year) ||
    calendarDate.getUTCMonth() !== Number(month) - 1 ||
    calendarDate.getUTCDate() !== Number(day) ||
    calendarDate.getUTCHours() !== Number(hour) ||
    calendarDate.getUTCMinutes() !== Number(minute) ||
    calendarDate.getUTCSeconds() !== Number(second)
  ) {
    return null;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const distanceKm = (
  latitude: number,
  longitude: number,
  reportLatitude: number,
  reportLongitude: number
): number => {
  const toRadians = (value: number): number => value * Math.PI / 180;
  const latitudeDelta = toRadians(reportLatitude - latitude);
  const longitudeDelta = toRadians(reportLongitude - longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitude)) *
    Math.cos(toRadians(reportLatitude)) *
    Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
};

const isReportSeverity = (value: unknown): value is ReportSeverity =>
  typeof value === "string" && reportSeverities.has(value as ReportSeverity);

const isReportRecord = (value: unknown): value is Report => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const report = value as Partial<Report>;
  return Number.isFinite(report.latitude) &&
    Number.isFinite(report.longitude) &&
    typeof report.timestamp === "string" &&
    isReportSeverity(report.severity);
};

const clamp = (value: number): number => Math.min(100, Math.max(0, value));

export const aggregateCitizenReportRisk = (
  input: CitizenReportRiskInput
): CitizenReportRiskResult => {
  validateCoordinate(input.latitude, "latitude", -90, 90);
  validateCoordinate(input.longitude, "longitude", -180, 180);

  const evaluationTimestamp = parseTimestamp(input.evaluationTime);
  if (evaluationTimestamp === null) {
    throw new CitizenReportRiskInputError("evaluationTime must be a valid date/time string");
  }
  if (!Array.isArray(input.reports)) {
    throw new CitizenReportRiskInputError("reports must be an array");
  }

  const windowMs = CITIZEN_REPORT_WINDOW_HOURS * millisecondsPerHour;
  let eligibleReportCount = 0;
  let excludedReportCount = 0;
  let eligibleWaterDepthReportCount = 0;
  let severityWeightedTotal = 0;
  let severityWeightTotal = 0;
  let waterDepthWeightedTotal = 0;
  let waterDepthWeightTotal = 0;

  for (const candidate of input.reports) {
    if (!isReportRecord(candidate) ||
      candidate.latitude < -90 ||
      candidate.latitude > 90 ||
      candidate.longitude < -180 ||
      candidate.longitude > 180) {
      excludedReportCount += 1;
      continue;
    }

    const reportTimestamp = parseTimestamp(candidate.timestamp);
    if (reportTimestamp === null) {
      excludedReportCount += 1;
      continue;
    }

    const ageMs = evaluationTimestamp - reportTimestamp;
    const distance = distanceKm(input.latitude, input.longitude, candidate.latitude, candidate.longitude);
    if (ageMs < 0 || ageMs > windowMs || distance > CITIZEN_REPORT_RADIUS_KM) {
      excludedReportCount += 1;
      continue;
    }

    const distanceWeight = 1 - distance / CITIZEN_REPORT_RADIUS_KM;
    const recencyWeight = 1 - ageMs / windowMs;
    const weight = distanceWeight * recencyWeight;
    eligibleReportCount += 1;
    severityWeightedTotal += SEVERITY_SCORES[candidate.severity] * weight;
    severityWeightTotal += weight;

    if (candidate.waterDepthCm !== undefined &&
      Number.isFinite(candidate.waterDepthCm) &&
      candidate.waterDepthCm >= 0) {
      const depthScore = clamp(candidate.waterDepthCm / MAX_WATER_DEPTH_CM * 100);
      waterDepthWeightedTotal += depthScore * weight;
      waterDepthWeightTotal += weight;
      eligibleWaterDepthReportCount += 1;
    }
  }

  const hasSeverityData = severityWeightTotal > 0;
  const hasWaterDepthData = waterDepthWeightTotal > 0;
  const status = hasSeverityData || hasWaterDepthData ? "AVAILABLE" : "NO_DATA";
  return {
    severityScore: hasSeverityData ? clamp(severityWeightedTotal / severityWeightTotal) : 0,
    waterDepthScore: hasWaterDepthData
      ? clamp(waterDepthWeightedTotal / waterDepthWeightTotal)
      : null,
    metadata: {
      status,
      eligibleReportCount,
      excludedReportCount,
      eligibleWaterDepthReportCount,
      radiusKm: CITIZEN_REPORT_RADIUS_KM,
      observationWindowHours: CITIZEN_REPORT_WINDOW_HOURS
    }
  };
};
