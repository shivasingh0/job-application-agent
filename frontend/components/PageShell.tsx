import { FlowAside } from "./FlowAside";
import { Nav } from "./Nav";

export function PageShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-1">
      <aside className="hidden w-56 shrink-0 md:block">
        <Nav />
        <FlowAside />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="border-b border-zinc-200 px-4 py-3 md:hidden dark:border-zinc-800">
          <Nav compact />
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
