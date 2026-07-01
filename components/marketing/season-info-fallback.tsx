import { Trophy, Calendar, Target } from "lucide-react";

export function SeasonInfoFallback() {
  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {[Trophy, Calendar, Target].map((Icon, index) => (
        <div key={index} className="rounded-card glass animate-pulse p-5">
          <Icon className="h-5 w-5 text-muted/40" />
          <div className="mt-3 h-3 w-24 rounded bg-muted/20" />
          <div className="mt-2 h-7 w-32 rounded bg-muted/25" />
          <div className="mt-2 h-3 w-full rounded bg-muted/15" />
        </div>
      ))}
    </div>
  );
}
