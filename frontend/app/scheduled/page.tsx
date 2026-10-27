"use client";

import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { Alert, Button, Card, Input, Label, Textarea } from "@/components/ui";
import { deleteApplication, listApplications, updateApplication } from "@/lib/api";
import type { Application } from "@/lib/types";

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function toLocalDatetimeInput(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export default function ScheduledPage() {
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editDate, setEditDate] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    listApplications()
      .then((all) => setItems(all.filter((a) => a.status === "scheduled")))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      );
  }

  useEffect(() => {
    load();
  }, []);

  function startEditing(app: Application) {
    setEditingId(app.id);
    setEditSubject(app.emailSubject);
    setEditBody(app.emailBody);
    setEditDate(toLocalDatetimeInput(app.scheduledAt));
    setError(null);
    setSuccess(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditSubject("");
    setEditBody("");
    setEditDate("");
  }

  async function handleSave(id: string) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (!editSubject.trim()) throw new Error("Subject cannot be empty.");
      if (!editBody.trim()) throw new Error("Body cannot be empty.");
      if (!editDate) throw new Error("Please specify a scheduled date and time.");

      const updated = await updateApplication(id, {
        emailSubject: editSubject.trim(),
        emailBody: editBody.trim(),
        scheduledAt: new Date(editDate).toISOString(),
      });

      setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setSuccess("Scheduled email updated successfully.");
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update schedule");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Are you sure you want to cancel this scheduled email?")) {
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      await deleteApplication(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccess("Scheduled email was cancelled.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel email");
    }
  }

  return (
    <PageShell
      title="Scheduled Emails"
      description="Manage or edit applications waiting to be sent."
    >
      <div className="space-y-4">
        {error ? <Alert type="error">{error}</Alert> : null}
        {success ? <Alert type="success">{success}</Alert> : null}

        {items.length === 0 ? (
          <Card>
            <p className="text-sm text-zinc-500">No scheduled emails yet.</p>
          </Card>
        ) : (
          <ul className="space-y-4">
            {items.map((app) => (
              <li key={app.id}>
                <Card>
                  {editingId === app.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label>Email Subject</Label>
                        <Input
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Email Body</Label>
                        <Textarea
                          rows={6}
                          value={editBody}
                          onChange={(e) => setEditBody(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Scheduled For</Label>
                        <Input
                          type="datetime-local"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button
                          disabled={saving}
                          onClick={() => handleSave(app.id)}
                        >
                          {saving ? "Saving…" : "Save changes"}
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={saving}
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {app.emailSubject}
                          </p>
                          <p className="mt-1 text-sm text-zinc-500">
                            {app.job.title} · {app.resume.name}
                          </p>
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line line-clamp-3">
                            {app.emailBody}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-zinc-500">
                          <p className="font-medium text-zinc-700 dark:text-zinc-300">
                            {formatDate(app.scheduledAt)}
                          </p>
                          <span className="mt-1.5 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                            scheduled
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        <Button
                          variant="secondary"
                          className="text-xs py-1.5 px-3"
                          onClick={() => startEditing(app)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          className="text-xs py-1.5 px-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/50"
                          onClick={() => handleDelete(app.id)}
                        >
                          Cancel Schedule
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
