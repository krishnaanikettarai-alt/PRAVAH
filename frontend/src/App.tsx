import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  AlertTriangle, ArrowUpRight, BarChart3, Camera, CheckCircle2, ChevronDown,
  CloudRain, Droplets, Image, Info, LocateFixed, Menu, Navigation, Plus, RefreshCw,
  Send, ShieldCheck, Thermometer, Upload, Users, Waves, X,
} from 'lucide-react';
import { RiskMap } from './components/map/RiskMap';
import { WeatherAtmosphere } from './components/layout/WeatherAtmosphere';
import { PravahLogo } from './components/layout/PravahLogo';
import {
  createCitizenReport,
  requestCitizenReports,
  requestWeatherRisk,
  WeatherRiskApiError,
  type CitizenReportRecord,
  type ReportSeverity,
  type WeatherRiskResponse,
} from './services/api';
import {
  aiImageAnalysis, riskFactors,
} from './data/mockData';
import type { RiskLevel } from './types/domain';

const LOCATION = 'Bhubaneswar, Odisha';
const ASSESSMENT_COORDINATES = { latitude: 20.2961, longitude: 85.8245 };
const levelStyle: Record<RiskLevel, string> = {
  LOW: 'text-[#58c98b] bg-[#58c98b]/10 border-[#58c98b]/25',
  MODERATE: 'text-[#eec04a] bg-[#eec04a]/10 border-[#eec04a]/25',
  HIGH: 'text-[#ef603e] bg-[#ef603e]/10 border-[#ef603e]/25',
  CRITICAL: 'text-[#f0445f] bg-[#f0445f]/10 border-[#f0445f]/25',
};

function Badge({ level }: { level: RiskLevel }) {
  return <span className={`risk-badge inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold tracking-[.14em] ${levelStyle[level]}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{level}</span>;
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-[#21403A] bg-[#112321]/95 ${className}`}>{children}</section>;
}

