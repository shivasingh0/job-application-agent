import Link from "next/link";
import type { FlowStepId } from "@/lib/flow";

/** Compact vertical pipeline matching the product flow. */
export function FlowPipeline({ activeStep }: { activeStep?: FlowStepId }) {
  const steps = [
    { label: "LinkedIn URL / Screenshot", href: "/job", step: 1 as FlowStepId },
    { label: "AI extracts JD", href: "/job", step: 2 as FlowStepId, muted: true },
    { label: "Upload resume", href: "/resume", step: 3 as FlowStepId },
    { label: "Gemini fit analysis", href: "/fit", step: 4 as FlowStepId },
    { label: "Preview email", href: "/email", step: 5 as FlowStepId },
    { label: "Send or schedule", href: "/email", step: 6 as FlowStepId },
    { label: "Gmail", href: "/history", step: 7 as FlowStepId },
  ];

  return (
    <ol className="space-y-0 text-sm">
      {steps.map((item, i) => {
        const isActive = activeStep === item.step;
        const isPast = activeStep !== undefined && item.step < activeStep;
        return (
          <li key={item.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                  isActive
                    ? "border-emerald-500 bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/40"
                    : isPast
                      ? "border-emerald-600/50 bg-emerald-100 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-950 dark:text-emerald-200"
                      : "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200"
                }`}
              >
                {isPast ? "✓" : i + 1}
              </span>
              {i < steps.length - 1 ? (
                <span className="my-0.5 w-px flex-1 min-h-[12px] bg-zinc-200 dark:bg-zinc-700" />
              ) : null}
            </div>
            <div className="pb-4">
              {item.muted ? (
                <span
                  className={`block ${isActive ? "font-medium text-zinc-900 dark:text-zinc-100" : "text-zinc-500"}`}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className={`block hover:underline ${
                    isActive
                      ? "font-medium text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  {item.label}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function FlowSummary() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
      <FlowPipeline />
    </div>
  );
}
