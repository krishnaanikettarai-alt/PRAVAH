import type { RiskBand, RiskInput, RiskResult } from "../models/risk.js";

const WEIGHTS = {
  rainfall: 0.25,
  rainfallTrend: 0.2,
  citizenReports: 0.25,
  waterDepth: 0.2,
  vulnerability: 0.1
} as const;

const ACTIONS: Record<RiskBand, string> = {
  LOW: "Monitor local conditions and remain alert for changes.",
  MODERATE: "Monitor rainfall and local reports. Avoid unnecessary travel through waterlogged areas.",
  HIGH: "Avoid waterlogged routes and monitor local conditions closely. Consider delaying non-essential travel.",
  CRITICAL: "Avoid affected areas and waterlogged routes. Follow local emergency guidance and move to a safer location if necessary."
};

const SCORE_FIELDS: Array<keyof RiskInput> = [
  "rainfallScore",
  "rainfallTrendScore",
  "citizenReportsScore",
  "waterDepthScore",
  "vulnerabilityScore"
];

const validateScore = (name: keyof RiskInput, value: number): void => {
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a finite number`);
  }

  if (value < 0 || value > 100) {
    throw new Error(`${name} must be between 0 and 100`);
  }
};

const validateInput = (input: RiskInput): void => {
  SCORE_FIELDS.forEach((name) => {
    validateScore(name, input[name]);
  });
};

const getBand = (score: number): RiskBand => {
  if (score <= 30) {
    return "LOW";
  }
  if (score <= 50) {
    return "MODERATE";
  }
  if (score <= 70) {
    return "HIGH";
  }
  return "CRITICAL";
};

export const calculateRisk = (input: RiskInput): RiskResult => {
  validateInput(input);

  const score = Math.round(
    input.rainfallScore * WEIGHTS.rainfall +
      input.rainfallTrendScore * WEIGHTS.rainfallTrend +
      input.citizenReportsScore * WEIGHTS.citizenReports +
      input.waterDepthScore * WEIGHTS.waterDepth +
      input.vulnerabilityScore * WEIGHTS.vulnerability
  );
  const band = getBand(score);

  return {
    score,
    band,
    factors: {
      rainfall: input.rainfallScore,
      rainfallTrend: input.rainfallTrendScore,
      citizenReports: input.citizenReportsScore,
      waterDepth: input.waterDepthScore,
      vulnerability: input.vulnerabilityScore
    },
    recommendedAction: ACTIONS[band]
  };
};
