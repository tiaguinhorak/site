import { profileCountries } from "@/lib/profile";
import { cn } from "@/lib/utils";

type CountrySelectProps = {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  id?: string;
};

export function CountrySelect({
  value,
  onChange,
  error,
  id = "country",
}: CountrySelectProps) {
  return (
    <div className="w-full">
      <label
        htmlFor={id}
        className="mb-1.5 block font-display text-xs font-semibold uppercase tracking-wider text-muted"
      >
        País
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 w-full rounded-xl border border-border bg-[color-mix(in_srgb,var(--background-soft)_70%,transparent)] px-4 text-sm text-foreground outline-none transition-all",
          "focus:border-primary focus:ring-2 focus:ring-[color-mix(in_srgb,var(--primary)_30%,transparent)]",
          error && "border-rose-500/60",
        )}
      >
        {profileCountries.map((country) => (
          <option key={country.value} value={country.value}>
            {country.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1.5 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
