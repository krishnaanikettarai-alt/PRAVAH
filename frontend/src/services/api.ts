const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3000';

export type ApiRiskBand = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface WeatherRiskResponse {
  location: { latitude: number; longitude: number };
  weather: {
    source: 'OPEN_METEO';
    timezone: string;
    fetchedAt: string;
    horizonHours: number;
    rainfallTotalMm: number;
    rainfallScore: number;
    rainfallTrendScore: number;
  };
  risk: {
    score: number;
    band: ApiRiskBand;
    recommendedAction: string;
    factors: {
      rainfall: number;
      rainfallTrend: number;
      citizenReports: number;
      waterDepth: number;
      vulnerability: number;
    };
  };
  dataQuality: {
    status: 'COMPLETE';
    forecastHours: number;
    requiredForecastHours: number;
    citizenReports?: 'AVAILABLE';
    waterDepth?: 'AVAILABLE';
  };
  citizenReports: {
    status: 'AVAILABLE';
    severityScore: number;
    waterDepthScore: number;
    eligibleReportCount: number;
    excludedReportCount: number;
    eligibleWaterDepthReportCount: number;
    radiusKm: number;
    observationWindowHours: number;
    evaluationTime: string;
  };
  metadata: {
    forecastSource: 'OPEN_METEO';
    limitations: string[];
  };
}

export interface ApiErrorBody {
  error?: string;
  message?: string;
  reason?: string;
}

export type ReportSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface CitizenReportRecord {
  reportId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  waterDepthCm?: number;
  severity: ReportSeverity;
  description?: string;
  source: 'CITIZEN';
  imageKey?: string;
  createdAt: string;
}

export interface CreateCitizenReportInput {
  latitude: number;
  longitude: number;
  timestamp: string;
  severity: ReportSeverity;
  waterDepthCm?: number;
  description?: string;
  imageKey?: string;
}

export interface CitizenReportsResponse {
  reports: CitizenReportRecord[];
}

export class WeatherRiskApiError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
    public readonly body?: ApiErrorBody,
  ) {
    super(message);
    this.name = 'WeatherRiskApiError';
  }
}

export const api = {
  baseUrl: API_BASE_URL,
  health: '/health',
  risk: '/risk',
  reports: '/reports',
  weatherRisk: '/risk/weather',
};

export const requestWeatherRisk = async (): Promise<WeatherRiskResponse> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${api.weatherRisk}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: 20.2961,
        longitude: 85.8245,
        vulnerabilityScore: 50,
        useCitizenReports: true,
      }),
    });
  } catch {
    throw new WeatherRiskApiError(0, 'Unable to connect to the local PRAVAH backend.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WeatherRiskApiError(response.status, 'The backend returned an invalid response.');
  }

  if (!response.ok) {
    const errorBody = typeof body === 'object' && body !== null ? body as ApiErrorBody : undefined;
    throw new WeatherRiskApiError(
      response.status,
      errorBody?.message ?? errorBody?.error ?? 'The weather-risk request failed.',
      errorBody,
    );
  }

  return body as WeatherRiskResponse;
};

const parseApiError = (status: number, body: unknown): WeatherRiskApiError => {
  const errorBody = typeof body === 'object' && body !== null ? body as ApiErrorBody : undefined;
  return new WeatherRiskApiError(
    status,
    errorBody?.message ?? errorBody?.error ?? 'The reports request failed.',
    errorBody,
  );
};

export const createCitizenReport = async (
  input: CreateCitizenReportInput,
): Promise<CitizenReportRecord> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${api.reports}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    throw new WeatherRiskApiError(0, 'Unable to connect to the local PRAVAH backend.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WeatherRiskApiError(response.status, 'The backend returned an invalid response.');
  }

  if (!response.ok) {
    throw parseApiError(response.status, body);
  }

  return body as CitizenReportRecord;
};

export const requestCitizenReports = async (): Promise<CitizenReportsResponse> => {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${api.reports}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    throw new WeatherRiskApiError(0, 'Unable to connect to the local PRAVAH backend.');
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new WeatherRiskApiError(response.status, 'The backend returned an invalid response.');
  }

  if (!response.ok) {
    throw parseApiError(response.status, body);
  }

  return body as CitizenReportsResponse;
};
