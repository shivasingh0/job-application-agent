"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/job", label: "Add Job" },
  { href: "/resume", label: "Resume" },
  { href: "/fit", label: "Fit Analysis" },
  { href: "/email", label: "Preview" },
  { href: "/scheduled", label: "Scheduled" },
  { href: "/history", label: "History" },
];

export function Nav({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className={
        compact
          ? "flex flex-wrap gap-2"
          : "flex flex-col gap-1 border-r border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
      }
    >
      {!compact ? (
        <Link
          href="/"
          className="mb-4 px-3 text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          Job Agent
        </Link>
      ) : null}
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "border border-emerald-600/40 bg-emerald-50 text-emerald-900 dark:border-emerald-500/50 dark:bg-emerald-950/60 dark:text-emerald-100"
                : "border border-transparent text-zinc-600 hover:bg-zinc-200/80 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
