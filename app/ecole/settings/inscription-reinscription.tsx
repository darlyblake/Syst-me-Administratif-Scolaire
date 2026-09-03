import React from 'react';

export default function InscriptionReinscriptionSettings() {
  return (
    <section className="rounded-xl border bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold">Inscription et réinscription</h2>
      <p className="mt-1 text-sm text-gray-500">
        Les frais d’inscription et de réinscription sont communs à toutes les classes.
        La scolarité reste différenciée par niveau.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Inscription</span>
          <input type="number" min="0" step="1" className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Montant" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Réinscription</span>
          <input type="number" min="0" step="1" className="mt-1 w-full rounded-lg border px-3 py-2" placeholder="Montant" />
        </label>
      </div>
    </section>
  );
}
