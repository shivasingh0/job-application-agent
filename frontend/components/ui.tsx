export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
      {children}
    </label>
  );
}

const inputBase =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:scheme-dark";

const fileInputExtra =
  "cursor-pointer file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-zinc-300 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-900 hover:file:bg-zinc-200 dark:file:border-zinc-500 dark:file:bg-zinc-700 dark:file:text-zinc-50 dark:hover:file:bg-zinc-600";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, type, value, ...rest } = props;
  const isFile = type === "file";
  return (
    <input
      {...rest}
      type={type}
      {...(isFile ? {} : { value: value ?? "" })}
      className={`${inputBase} ${isFile ? fileInputExtra : ""} ${className ?? ""}`}
    />
  );
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
    >
      {children}
    </select>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
    />
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  const styles = {
    primary:
      "bg-zinc-900 text-white shadow-sm hover:bg-zinc-800 dark:border dark:border-zinc-500 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white",
    secondary:
      "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-500 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    ghost: "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800",
  };
  return (
    <button
      {...props}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Alert({
  type,
  children,
}: {
  type: "error" | "success";
  children: React.ReactNode;
}) {
  const styles =
    type === "error"
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
      : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</div>
  );
}
