"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Alert, Card } from "@/components/ui";
import { listApplications } from "@/lib/api";
import type { Application } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    sent: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    scheduled: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs capitalize ${styles[status] ?? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}
    >
      {status}
    </span>
  );
}

export default function HistoryPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listApplications()
      .then(setItems)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  return (
    <PageShell
      title="Applications History"
      description="All sent and scheduled applications."
    >
      {error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No applications yet.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {items.map((app) => (
            <li key={app.id}>
              <Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {app.emailSubject}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {app.job.title} · {app.resume.name}
                    </p>
                    <p className="mt-2 line-clamp-3 text-sm text-zinc-600 dark:text-zinc-400">
                      {app.emailBody}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-zinc-500">
                    <StatusBadge status={app.status} />
                    <p className="mt-2">
                      {app.status === "sent"
                        ? formatDate(app.sentAt)
                        : formatDate(app.scheduledAt)}
                    </p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
