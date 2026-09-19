"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Pencil, ChevronRight, GraduationCap } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

import { useAuthentification } from "@/providers/authentification.provider"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import {
  createCycle,
  updateCycle,
  createLevel,
  updateLevel,
} from "@/lib/supabase/services/academic.service"
import type { AcademicStructureCycle, AcademicStructureLevel, EducationCycle, GradeLevel } from "@/lib/supabase/types"

import { CycleForm } from "@/components/academic/CycleForm"
import { GradeLevelForm } from "@/components/academic/GradeLevelForm"

// ─── Types pour les modales ───────────────────────────────────────────────────

type ModalState =
  | { type: "none" }
  | { type: "add-cycle" }
  | { type: "edit-cycle"; cycle: AcademicStructureCycle }
  | { type: "add-level"; cycle: AcademicStructureCycle }
  | { type: "edit-level"; cycle: AcademicStructureCycle; level: AcademicStructureLevel }

// ─── Composant principal ──────────────────────────────────────────────────────

export default function StructureAcademiquePage() {
  const { utilisateur } = useAuthentification()
  const establishmentId =
    (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null

  const { data: structure, isLoading, error, refresh } = useAcademicStructure(establishmentId)

  const [modal, setModal] = useState<ModalState>({ type: "none" })

  const closeModal = () => setModal({ type: "none" })

  // ── Handlers Cycle ──────────────────────────────────────────────────────────

  const handleCreateCycle = async (data: { name: string; code?: string; display_order?: number }) => {
    if (!establishmentId) return
    await createCycle({ ...data, establishment_id: establishmentId, active: true })
    toast.success("Cycle créé")
    await refresh()
    closeModal()
  }

  const handleUpdateCycle = async (
    cycleId: string,
    data: { name: string; code?: string; display_order?: number }
  ) => {
    await updateCycle(cycleId, data)
    toast.success("Cycle mis à jour")
    await refresh()
    closeModal()
  }

  // ── Handlers Niveau ─────────────────────────────────────────────────────────

  const handleCreateLevel = async (
    cycleId: string,
    data: { name: string; code?: string; display_order?: number }
  ) => {
    await createLevel({ ...data, cycle_id: cycleId, active: true })
    toast.success("Niveau créé")
    await refresh()
    closeModal()
  }

  const handleUpdateLevel = async (
    levelId: string,
    data: { name: string; code?: string; display_order?: number }
  ) => {
    await updateLevel(levelId, data)
    toast.success("Niveau mis à jour")
    await refresh()
    closeModal()
  }

  // ── Titre de la modale ──────────────────────────────────────────────────────

  const modalTitle = () => {
    switch (modal.type) {
      case "add-cycle":   return "Ajouter un cycle"
      case "edit-cycle":  return "Modifier le cycle"
      case "add-level":   return "Ajouter un niveau"
      case "edit-level":  return "Modifier le niveau"
      default: return ""
    }
  }

  // ── Rendu ──────────────────────────────────────────────────────────────────

  if (!establishmentId) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">Aucun établissement associé à ce compte.</p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">

      {/* En-tête page */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Structure académique</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configurez les cycles et les niveaux de votre établissement avant de créer les classes.
        </p>
      </div>

      {/* Bouton principal */}
      <div className="mb-6">
        <Button
          size="sm"
          onClick={() => setModal({ type: "add-cycle" })}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter un cycle
        </Button>
      </div>

      {/* Zone de contenu */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="p-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          Impossible de charger la structure académique. Vérifiez votre connexion et réessayez.
        </div>
      ) : structure.length === 0 ? (
        <EmptyState onAdd={() => setModal({ type: "add-cycle" })} />
      ) : (
        <div className="space-y-4">
          {structure.map((cycle) => (
        <CycleSection
              key={cycle.id}
              cycle={cycle}
              onEditCycle={() => setModal({ type: "edit-cycle", cycle })}
              onAddLevelForCycle={() => setModal({ type: "add-level", cycle })}
              onEditLevel={(level) => setModal({ type: "edit-level", cycle, level })}
            />
          ))}
        </div>
      )}

      {/* Modale unique */}
      <Dialog open={modal.type !== "none"} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{modalTitle()}</DialogTitle>
          </DialogHeader>

          {modal.type === "add-cycle" && (
            <CycleForm
              onSubmit={handleCreateCycle}
              onCancel={closeModal}
            />
          )}

          {modal.type === "edit-cycle" && (
            <CycleForm
              initialData={modal.cycle}
              onSubmit={(data) => handleUpdateCycle(modal.cycle.id, data)}
              onCancel={closeModal}
            />
          )}

          {modal.type === "add-level" && (
            <GradeLevelForm
              cycleId={modal.cycle.id}
              cycleName={modal.cycle.name}
              onSubmit={(data) => handleCreateLevel(modal.cycle.id, data)}
              onCancel={closeModal}
            />
          )}

          {modal.type === "edit-level" && (
            <GradeLevelForm
              cycleId={modal.cycle.id}
              cycleName={modal.cycle.name}
              initialData={modal.level}
              onSubmit={(data) => handleUpdateLevel(modal.level.id, data)}
              onCancel={closeModal}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Section d'un cycle ───────────────────────────────────────────────────────

interface CycleSectionProps {
  cycle: AcademicStructureCycle
  onEditCycle: () => void
  onAddLevelForCycle: () => void
  onEditLevel: (level: AcademicStructureLevel) => void
}

function CycleSection({ cycle, onEditCycle, onAddLevelForCycle, onEditLevel }: CycleSectionProps) {
  const levels = cycle.grade_levels || []

  return (
    <div className="border rounded-md">
      {/* En-tête du cycle */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b rounded-t-md">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-gray-500 shrink-0" />
          <span className="font-semibold text-sm uppercase tracking-wide text-gray-700">
            {cycle.name}
          </span>
          <span className="text-xs text-gray-400">
            {levels.length} {levels.length === 1 ? "niveau" : "niveaux"}
          </span>
        </div>
        <Button variant="ghost" size="sm" onClick={onEditCycle} className="text-gray-500 hover:text-gray-700">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Modifier
        </Button>
      </div>

      {/* Niveaux */}
      <div className="px-4 py-3 space-y-1">
        {levels.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">
            Aucun niveau. Commencez par en ajouter un.
          </p>
        ) : (
          levels.map((level, index) => (
            <div key={level.id}>
              <LevelRow
                level={level}
                onEdit={() => onEditLevel(level)}
              />
              {index < levels.length - 1 && <Separator className="my-1" />}
            </div>
          ))
        )}
      </div>

      {/* Bouton ajouter niveau */}
      <div className="px-4 pb-3">
        <button
          onClick={onAddLevelForCycle}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1 mt-1"
        >
          <Plus className="h-3 w-3" />
          Ajouter un niveau
        </button>
      </div>
    </div>
  )
}

// ─── Ligne d'un niveau ────────────────────────────────────────────────────────

interface LevelRowProps {
  level: AcademicStructureLevel
  onEdit: () => void
}

function LevelRow({ level, onEdit }: LevelRowProps) {
  const classCount = level.school_classes?.length ?? 0

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-sm text-gray-800 font-medium truncate">{level.name}</span>
        {classCount > 0 && (
          <span className="text-xs text-gray-400 shrink-0">
            {classCount} {classCount === 1 ? "classe" : "classes"}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0 ml-2">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700">
          <Pencil className="h-3 w-3 mr-1" />
          Modifier
        </Button>
        {classCount > 0 && (
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-gray-500 hover:text-gray-700">
            <Link href={`/ecole/classes?niveau=${level.id}`}>
              Voir les classes
              <ChevronRight className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── État vide ────────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="text-center py-16 border border-dashed rounded-md">
      <GraduationCap className="h-8 w-8 mx-auto text-gray-300 mb-3" />
      <h3 className="text-sm font-medium text-gray-700 mb-1">Aucune structure académique</h3>
      <p className="text-xs text-gray-400 mb-4">
        Commencez par créer le premier cycle de votre établissement.
      </p>
      <Button size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4 mr-1.5" />
        Ajouter un cycle
      </Button>
    </div>
  )
}

// ─── Squelette de chargement ──────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="border rounded-md">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="px-4 py-3 space-y-3">
            {[1, 2, 3].map((j) => (
              <Skeleton key={j} className="h-4 w-full" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
