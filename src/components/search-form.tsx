// Formulaire de recherche : ville + location / achat.
// Il envoie vers /annonces?ville=...&type=...
export function SearchForm({ defaultVille = "", defaultType = "location" }: { defaultVille?: string; defaultType?: string }) {
  return (
    <form action="/annonces" className="grid gap-3 rounded-2xl bg-white p-3 shadow-lg ring-1 ring-line sm:grid-cols-[auto_1fr_auto] sm:items-center">
      <fieldset className="grid grid-cols-2 rounded-xl bg-surface p-1 text-sm font-medium">
        <legend className="sr-only">Type de recherche</legend>
        {[
          { value: "location", label: "Louer" },
          { value: "vente", label: "Acheter" },
        ].map((o) => (
          <label key={o.value} className="cursor-pointer">
            <input type="radio" name="type" value={o.value} defaultChecked={defaultType === o.value} className="peer sr-only" />
            <span className="block rounded-lg px-4 py-2 text-center text-muted peer-checked:bg-white peer-checked:text-ink peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500">
              {o.label}
            </span>
          </label>
        ))}
      </fieldset>
      <label className="flex items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-line focus-within:ring-2 focus-within:ring-brand-500 sm:ring-0 sm:focus-within:ring-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5 shrink-0 text-muted" aria-hidden>
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
        <span className="sr-only">Ville</span>
        <input
          name="ville"
          defaultValue={defaultVille}
          placeholder="Ville (ex. Lyon, Bordeaux…)"
          className="w-full bg-transparent py-1 text-base outline-none placeholder:text-muted"
        />
      </label>
      <button className="rounded-xl bg-brand-500 px-6 py-3 font-semibold text-white hover:bg-brand-600">Rechercher</button>
    </form>
  );
}