function SectionTitle({ eyebrow, title, icon: Icon }: { eyebrow: string; title: string; icon: typeof BarChart3 }) {
  return <div className="mb-5 flex items-center gap-3"><div className="rounded-lg border border-[#21403A] bg-[#142A26] p-2 text-[#48C7D4]"><Icon size={16} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#68827B]">{eyebrow}</p><h2 className="font-display text-base font-semibold text-[#F1F7F4]">{title}</h2></div></div>;
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatNumber(value: number, maximumFractionDigits = 1) {
  return value.toLocaleString(undefined, { maximumFractionDigits });
}

const factorKeyByName: Record<string, keyof WeatherRiskResponse['risk']['factors']> = {
  'Recent rainfall': 'rainfall',
  'Rainfall intensity / trend': 'rainfallTrend',
  'Citizen reports': 'citizenReports',
  'Reported water depth': 'waterDepth',
  'Historical / geographical vulnerability': 'vulnerability',
};

function errorMessage(error: unknown) {
  if (!(error instanceof WeatherRiskApiError)) return 'Unable to load the live assessment.';
  if (error.status === 422) return error.body?.reason === 'WATER_DEPTH_UNAVAILABLE'
    ? 'Live reports are available, but none include usable water-depth evidence.'
    : 'No eligible live citizen reports were found for this location.';
  if (error.status === 502) return 'A weather or citizen-report provider is unavailable.';
  if (error.status === 504) return 'The weather provider timed out. Please retry.';
  if (error.status === 0) return error.message;
  return 'The live assessment could not be loaded. Please retry.';
}

function App() {
  const [reportOpen, setReportOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [assessment, setAssessment] = useState<WeatherRiskResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reports, setReports] = useState<CitizenReportRecord[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<unknown>(null);
  const [reportSeverity, setReportSeverity] = useState<ReportSeverity | ''>('');
  const [reportWaterDepth, setReportWaterDepth] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSubmitError, setReportSubmitError] = useState<string | null>(null);
  const [reportSubmitSuccess, setReportSubmitSuccess] = useState<CitizenReportRecord | null>(null);
  const [assessmentRefreshError, setAssessmentRefreshError] = useState<string | null>(null);

  const loadAssessment = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      setAssessment(await requestWeatherRisk());
    } catch (requestError) {
      setError(requestError);
    } finally {
      setLoading(false);
    }
  }, [loading]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    requestWeatherRisk()
      .then((result) => { if (active) setAssessment(result); })
      .catch((requestError) => { if (active) setError(requestError); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const loadReports = useCallback(async () => {
    setReportsLoading(true);
    setReportsError(null);
    try {
      const result = await requestCitizenReports();
      setReports(result.reports);
    } catch (requestError) {
      setReportsError(requestError);
    } finally {
      setReportsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const risk = assessment?.risk;
  const weather = assessment?.weather;
  const reportSummary = assessment?.citizenReports;
  const mapLocation = assessment?.location ?? ASSESSMENT_COORDINATES;
  const liveLevel = risk?.band ?? 'MODERATE';
  const liveAction = risk?.recommendedAction ?? 'Loading live recommendation…';
  const liveDepth = reportSummary?.waterDepthScore;
  const liveError = error ? errorMessage(error) : null;

  const formatReportTimestamp = (value: string) => formatTimestamp(value);

  const handleReportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setReportSubmitError(null);
    setReportSubmitSuccess(null);

    if (!reportSeverity) {
      setReportSubmitError('Select a severity before submitting the report.');
      return;
    }

    let waterDepthCm: number | undefined;
    if (reportWaterDepth.trim() !== '') {
      waterDepthCm = Number(reportWaterDepth);
      if (!Number.isFinite(waterDepthCm) || waterDepthCm < 0) {
        setReportSubmitError('Water depth must be a finite number greater than or equal to 0.');
        return;
      }
    }

    setReportSubmitting(true);
    try {
      const createdReport = await createCitizenReport({
        ...ASSESSMENT_COORDINATES,
        timestamp: new Date().toISOString(),
        severity: reportSeverity,
        ...(waterDepthCm !== undefined ? { waterDepthCm } : {}),
        ...(reportDescription.trim() !== '' ? { description: reportDescription } : {}),
      });
      setReportSubmitSuccess(createdReport);
      setReportSeverity('');
      setReportWaterDepth('');
      setReportDescription('');
      await loadReports();
      setAssessmentRefreshError(null);
      try {
        setAssessment(await requestWeatherRisk());
      } catch (requestError) {
        setAssessmentRefreshError(errorMessage(requestError));
      }
    } catch (requestError) {
      setReportSubmitError(errorMessage(requestError));
    } finally {
      setReportSubmitting(false);
    }
  };

  return (
    <div className="app-shell relative min-h-screen bg-[#f4f7f6] text-[#172321]">
      <WeatherAtmosphere state="CLEAR" />
      <header className="relative z-10 border-b border-[#1b322b] bg-[#081410]/90">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-8">
          <div className="flex items-center gap-3"><PravahLogo size={40} /><div><p className="font-display text-lg font-bold tracking-tight text-white">PRAVAH</p><p className="hidden text-[10px] tracking-wide text-[#75958a] sm:block">See the flow. Predict the risk.</p></div></div>
          <div className="header-actions hidden items-center justify-end gap-2 md:flex lg:gap-3"><button disabled title="The prototype currently assesses Bhubaneswar only" className="flex max-w-[230px] cursor-not-allowed items-center gap-2 truncate rounded-lg border border-[#29453d] bg-[#10231d] px-3 py-2 text-xs text-[#bfd5cc] opacity-90"><LocateFixed size={14} className="shrink-0 text-[#48c7d4]" /> <span className="truncate">Selected location: {LOCATION}</span> <ChevronDown size={13} className="shrink-0" /></button><div className="hidden items-center gap-2 text-[10px] tracking-wide text-[#91aaa3] lg:flex"><span className="live-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#48c7d4]" /><span><strong className="font-bold tracking-[.14em] text-[#7de2b0]">FORECAST RAINFALL</strong><br />{weather ? `${formatNumber(weather.rainfallTotalMm)} mm` : '—'}</span></div><button onClick={loadAssessment} disabled={loading} className="flex shrink-0 items-center gap-2 rounded-lg border border-[#29453d] px-3 py-2 text-xs text-[#89a49a] disabled:opacity-50"><RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh</button><button onClick={() => setReportOpen(true)} className="flex shrink-0 items-center gap-2 rounded-lg bg-[#7de2b0] px-3 py-2 text-xs font-bold text-[#092017] transition hover:bg-[#b0f3c9]"><Plus size={14} /> Report flooding</button></div>
          <button className="rounded-lg border border-[#29453d] p-2 md:hidden" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
        {menuOpen && <div className="flex flex-col gap-3 border-t border-[#1b322b] px-4 py-4 md:hidden"><button disabled title="The prototype currently assesses Bhubaneswar only" className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-[#29453d] bg-[#10231d] px-3 py-2 text-left text-xs opacity-90"><LocateFixed size={14} /> Selected location: {LOCATION}</button><p className="text-[10px] text-[#91aaa3]">Location selection is fixed for this prototype.</p><button onClick={loadAssessment} disabled={loading} className="rounded-lg border border-[#29453d] px-3 py-2 text-xs text-left">Refresh live assessment</button><button onClick={() => setReportOpen(true)} className="rounded-lg bg-[#8ee5b2] px-3 py-2 text-xs font-bold text-[#092017]">Report flooding</button></div>}
      </header>

      <main className="relative z-10 mx-auto max-w-[1600px] space-y-5 px-4 py-5 sm:px-8 lg:py-7">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#71ad96]">Environmental intelligence / Live workspace</p><h1 className="font-display text-2xl font-semibold tracking-tight text-white">{LOCATION} risk overview</h1><p className="mt-2 flex items-center gap-2 text-xs text-[#91aaa3]"><CloudRain size={14} className="text-[#48c7d4]" /><strong className="live-assessment-label font-medium text-[#c1d7d0]">Live Open-Meteo assessment</strong><span>· {weather ? `${formatNumber(weather.rainfallTotalMm)} mm forecast` : 'Awaiting assessment'}</span></p></div><p className="text-xs text-[#66837a]">{weather ? `Last synchronized ${formatTimestamp(weather.fetchedAt)}` : 'Not synchronized'}</p></div>
        {loading && <Panel className="flex items-center gap-3 p-4 text-sm text-[#a2b8b0]"><RefreshCw size={16} className="animate-spin text-[#48c7d4]" /> Loading live weather and citizen-report assessment…</Panel>}
        {liveError && <Panel className="flex flex-wrap items-center justify-between gap-3 border-[#ef603e]/30 p-4 text-sm text-[#d24b22]"><span>{liveError}</span><button onClick={loadAssessment} disabled={loading} className="rounded-lg border border-current px-3 py-2 text-xs font-semibold disabled:opacity-50">Retry</button></Panel>}
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(330px,.7fr)]">
          <div className="relative"><div className="relative"><RiskMap latitude={mapLocation.latitude} longitude={mapLocation.longitude} locationLabel={LOCATION} riskScore={risk?.score} riskBand={risk?.band} /></div><Panel className="map-risk-summary absolute bottom-14 right-5 hidden w-[292px] p-4 shadow-2xl shadow-black/40 sm:block"><div className="mb-3 flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#91aaa3]">Selected location risk</p><p className="mt-1 text-sm text-[#d0e0da]">{LOCATION}</p></div><Badge level={liveLevel} /></div><div className="flex items-end gap-2"><strong className="font-display text-6xl leading-none text-white">{risk?.score ?? '—'}</strong><span className="mb-1 text-xs text-[#91aaa1]">/ 100</span></div><p className="mt-3 text-xs leading-relaxed text-[#a2b8b0]">{risk?.recommendedAction ?? 'Live recommendation will appear after the assessment loads.'}</p><div className="mt-3 flex items-center justify-between border-t border-[#244039] pt-3 text-[10px] text-[#91aaa3]"><span>Required inputs</span><strong className="text-[#7de2b0]">{assessment?.dataQuality.status ?? 'LOADING'}</strong></div></Panel></div>
          <div className="space-y-5"><Panel className="p-5 sm:hidden"><div className="mb-3 flex items-start justify-between"><div><p className="text-[10px] uppercase tracking-[.16em] text-[#75958a]">Selected location risk</p><p className="mt-1 text-sm text-[#bad0c7]">{LOCATION}</p></div><Badge level={liveLevel} /></div><div className="flex items-end gap-2"><strong className="font-display text-5xl text-white">{risk?.score ?? '—'}</strong><span className="text-xs text-[#6d8a80]">/ 100</span></div><p className="mt-3 text-xs leading-relaxed text-[#91aaa1]">{liveAction}</p></Panel><Panel className="border-[#8ee5b2]/20 bg-[#10261e] p-5"><div className="flex gap-3"><div className="mt-0.5 rounded-lg bg-[#8ee5b2]/10 p-2 text-[#8ee5b2]"><Navigation size={17} /></div><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#71ad96]">Recommended action</p><h2 className="mt-1 font-display text-lg font-semibold text-white">Live guidance</h2><p className="mt-2 text-sm leading-relaxed text-[#b3cac0]">{liveAction}</p><p className="mt-3 text-[10px] text-[#719187]">From the current backend risk assessment</p></div></div></Panel><Panel className="p-5"><SectionTitle eyebrow="Near-term outlook" title="Prediction estimate" icon={BarChart3} /><div className="rounded-lg border border-[#eec04a]/25 bg-[#eec04a]/10 p-3 text-xs text-[#a56d00]"><Info size={14} className="mr-2 inline" /> Demonstration content — the API does not provide a future prediction or confidence value.</div><p className="mt-4 text-xs leading-relaxed text-[#66867b]">The live assessment reports current risk only. Forecast horizon: {weather?.horizonHours ?? '—'} hours.</p></Panel></div>
        </div>

        <Panel className="p-5"><SectionTitle eyebrow="Observed conditions" title="Environmental conditions" icon={Waves} /><div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[{label:'Rainfall total',value:weather ? `${formatNumber(weather.rainfallTotalMm)} mm` : '—',sub:'Next forecast horizon',icon:CloudRain,color:'text-[#65b9e3]'},{label:'Rainfall trend score',value:weather ? `${weather.rainfallTrendScore}/100` : '—',sub:'Backend score',icon:BarChart3,color:'text-[#ef603e]'},{label:'Temperature',value:'Unavailable',sub:'Not supplied by API',icon:Thermometer,color:'text-[#eec04a]'},{label:'Humidity',value:'Unavailable',sub:'Not supplied by API',icon:Droplets,color:'text-[#65b9e3]'},{label:'Water depth score',value:liveDepth !== undefined ? `${liveDepth}/100` : 'Unavailable',sub:reportSummary ? 'Report evidence' : 'Awaiting assessment',icon:Waves,color:'text-[#65b9e3]'},{label:'Citizen reports',value:reportSummary ? reportSummary.eligibleReportCount.toString() : '—',sub:reportSummary ? `${reportSummary.status} · ${reportSummary.eligibleWaterDepthReportCount} with depth` : 'Awaiting assessment',icon:Users,color:'text-[#8ee5b2]'}].map(({label,value,sub,icon:Icon,color})=><div key={label} className="rounded-xl border border-[#203a32] bg-[#10221d] p-3"><Icon size={16} className={`mb-4 ${color}`} /><p className="text-[10px] text-[#719187]">{label}</p><p className="mt-1 font-display text-lg font-semibold text-[#e0ece7]">{value}</p><p className="mt-1 text-[10px] text-[#58766c]">{sub}</p></div>)}</div></Panel>

        <div className="grid gap-5 lg:grid-cols-2"><Panel className="p-5"><SectionTitle eyebrow="Explainable assessment" title="What is driving risk?" icon={AlertTriangle} /><div className="mb-4 rounded-lg border border-[#29453d] bg-[#10221d] p-3 text-xs text-[#9bb4aa]"><Info size={14} className="mr-2 inline text-[#eec04a]" /> Values are normalized factor scores from 0–100, not probabilities. Prototype assumptions are not scientifically validated.</div>{riskFactors.map((factor)=><div key={factor.name} className="mb-4 last:mb-0">{(() => { const value = risk?.factors[factorKeyByName[factor.name]] ?? 0; return <><div className="mb-1.5 flex justify-between text-xs"><span className="text-[#c0d4cb]">{factor.name}</span><strong className="text-[#8ee5b2]">{value}/100</strong></div><div className="h-1.5 rounded-full bg-[#19342b]"><div className="h-full rounded-full bg-[#73c9a0]" style={{ width: `${value}%` }} /></div><p className="mt-1 text-[10px] text-[#5f7e73]">{factor.description}</p></>; })()}</div>)}</Panel><Panel className="p-5"><SectionTitle eyebrow="Risk context" title="Assessment provenance" icon={ShieldCheck} /><ul className="space-y-4 text-sm text-[#afc6bc]"><li className="flex gap-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#73c9a0]" />Risk score and recommendation are live backend values.</li><li className="flex gap-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#73c9a0]" />Citizen reports are derived from nearby, recent report evidence.</li><li className="flex gap-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#73c9a0]" />Forecast source: {weather?.source ?? '—'} · Horizon: {weather?.horizonHours ?? '—'} hours.</li></ul><p className="mt-5 border-t border-[#203a32] pt-4 text-[10px] leading-relaxed text-[#66867b]">Required inputs available = the prototype can calculate a score; it is not independent validation or a forecast guarantee. Risk thresholds and weights remain prototype assumptions.</p></Panel></div>

        <div className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]"><Panel className="p-5"><SectionTitle eyebrow="Community observations" title="Citizen reports" icon={Users} /><p className="mb-3 text-[10px] text-[#eec04a]">Citizen-submitted reports are shown as returned by the backend and are not independently verified.</p>{reportsLoading && <p className="text-xs text-[#66867b]">Loading citizen reports…</p>}{reportsError !== null && <div className="flex items-center justify-between gap-3 rounded-lg border border-[#ef603e]/30 bg-[#fff7f4] p-3 text-xs text-[#a83b20]"><span>Unable to load citizen reports.</span><button onClick={loadReports} disabled={reportsLoading} className="rounded-lg border border-current px-3 py-1.5 font-semibold">Retry</button></div>}{!reportsLoading && reportsError === null && reports.length === 0 && <p className="rounded-lg border border-dashed border-[#d6e2e0] p-4 text-xs text-[#526762]">No citizen reports have been submitted yet.</p>}{!reportsLoading && reportsError === null && <div className="space-y-2">{reports.map(report=><div key={report.reportId} className="rounded-xl border border-[#203a32] bg-[#10221d] p-3"><div className="flex flex-wrap items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#18382d] text-[#8ee5b2]"><Waves size={15} /></div><div className="min-w-[150px] flex-1"><p className="text-sm font-semibold text-[#d4e3dd]">{report.severity}</p><p className="text-[10px] text-[#658279]">{formatReportTimestamp(report.timestamp)} · {report.source}</p></div><Badge level={report.severity} />{report.waterDepthCm !== undefined && <span className="text-[10px] text-[#78958a]">{formatNumber(report.waterDepthCm)} cm</span>}</div>{report.description && <p className="mt-2 text-xs text-[#9bb4aa]">{report.description}</p>}</div>)}</div>}</Panel><Panel className="p-5"><SectionTitle eyebrow="Supporting evidence" title="AI image analysis" icon={Camera} /><p className="mb-3 text-[10px] text-[#eec04a]">Demonstration data — not connected to a live analysis service.</p><div className="flex gap-3"><div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-xl border border-dashed border-[#41665a] bg-[#102a21] text-[#668f7e]"><Camera size={23} /></div><div><p className="text-xs font-semibold text-[#c4d8ce]">{aiImageAnalysis.submittedImageLabel}</p>{aiImageAnalysis.observations.map(observation=><p key={observation} className="mt-1 text-[10px] text-[#87a59a]">• {observation}</p>)}</div></div><div className="mt-4 flex items-center justify-between border-t border-[#203a32] pt-3"><div><p className="text-[10px] uppercase tracking-wider text-[#66867b]">Estimated severity</p><Badge level={aiImageAnalysis.estimatedSeverity} /></div><div className="text-right"><p className="text-[10px] uppercase tracking-wider text-[#66867b]">Demo value</p><p className="font-display text-lg font-bold text-white">{aiImageAnalysis.confidence.toFixed(2)}</p></div></div><p className="mt-3 text-[10px] text-[#eec04a]">AI-assisted demonstration evidence, not ground truth or a live confidence score.</p></Panel></div>
      </main>

      {reportOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-labelledby="report-title"><form onSubmit={handleReportSubmit} className="w-full max-w-md rounded-2xl border border-[#315448] bg-[#0d1b18] p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#71ad96]">Live citizen report</p><h2 id="report-title" className="font-display text-xl font-semibold text-white">Report flooding</h2></div><button type="button" onClick={() => setReportOpen(false)} aria-label="Close report form"><X size={18} /></button></div><p className="mb-4 rounded-lg border border-[#29453d] bg-[#10221d] p-3 text-xs text-[#b3cac0]">This report uses the selected assessment location: <strong>{LOCATION}</strong> ({ASSESSMENT_COORDINATES.latitude}, {ASSESSMENT_COORDINATES.longitude}). It does not use device GPS.</p><div className="space-y-3"><label className="block text-xs text-[#c0d4cb]">Severity<select required value={reportSeverity} onChange={(event) => setReportSeverity(event.target.value as ReportSeverity)} className="mt-1 w-full rounded-lg border border-[#29453d] bg-[#10221d] px-3 py-2 text-sm text-white outline-none focus:border-[#8ee5b2]"><option value="">Select severity</option><option value="LOW">Low</option><option value="MODERATE">Moderate</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label><label className="block text-xs text-[#c0d4cb]">Water depth (optional)<input type="number" min="0" step="any" value={reportWaterDepth} onChange={(event) => setReportWaterDepth(event.target.value)} className="mt-1 w-full rounded-lg border border-[#29453d] bg-[#10221d] px-3 py-2 text-sm text-white outline-none focus:border-[#8ee5b2]" placeholder="Centimetres" /></label><label className="block text-xs text-[#c0d4cb]">Description (optional)<textarea value={reportDescription} onChange={(event) => setReportDescription(event.target.value)} className="mt-1 h-20 w-full resize-none rounded-lg border border-[#29453d] bg-[#10221d] px-3 py-2 text-sm text-white outline-none focus:border-[#8ee5b2]" placeholder="What are you observing?" /></label><div className="flex items-center gap-2 rounded-lg border border-dashed border-[#41665a] py-3 px-3 text-xs text-[#91aaa1]"><Upload size={15} /> Image upload is not available yet.</div></div>{reportSubmitError && <p role="alert" className="mt-4 rounded-lg border border-[#ef603e]/30 bg-[#321c18] p-3 text-xs text-[#ffb09a]">{reportSubmitError}</p>}{reportSubmitSuccess && <p role="status" className="mt-4 rounded-lg border border-[#7de2b0]/30 bg-[#163328] p-3 text-xs text-[#b0f3c9]">Report submitted successfully. ID: {reportSubmitSuccess.reportId}</p>}{assessmentRefreshError && <p role="status" className="mt-4 rounded-lg border border-[#eec04a]/30 bg-[#332b18] p-3 text-xs text-[#ffe3a0]">Report saved. The risk assessment could not be refreshed: {assessmentRefreshError}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setReportOpen(false)} className="rounded-lg px-3 py-2 text-xs text-[#b3cac0]">Close</button><button type="submit" disabled={reportSubmitting} className="flex items-center gap-2 rounded-lg bg-[#8ee5b2] px-4 py-2 text-xs font-bold text-[#092017] disabled:cursor-not-allowed disabled:opacity-60">{reportSubmitting ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />} {reportSubmitting ? 'Submitting…' : 'Submit report'}</button></div></form></div>}
    </div>
  );
}

export default App;
