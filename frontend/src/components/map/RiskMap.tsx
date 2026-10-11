import { useEffect } from 'react';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { RiskLevel } from '../../types/domain';

const DEFAULT_CENTER: LatLngExpression = [20.2961, 85.8245];
const DEFAULT_ZOOM = 12;

const riskColors: Record<RiskLevel, string> = {
  LOW: '#42D487',
  MODERATE: '#F2C14E',
  HIGH: '#FF7A45',
  CRITICAL: '#FF4D6D',
};

interface RiskMapProps {
  latitude: number;
  longitude: number;
  locationLabel: string;
  riskScore?: number;
  riskBand?: RiskLevel;
}

function MapViewSynchronizer({ latitude, longitude }: Pick<RiskMapProps, 'latitude' | 'longitude'>) {
  const map = useMap();

  useEffect(() => {
    map.flyTo([latitude, longitude], map.getZoom(), { duration: 0.8 });
  }, [latitude, longitude, map]);

  return null;
}

function createRiskIcon(color: string) {
  return L.divIcon({
    className: 'risk-map-marker',
    html: `<span style="background:${color};box-shadow:0 0 0 5px ${color}33,0 0 24px ${color}aa"></span>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

export function RiskMap({
  latitude,
  longitude,
  locationLabel,
  riskScore,
  riskBand,
}: RiskMapProps) {
  const center: LatLngExpression = [latitude, longitude];
  const bandColor = riskBand ? riskColors[riskBand] : '#48C7D4';
  const icon = createRiskIcon(bandColor);

  return (
    <section
      className="risk-map relative min-h-[480px] overflow-hidden rounded-xl border border-[#21403A] bg-[#0B1A1D] shadow-2xl shadow-black/30 lg:min-h-[620px]"
      aria-label={`Risk assessment map for ${locationLabel}`}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="risk-map-leaflet absolute inset-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapViewSynchronizer latitude={latitude} longitude={longitude} />
        <Circle
          center={center}
          radius={2000}
          pathOptions={{ color: bandColor, fillColor: bandColor, fillOpacity: 0.12, weight: 1 }}
        />
        <Marker position={center} icon={icon}>
          <Popup>
            <strong>{locationLabel}</strong>
            <br />
            {riskScore !== undefined && riskBand ? `Risk: ${riskScore}/100 · ${riskBand}` : 'Awaiting live risk assessment'}
          </Popup>
        </Marker>
      </MapContainer>

      <div className="pointer-events-none absolute left-5 top-5 z-[400] flex items-center gap-2 rounded-full border border-[#36584e] bg-[#10261f]/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-[#91b0a5]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#58c98b]" /> Selected location
      </div>
      <div className="pointer-events-none absolute right-5 top-5 z-[400] rounded-lg border border-[#29453d] bg-[#10261f]/90 px-3 py-2 text-right text-[10px] text-[#719188]">
        <p className="font-semibold uppercase tracking-[.15em] text-[#a9c5ba]">{locationLabel}</p>
        <p>{latitude.toFixed(4)}° N · {longitude.toFixed(4)}° E</p>
      </div>
      <div className="pointer-events-none absolute bottom-5 left-5 z-[400] flex flex-wrap gap-3 rounded-xl border border-[#29453d] bg-[#0d211b]/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ab6ab]">
        {Object.entries(riskColors).map(([level, color]) => (
          <span key={level} className="flex items-center gap-1.5">
            <i className="h-2 w-2 rounded-full" style={{ background: color }} />
            {level}
          </span>
        ))}
      </div>
      <span className="pointer-events-none absolute bottom-10 right-3 z-[400] text-[10px] text-[#d0e1da]">2 km aggregation radius · OpenStreetMap base layer</span>
    </section>
  );
}
