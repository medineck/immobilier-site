"use client";

// Bouton qui demande une confirmation avant d'envoyer le formulaire
export function ConfirmButton({ message, children }: { message: string; children: React.ReactNode }) {
  return (
    <button
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
      className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
    >
      {children}
    </button>
  );
}
