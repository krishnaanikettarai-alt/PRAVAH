const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export const api = {
  baseUrl: API_BASE_URL,
  health: '/health',
  risk: '/risk',
  reports: '/reports',
};

// The UI currently uses src/data/mockData.ts. These paths define the future API boundary.
