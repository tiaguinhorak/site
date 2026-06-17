import { cn } from "@/lib/utils";

export function AmbientGlow({ className }: { className?: string }) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      aria-hidden
    >
      <div
        className="absolute -left-32 top-0 h-[34rem] w-[34rem] rounded-full opacity-60 blur-[130px]"
        style={{ background: "var(--glow-1)" }}
      />
      <div
        className="absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full opacity-50 blur-[130px]"
        style={{ background: "var(--glow-2)" }}
      />
    </div>
  );
}
