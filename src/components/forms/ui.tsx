// Petits éléments de formulaire réutilisables
export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
  hint,
  required = true,
  readOnly,
  placeholder,
  step,
  min,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
  hint?: string;
  required?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        required={required}
        readOnly={readOnly}
        placeholder={placeholder}
        step={step}
        min={min}
        className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-base outline-none read-only:bg-surface read-only:text-muted focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Alert({ kind = "error", children }: { kind?: "error" | "ok"; children: React.ReactNode }) {
  return (
    <p
      role={kind === "error" ? "alert" : "status"}
      className={kind === "error" ? "rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800" : "rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-700"}
    >
      {children}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      disabled={pending}
      className="w-full rounded-xl bg-brand-500 px-5 py-3 font-semibold text-white hover:bg-brand-600 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Patientez…" : children}
    </button>
  );
}

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-16">
      <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
      {subtitle && <div className="mt-2 text-muted">{subtitle}</div>}
      <div className="mt-8">{children}</div>
    </div>
  );
}

// Envoie le formulaire sans le vider : les choix (listes, cases) restent tels quels en cas d'erreur
export function keepValuesOnSubmit(action: (fd: FormData) => void, startTransition: (fn: () => void) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => action(fd));
  };
}
