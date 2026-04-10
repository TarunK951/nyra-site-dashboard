import { Suspense } from "react";

import { NyraDashboard } from "@/components/NyraDashboard";

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-svh items-center justify-center bg-[var(--background)] text-[var(--foreground-secondary)]">
          Loading…
        </div>
      }
    >
      <NyraDashboard />
    </Suspense>
  );
}
