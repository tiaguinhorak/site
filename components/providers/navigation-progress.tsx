"use client";

import NextTopLoader from "nextjs-toploader";

export function NavigationProgress() {
  return (
    <NextTopLoader
      color="var(--primary)"
      height={3}
      showSpinner={false}
      crawl={false}
      speed={200}
      easing="ease"
      shadow="0 0 12px var(--primary),0 0 6px var(--primary)"
    />
  );
}
