"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copier le lien" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt("Copiez ce lien :", text);
        }
      }}
      className="rounded-lg border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface"
    >
      {done ? "Copié ✓" : label}
    </button>
  );
}
