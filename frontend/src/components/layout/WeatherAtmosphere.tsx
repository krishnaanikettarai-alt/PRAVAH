import { EnvironmentalAtmosphere } from './EnvironmentalAtmosphere';
import type { WeatherState } from '../../types/domain';

export function WeatherAtmosphere({ state }: { state: WeatherState }) {
  return <EnvironmentalAtmosphere state={state} />;
}
