"use client";

import { Search } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";
import { surfaceInputClass } from "@/lib/ui/theme-surfaces";

type SearchInputProps = Omit<ComponentProps<"input">, "type"> & {
  wrapperClassName?: string;
};

export function SearchInput({
  className,
  wrapperClassName,
  ...props
}: SearchInputProps) {
  return (
    <div className={cn("relative w-full min-w-0", wrapperClassName)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        type="search"
        className={cn(
          "h-11 w-full min-w-0 rounded-xl py-2 pl-10 pr-3 text-sm",
          surfaceInputClass,
          className,
        )}
        {...props}
      />
    </div>
  );
}
