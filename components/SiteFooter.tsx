const repositoryUrl = "https://github.com/Atharav001/precipitation-forecast-comparison";

export default function SiteFooter({ context }: { context: string }) {
  return <footer className="mt-14 flex flex-col gap-4 border-t border-[#d8ddd6] pt-6 text-xs leading-5 text-[#718680] sm:flex-row sm:items-center sm:justify-between">
    <p>{context}</p>
    <div className="flex items-center gap-3 text-[#315c5d]">
      <span>Made by Atharav</span>
      <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" aria-label="PreciCast on GitHub" title="View PreciCast on GitHub" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#c7d3d1] transition hover:bg-[#e9f1ed] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#315c5d]">
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true"><path d="M12 .75a11.25 11.25 0 0 0-3.56 21.93c.56.1.77-.24.77-.54v-2.1c-3.13.68-3.79-1.33-3.79-1.33-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.72 1.16 1.72 1.16 1 .1.74 1.91 3.26 1.38.1-.73.39-1.23.71-1.52-2.5-.28-5.13-1.25-5.13-5.56 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.09 1.15a10.7 10.7 0 0 1 5.62 0c2.15-1.45 3.09-1.15 3.09-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.79 1.16 3.02 0 4.32-2.64 5.27-5.15 5.55.4.35.75 1.02.75 2.06v3.05c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z"/></svg>
      </a>
    </div>
  </footer>;
}
