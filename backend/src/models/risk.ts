export type RiskBand = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

export interface RiskInput {
  rainfallScore: number;
  rainfallTrendScore: number;
  citizenReportsScore: number;
  waterDepthScore: number;
  vulnerabilityScore: number;
}

export interface RiskResult {
  score: number;
  band: RiskBand;
  factors: {
    rainfall: number;
    rainfallTrend: number;
    citizenReports: number;
    waterDepth: number;
    vulnerability: number;
  };
  recommendedAction: string;
}
