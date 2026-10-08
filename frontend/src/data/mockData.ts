import type {
  AIImageAnalysis,
  CitizenReport,
  EnvironmentalConditions,
  LocationRisk,
  Recommendation,
  RiskFactor,
  RiskPrediction,
  RiskSummary,
  WeatherState,
} from '../types/domain';
import { weatherThemes } from './weatherTheme';

export const demoLocation = 'Cuttack, Odisha';
export const weatherState: WeatherState = 'HEAVY_RAIN';
export const weatherTheme = {
  state: weatherState,
  ...weatherThemes[weatherState],
  backgroundClass: weatherThemes[weatherState].className,
  atmosphericColor: weatherThemes[weatherState].accent,
  precipitation: weatherThemes[weatherState].rainCount,
};

export const riskSummary: RiskSummary = {
  location: demoLocation,
  score: 72,
  category: 'HIGH',
  trend: 'Increasing',
  prediction: 'CRITICAL',
  explanation: 'Risk is increasing due to recent rainfall intensity and multiple reports of rising water levels.',
  observedAt: 'Updated 4 minutes ago',
};

export const environmentalConditions: EnvironmentalConditions = {
  rainfall: 68,
  rainfallUnit: 'mm',
  rainfallTrend: 'Increasing',
  temperature: 27,
  humidity: 91,
  waterDepth: 32,
  citizenReports: 11,
};

export const riskFactors: RiskFactor[] = [
  { name: 'Recent rainfall', weight: 25, description: 'Accumulated rainfall in the recent observation window' },
  { name: 'Rainfall intensity / trend', weight: 20, description: 'Direction and intensity of incoming rainfall' },
  { name: 'Citizen reports', weight: 25, description: 'Recent community observations from the area' },
  { name: 'Reported water depth', weight: 20, description: 'Observed standing water depth in reports' },
  { name: 'Historical / geographical vulnerability', weight: 10, description: 'Known local drainage and terrain context' },
];

export const riskPrediction: RiskPrediction = {
  current: 'HIGH',
  potential: 'CRITICAL',
  trend: 'Increasing',
  confidence: 'Moderate',
  explanation: 'Recent rainfall intensity and incoming observations suggest that risk may increase if current conditions continue.',
};

export const citizenReports: CitizenReport[] = [
  { id: 'report-1', location: 'Badambadi', timestamp: '12 min ago', severity: 'HIGH', waterDepth: 28, status: 'Verified', hasImage: true },
  { id: 'report-2', location: 'Link Road', timestamp: '24 min ago', severity: 'MODERATE', waterDepth: 14, status: 'Reviewing', hasImage: false },
  { id: 'report-3', location: 'College Square', timestamp: '38 min ago', severity: 'HIGH', waterDepth: 21, status: 'New', hasImage: true },
];

export const aiImageAnalysis: AIImageAnalysis = {
  submittedImageLabel: 'Community upload • Badambadi',
  observations: ['Standing water detected', 'Road visibility: Partially obscured', 'Affected vehicles: Possible'],
  estimatedSeverity: 'HIGH',
  confidence: 0.84,
};

export const recommendation: Recommendation = {
  title: 'Avoid low-lying roads',
  message: 'High waterlogging risk detected. Avoid low-lying roads and consider an alternate route.',
  basis: 'Based on current available observations',
};

export const locationRisks: LocationRisk[] = [
  { id: 'badambadi', label: 'Badambadi', level: 'CRITICAL', x: 70, y: 30, radius: 14 },
  { id: 'link-road', label: 'Link Road', level: 'HIGH', x: 35, y: 54, radius: 17 },
  { id: 'college-square', label: 'College Square', level: 'MODERATE', x: 53, y: 70, radius: 13 },
  { id: 'river-road', label: 'River Road', level: 'LOW', x: 22, y: 28, radius: 11 },
];
