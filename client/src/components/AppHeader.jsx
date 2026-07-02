import { HardDrive, ShieldCheck, Zap } from "lucide-react";
import { Badge } from "./ui/badge.jsx";

function AppHeader() {
  return (
    <header className="relative overflow-hidden border-b border-sky-200/50 bg-[#071d3c] px-4 py-4 text-white shadow-[0_18px_45px_rgba(15,77,148,0.22)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(110deg,rgba(30,144,255,0.28),transparent_36%),linear-gradient(90deg,rgba(125,211,252,0.12)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.1)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-cyan-300/35 bg-cyan-300/15 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.25)]">
          <HardDrive aria-hidden="true" className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold leading-tight text-white">
            BlockArchive
          </h1>
          <p className="mt-1 max-w-[65ch] text-sm text-sky-100/78">
            A handy and easy-to-understand file upload management tool
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge className="gap-1.5 border-cyan-300/35 bg-cyan-300/12 text-cyan-50">
          <Zap aria-hidden="true" className="h-3.5 w-3.5 text-cyan-200" />
          Blue console
        </Badge>
        <Badge className="gap-1.5 border-blue-200/30 bg-white/10 text-sky-50">
          <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-cyan-200" />
          Local asset manager
        </Badge>
      </div>
      </div>
    </header>
  );
}

export { AppHeader };
