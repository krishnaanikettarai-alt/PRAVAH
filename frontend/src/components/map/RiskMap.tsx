import { MapPin } from 'lucide-react';
import type { LocationRisk } from '../../types/domain';

const riskColors = {
  LOW: '#42D487',
  MODERATE: '#F2C14E',
  HIGH: '#FF7A45',
  CRITICAL: '#FF4D6D',
};

interface RiskMapProps {
  locations: LocationRisk[];
}

export function RiskMap({ locations }: RiskMapProps) {
  return (
    <section className="risk-map relative min-h-[480px] overflow-hidden rounded-xl border border-[#21403A] bg-[#0B1A1D] shadow-2xl shadow-black/30 lg:min-h-[620px]" aria-label="Placeholder risk map">
      <div className="map-lines absolute inset-0 opacity-80" />
      <div className="absolute inset-0 opacity-30" style={{ background: 'linear-gradient(125deg, transparent 20%, #42665a 20.2%, transparent 20.6%, transparent 60%, #42665a 60.2%, transparent 60.5%), linear-gradient(30deg, transparent 45%, #42665a 45.2%, transparent 45.6%)' }} />
      <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full border border-[#36584e] bg-[#10261f]/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[.16em] text-[#91b0a5]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#58c98b]" /> Demonstration map · not live
      </div>
      <div className="absolute right-5 top-5 z-10 rounded-lg border border-[#29453d] bg-[#10261f]/85 px-3 py-2 text-right text-[10px] text-[#719188]">
        <p className="font-semibold uppercase tracking-[.15em] text-[#a9c5ba]">Cuttack sector</p>
        <p>20.46° N · 85.88° E</p>
      </div>
      {locations.map((location) => (
        <div key={location.id} className="absolute z-10" style={{ left: `${location.x}%`, top: `${location.y}%` }}>
          <div className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full opacity-45 blur-[1px]" style={{ width: `${location.radius * 7}px`, height: `${location.radius * 7}px`, background: riskColors[location.level], boxShadow: `0 0 28px ${riskColors[location.level]}` }} />
          <div className={`risk-pulse relative flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#08110f]`} style={{ backgroundColor: riskColors[location.level] }}>
            <MapPin size={13} strokeWidth={3} className="text-[#08110f]" />
          </div>
          <span className="absolute left-4 top-[-9px] whitespace-nowrap rounded bg-[#08110f]/80 px-2 py-1 text-[10px] font-semibold text-[#c3d8d0]">{location.label}</span>
        </div>
      ))}
      <div className="absolute bottom-5 left-5 z-10 flex flex-wrap gap-3 rounded-xl border border-[#29453d] bg-[#0d211b]/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#9ab6ab]">
        {Object.entries(riskColors).map(([level, color]) => <span key={level} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: color }} />{level}</span>)}
      </div>
      <span className="absolute bottom-5 right-5 z-10 text-[10px] text-[#5e7c72]">Map layers prepared for future provider integration</span>
    </section>
  );
}
