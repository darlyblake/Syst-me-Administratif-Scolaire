"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type ExclusionScope = "current_lesson" | "same_subject_until"

type Props = {
  studentName: string
  subjectName: string
  onClose: () => void
  onSubmit: (input: { reason: string; scope: ExclusionScope; endDate?: string }) => Promise<void>
}

const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}

export function CourseExclusionDialog({ studentName, subjectName, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("")
  const [scope, setScope] = useState<ExclusionScope>("current_lesson")
  const [endDate, setEndDate] = useState(today())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    if (reason.trim().length < 3) {
      setError("Indiquez un motif d'au moins 3 caractères.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSubmit({ reason: reason.trim(), scope, endDate: scope === "current_lesson" ? undefined : endDate })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible d'enregistrer le signalement.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) onClose() }}>
      <section role="dialog" aria-modal="true" aria-labelledby="course-exclusion-title" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Vie scolaire</p>
            <h2 id="course-exclusion-title" className="mt-1 text-lg font-semibold text-slate-900">Signaler une exclusion</h2>
            <p className="mt-1 text-sm text-slate-500">{studentName} · {subjectName}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Fermer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        <label className="block text-sm font-medium text-slate-800">
          Motif de l'exclusion
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={1000} placeholder="Décrivez précisément le comportement constaté…" className="mt-2 w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100" />
        </label>

        <fieldset className="mt-4 space-y-3">
          <legend className="text-sm font-medium text-slate-800">Durée souhaitée</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input type="radio" name="exclusion-scope" checked={scope === "current_lesson"} onChange={() => setScope("current_lesson")} className="mt-1 accent-blue-700" />
            <span><strong className="block text-sm">Ce cours uniquement</strong><span className="text-xs text-slate-500">Le parent est informé automatiquement et l'administration reçoit le signalement.</span></span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3">
            <input type="radio" name="exclusion-scope" checked={scope === "same_subject_until"} onChange={() => setScope("same_subject_until")} className="mt-1 accent-blue-700" />
            <span><strong className="block text-sm">Cette matière jusqu'à une date</strong><span className="text-xs text-slate-500">Soumis à la validation de l'administration.</span></span>
          </label>
        </fieldset>

        {scope !== "current_lesson" && (
          <label className="mt-4 block text-sm font-medium text-slate-800">
            Date de fin demandée
            <Input type="date" min={today()} value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-2" />
          </label>
        )}

        {scope !== "current_lesson" && <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="h-4 w-4 shrink-0" />La mesure ne sera pas appliquée avant validation par l'administration.</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Annuler</Button>
          <Button type="button" onClick={() => void submit()} disabled={saving || reason.trim().length < 3 || (scope !== "current_lesson" && !endDate)}>
            {saving ? "Enregistrement…" : "Envoyer le signalement"}
          </Button>
        </div>
      </section>
    </div>
  )
}
