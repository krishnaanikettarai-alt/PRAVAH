import type { CSSProperties } from 'react';
import { weatherTheme } from '../../data/mockData';
import { weatherThemes } from '../../data/weatherTheme';
import type { WeatherState } from '../../types/domain';

interface EnvironmentalAtmosphereProps {
  state: WeatherState;
}

export function EnvironmentalAtmosphere({ state }: EnvironmentalAtmosphereProps) {
  const configuredTheme = weatherThemes[state];
  const theme = state === weatherTheme.state
    ? { className: weatherTheme.backgroundClass, intensity: weatherTheme.precipitation, duration: weatherTheme.animationDuration }
    : { className: configuredTheme.className, intensity: configuredTheme.rainCount, duration: configuredTheme.animationDuration };
  return (
    <div className={`atmosphere-layer pointer-events-none fixed inset-0 z-0 overflow-hidden ${theme.className}`} aria-hidden="true" style={{ '--rain-duration': theme.duration } as CSSProperties}>
      <div className="atmosphere-clouds" />
      <div className="atmosphere-rainfall">
        {Array.from({ length: theme.intensity }, (_, index) => <i key={index} style={{ left: `${(index * 37) % 100}%`, animationDelay: `${(index % 11) * -0.45}s`, height: `${18 + (index % 5) * 7}px` }} />)}
      </div>
      <div className="atmosphere-flow" />
    </div>
  );
}
