import type { Report } from "./report.js";

export interface CitizenReportRiskInput {
  latitude: number;
  longitude: number;
  reports: readonly Report[];
  evaluationTime: string;
}

export type CitizenReportDataStatus = "AVAILABLE" | "NO_DATA";

export interface CitizenReportRiskResult {
  severityScore: number;
  waterDepthScore: number | null;
  metadata: {
    status: CitizenReportDataStatus;
    eligibleReportCount: number;
    excludedReportCount: number;
    eligibleWaterDepthReportCount: number;
    radiusKm: number;
    observationWindowHours: number;
  };
}
