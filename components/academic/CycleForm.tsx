"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { EducationCycle } from "@/lib/supabase/types"

interface CycleFormProps {
  initialData?: Partial<EducationCycle>
  onSubmit: (data: { name: string; code?: string; display_order?: number }) => Promise<void>
  onCancel: () => void
}

export function CycleForm({ initialData, onSubmit, onCancel }: CycleFormProps) {
  const [name, setName] = useState(initialData?.name || "")
  const [code, setCode] = useState(initialData?.code || "")
  const [displayOrder, setDisplayOrder] = useState<number | "">(
    initialData?.display_order !== undefined ? initialData.display_order : ""
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError("Le nom du cycle est obligatoire")
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      await onSubmit({
        name: name.trim(),
        code: code.trim() || undefined,
        display_order: displayOrder === "" ? undefined : Number(displayOrder)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name">Nom du cycle <span className="text-red-500">*</span></Label>
        <Input 
          id="name" 
          placeholder="ex: Primaire" 
          value={name} 
          onChange={(e) => setName(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="code">Code (optionnel)</Label>
          <Input 
            id="code" 
            placeholder="ex: PRIM" 
            value={code} 
            onChange={(e) => setCode(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="displayOrder">Ordre d'affichage</Label>
          <Input 
            id="displayOrder" 
            type="number"
            placeholder="ex: 1" 
            value={displayOrder} 
            onChange={(e) => setDisplayOrder(e.target.value === "" ? "" : Number(e.target.value))}
            disabled={isSubmitting}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting || !name.trim()}>
          {isSubmitting ? "Enregistrement..." : (initialData?.id ? "Mettre à jour" : "Créer le cycle")}
        </Button>
      </div>
    </form>
  )
}
