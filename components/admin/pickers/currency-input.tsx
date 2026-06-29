"use client";

import { useCallback, useEffect, useState } from "react";
import {
  centsToBrlDisplay,
  centsToDigitString,
  formatDigitsAsBrl,
  parseBrlInputToCents,
} from "@/lib/currency-mask";
import { cn } from "@/lib/utils";

export function CurrencyInput({
  label,
  valueCents,
  onChangeCents,
  placeholder = "R$ 0,00",
  className,
  optional,
}: {
  label: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
  placeholder?: string;
  className?: string;
  optional?: boolean;
}) {
  const [digits, setDigits] = useState(() => centsToDigitString(valueCents));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDigits(centsToDigitString(valueCents));
    }
  }, [valueCents, focused]);

  const display = digits ? formatDigitsAsBrl(digits) : "";

  const handleChange = useCallback(
    (raw: string) => {
      const nextDigits = raw.replace(/\D/g, "");
      setDigits(nextDigits);
      onChangeCents(parseBrlInputToCents(nextDigits));
    },
    [onChangeCents],
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-muted">
        {label}
        {optional ? (
          <span className="ml-1 font-normal normal-case text-muted/80">(opcional)</span>
        ) : null}
      </label>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={focused ? display : valueCents > 0 ? centsToBrlDisplay(valueCents) : ""}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          setDigits(centsToDigitString(valueCents));
        }}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm tabular-nums"
      />
    </div>
  );
}
