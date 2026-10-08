import type { WeatherState } from '../types/domain';

export interface WeatherTheme {
  label: string;
  className: string;
  accent: string;
  rainCount: number;
  animationDuration: string;
}

export const weatherThemes: Record<WeatherState, WeatherTheme> = {
  CLEAR: { label: 'Clear skies', className: 'atmosphere-clear', accent: '#27B8D6', rainCount: 0, animationDuration: '0s' },
  PARTLY_CLOUDY: { label: 'Partly cloudy', className: 'atmosphere-cloudy', accent: '#3D7EFF', rainCount: 0, animationDuration: '0s' },
  RAIN: { label: 'Rain', className: 'atmosphere-rain', accent: '#27B8D6', rainCount: 24, animationDuration: '7s' },
  HEAVY_RAIN: { label: 'Heavy rain', className: 'atmosphere-heavy-rain', accent: '#27B8D6', rainCount: 36, animationDuration: '5.5s' },
  STORM: { label: 'Storm conditions', className: 'atmosphere-storm', accent: '#3D7EFF', rainCount: 28, animationDuration: '6s' },
  CYCLONE: { label: 'Cyclone conditions', className: 'atmosphere-storm', accent: '#3D7EFF', rainCount: 0, animationDuration: '8s' },
  NIGHT: { label: 'Night conditions', className: 'atmosphere-night', accent: '#3D7EFF', rainCount: 0, animationDuration: '0s' },
};
