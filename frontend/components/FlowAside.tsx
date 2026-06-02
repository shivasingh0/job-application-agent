"use client";

import { usePathname } from "next/navigation";
import { FlowPipeline } from "./FlowPipeline";
import { stepForPath } from "@/lib/flow";

export function FlowAside() {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return (
    <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wide text-zinc-400">
        Pipeline
      </p>
      <div className="px-1">
        <FlowPipeline activeStep={stepForPath(pathname)} />
      </div>
    </div>
  );
}
