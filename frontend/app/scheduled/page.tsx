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

export default function ScheduledPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listApplications()
      .then((all) => setItems(all.filter((a) => a.status === "scheduled")))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }, []);

  return (
    <PageShell
      title="Scheduled Emails"
      description="Applications waiting to be sent."
    >
      {error ? (
        <Alert type="error">{error}</Alert>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-zinc-500">No scheduled emails yet.</p>
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
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {app.emailBody}
                    </p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-zinc-500">
                    <p>{formatDate(app.scheduledAt)}</p>
                    <span className="mt-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                      scheduled
                    </span>
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
