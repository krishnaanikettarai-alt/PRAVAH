export function PravahLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" role="img" aria-label="PRAVAH logo mark">
      <path d="M12 29V10.5h9.2c5.1 0 8.1 2.4 8.1 6.4 0 4.1-3 6.5-8.1 6.5H16" fill="none" stroke="#7DE2B0" strokeWidth="3" strokeLinecap="round" />
      <path d="M10 30.5c4.8-2.8 10.3-2.8 15.1 0 2.1 1.2 4.2 1.2 6.1.1" fill="none" stroke="#48C7D4" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="10.5" r="2" fill="#7DE2B0" />
    </svg>
  );
}
