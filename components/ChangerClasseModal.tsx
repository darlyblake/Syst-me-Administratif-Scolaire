"use client"

import { useMemo, useState } from "react"
import { ArrowRightLeft, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { changeStudentEnrollmentClass } from "@/lib/supabase/services/student.service"

type ClassOption = {
  id: string
  name: string
  gradeLevelId: string
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  establishmentId: string | null
  enrollmentId: string
  studentName: string
  currentClassName: string
  currentGradeLevelId: string | null
  classes: ClassOption[]
}

export default function ChangerClasseModal({
  isOpen,
  onClose,
  onSuccess,
  establishmentId,
  enrollmentId,
  studentName,
  currentClassName,
  currentGradeLevelId,
  classes,
}: Props) {
  const [selectedClassId, setSelectedClassId] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const availableClasses = useMemo(() => {
    const filtered = currentGradeLevelId
      ? classes.filter((item) => item.gradeLevelId === currentGradeLevelId)
      : classes

    return filtered.filter((item) => item.id !== selectedClassId || item.id !== "")
  }, [classes, currentGradeLevelId, selectedClassId])

  if (!isOpen) return null

  const handleClose = () => {
    if (isSaving) return
    setSelectedClassId("")
    onClose()
  }

  const handleSave = async () => {
    if (!establishmentId || !selectedClassId) {
      toast.error("Sélectionnez une nouvelle classe.")
      return
    }

    setIsSaving(true)
    try {
      await changeStudentEnrollmentClass({
        establishmentId,
        enrollmentId,
        classId: selectedClassId,
      })
      toast.success("Classe de l'élève mise à jour.")
      setSelectedClassId("")
      onSuccess()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de changer la classe.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md border border-[#c5c5d3] bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-[#c5c5d3]/60 px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-[#131b2e]">Changer de classe</h2>
            <p className="mt-1 text-[11px] leading-4 text-[#515f74]">
              Modifiez la classe de l'inscription actuelle sans créer un nouveau dossier.
            </p>
          </div>
          <button type="button" onClick={handleClose} disabled={isSaving} className="p-1 text-[#515f74] hover:bg-[#f2f3ff]" aria-label="Fermer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="border-b border-[#c5c5d3]/50 pb-3">
            <p className="text-[10px] font-medium uppercase tracking-[.04em] text-[#68758a]">Élève</p>
            <p className="mt-1 text-[13px] font-semibold text-[#131b2e]">{studentName}</p>
            <p className="mt-1 text-[11px] text-[#515f74]">
              Classe actuelle : <span className="font-medium text-[#131b2e]">{currentClassName || "Aucune classe"}</span>
            </p>
          </div>

          <div>
            <label htmlFor="change-class-select" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">
              Nouvelle classe
            </label>
            <select
              id="change-class-select"
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              className="h-9 w-full border border-[#c5c5d3] bg-white px-3 text-[12px] text-[#131b2e] outline-none focus:border-[#00236f]"
              disabled={isSaving}
            >
              <option value="">Sélectionner une classe</option>
              {availableClasses.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
            {availableClasses.length === 0 && (
              <p className="mt-2 text-[11px] text-[#ba1a1a]">
                Aucune autre classe disponible pour ce niveau.
              </p>
            )}
            <p className="mt-2 text-[10px] leading-4 text-[#68758a]">
              Le changement est limité au même niveau. Une montée, une descente ou un redoublement se traite par une réinscription.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#c5c5d3]/60 px-5 py-3">
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving} className="h-8 rounded px-3 text-[11px]">
            Annuler
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || !selectedClassId} className="h-8 rounded bg-[#1e3a8a] px-3 text-[11px] text-white hover:bg-[#00236f]">
            <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" />
            {isSaving ? "Enregistrement…" : "Changer la classe"}
          </Button>
        </div>
      </div>
    </div>
  )
}
