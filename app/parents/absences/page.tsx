export default function ParentAbsences() {
  return (
    <div className="space-y-7">
      <header className="border-b border-slate-200 pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-600">Vie scolaire</p>
        <h1 className="mt-1.5 text-3xl font-bold tracking-tight text-slate-950">Présences</h1>
        <p className="mt-1.5 text-sm leading-6 text-slate-500">Suivi des absences, retards et demandes de justification.</p>
      </header>
      <section className="border border-slate-200 bg-white p-6">
        <p className="font-semibold text-slate-900">Chargement du suivi scolaire</p>
        <p className="mt-1 text-sm text-slate-500">Les données de présence seront affichées après l'initialisation de votre espace parent.</p>
      </section>
    </div>
  )
}
