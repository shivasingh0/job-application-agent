import Link from "next/link";
import { FlowSummary } from "@/components/FlowPipeline";
import { PageShell } from "@/components/PageShell";
import { Button, Card } from "@/components/ui";

export default function Home() {
  return (
    <PageShell
      title="Job Application Agent"
      description="LinkedIn job → resume → Gemini fit score and personalized email → Gmail."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <FlowSummary />
        <div className="flex flex-col justify-center gap-4">
          <Card>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Start with a LinkedIn URL or screenshot. Gemini extracts and validates the JD,
              compares your resume for fit (match score, skills, recommendation), then you
              preview and send via your{" "}
              <strong className="font-medium text-zinc-800 dark:text-zinc-200">Gmail</strong>{" "}
              account.
            </p>
            <Link href="/job" className="mt-4 inline-block">
              <Button>Start — add job</Button>
            </Link>
          </Card>
          <div className="flex gap-3 text-sm">
            <Link href="/scheduled" className="text-zinc-500 underline hover:text-zinc-900">
              Scheduled
            </Link>
            <Link href="/history" className="text-zinc-500 underline hover:text-zinc-900">
              History
            </Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
