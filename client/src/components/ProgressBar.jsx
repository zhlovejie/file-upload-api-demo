function ProgressBar({ progress, status }) {
  const safeProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <>
      <div className="h-2.5 overflow-hidden rounded-full border border-sky-100 bg-sky-100" aria-hidden="true">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400 shadow-[0_0_16px_rgba(14,165,233,0.42)] transition-[width] duration-150"
          style={{ width: `${safeProgress}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{status}</span>
        <span className="tabular-nums">{safeProgress}%</span>
      </div>
    </>
  );
}

export { ProgressBar };
