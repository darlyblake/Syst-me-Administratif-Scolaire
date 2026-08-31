export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-white px-6 text-center">
      <section className="max-w-md">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white">
          N
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">Vous êtes hors connexion</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          NOVA nécessite une connexion internet pour synchroniser les données de votre établissement.
          Vérifiez votre réseau puis réessayez.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-slate-900 px-5 py-3 text-sm font-medium text-white"
        >
          Réessayer
        </button>
      </section>
    </main>
  )
}
