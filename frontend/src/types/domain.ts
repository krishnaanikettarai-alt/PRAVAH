export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type RiskTrend = 'Increasing' | 'Stable' | 'Decreasing';
export type ReportStatus = 'Verified' | 'Reviewing' | 'New';
export type WeatherState = 'CLEAR' | 'PARTLY_CLOUDY' | 'RAIN' | 'HEAVY_RAIN' | 'STORM' | 'CYCLONE' | 'NIGHT';

export interface RiskSummary {
  location: string;
  score: number;
  category: RiskLevel;
  trend: RiskTrend;
  prediction: RiskLevel;
  explanation: string;
  observedAt: string;
}

export interface EnvironmentalConditions {
  rainfall: number;
  rainfallUnit: string;
  rainfallTrend: RiskTrend;
  temperature: number;
  humidity: number;
  waterDepth: number;
  citizenReports: number;
}

export interface RiskFactor {
  name: string;
  weight: number;
  description: string;
}

export interface CitizenReport {
  id: string;
  location: string;
  timestamp: string;
  severity: RiskLevel;
  waterDepth: number;
  status: ReportStatus;
  hasImage: boolean;
}

export interface AIImageAnalysis {
  submittedImageLabel: string;
  observations: string[];
  estimatedSeverity: RiskLevel;
  confidence: number;
}

export interface RiskPrediction {
  current: RiskLevel;
  potential: RiskLevel;
  trend: RiskTrend;
  confidence: 'Low' | 'Moderate' | 'High';
  explanation: string;
}

export interface Recommendation {
  title: string;
  message: string;
  basis: string;
}

export interface LocationRisk {
  id: string;
  label: string;
  level: RiskLevel;
  x: number;
  y: number;
  radius: number;
}
