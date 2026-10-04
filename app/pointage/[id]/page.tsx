"use client"

import { useState } from "react"
import { CheckCircle2, Clock3, LogIn, LogOut, School, ShieldCheck } from "lucide-react"
import { useParams } from "next/navigation"
import { servicePointage, type PointageAction } from "@/services/pointage.service"

const actions: Array<{ value: PointageAction; label: string; description: string; icon: typeof LogIn }> = [
  { value: "arrival", label: "Arrivée", description: "Début de la journée de travail", icon: LogIn },
  { value: "departure", label: "Départ", description: "Fin de la journée de travail", icon: LogOut },
  { value: "course_start", label: "Début du cours", description: "Démarrer le cours prévu maintenant", icon: Clock3 },
  { value: "course_end", label: "Fin du cours", description: "Terminer le cours en cours", icon: CheckCircle2 },
]

export default function PointageKioskPage() {
  const { id } = useParams<{ id: string }>()
  const [code, setCode] = useState("")
  const [action, setAction] = useState<PointageAction>("course_start")
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (!code.trim()) {
      setError("Saisissez votre code de pointage.")
      return
    }
    setWorking(true)
    setError(null)
    setMessage(null)
    try {
      const result = await servicePointage.enregistrerParCode(id, action, code)
      const label = action === "arrival" ? "Arrivée" : action === "departure" ? "Départ" : action === "course_start" ? "Début du cours" : "Fin du cours"
      setMessage(result.scheduled_start && result.scheduled_end
        ? label + " enregistré : " + result.scheduled_start.slice(0, 5) + " → " + result.scheduled_end.slice(0, 5)
        : label + " enregistré avec succès.")
      setCode("")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Code invalide ou pointage refusé.")
    } finally {
      setWorking(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f6fb] text-[#172033]">
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-10">
        <header className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e9edff] text-[#2441a5]"><School className="h-7 w-7" /></div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#3152c8]">Poste de pointage</p>
          <h1 className="mt-1 text-3xl font-bold">Entrez votre code</h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-[#6d7280]">Utilisez votre code personnel pour vous identifier et enregistrer votre présence ou le début/la fin d'un cours.</p>
        </header>

        <section className="border border-[#dfe2ec] bg-white p-6 shadow-sm sm:p-8">
          <label className="block text-sm font-medium">Code de pointage
            <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={12} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} onKeyDown={(e) => { if (e.key === "Enter") void submit() }} placeholder="Ex. 482731" className="mt-2 h-14 w-full border border-[#cfd4e2] px-4 text-center font-mono text-2xl tracking-[0.35em] outline-none focus:border-[#3152c8]" />
          </label>

          <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {actions.map((item) => {
              const Icon = item.icon
              const selected = action === item.value
              return <button key={item.value} type="button" onClick={() => setAction(item.value)} className={"border px-3 py-3 text-left " + (selected ? "border-[#3152c8] bg-[#eef1ff]" : "border-[#e1e3eb] bg-white hover:bg-[#f7f8fa]")}><Icon className="h-4 w-4 text-[#2944a8]" /><span className="mt-2 block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs text-[#6d7280]">{item.description}</span></button>
            })}
          </div>

          {error && <div className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {message && <div className="mt-4 border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}

          <button type="button" onClick={() => void submit()} disabled={working || !code.trim()} className="mt-5 flex h-12 w-full items-center justify-center gap-2 bg-[#0b2b83] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{working ? "Vérification…" : "Valider le pointage"}</button>
        </section>

        <p className="mt-5 text-center text-xs text-[#7a8190]">Poste configuré pour l'établissement <span className="font-mono">{id}</span>. Ne fermez pas cette page sur l'ordinateur de pointage.</p>
      </div>
    </main>
  )
}
