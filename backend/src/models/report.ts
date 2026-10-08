export type ReportSeverity = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface Report {
  reportId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  waterDepthCm?: number;
  severity: ReportSeverity;
  description?: string;
  source: "CITIZEN";
  imageKey?: string;
  createdAt: string;
}
