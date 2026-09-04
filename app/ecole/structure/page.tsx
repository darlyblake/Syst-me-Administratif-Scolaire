"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Plus, Trash2, Edit, ChevronDown, ChevronRight, BookOpen, ChevronUp, ChevronDown as ChevronDownIcon } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { createCycle, updateCycle, deactivateCycle, createLevel, updateLevel, deactivateLevel, createClass, updateClass, deactivateClass } from "@/lib/supabase/services/academic.service"
import type { AcademicStructureCycle, AcademicStructureLevel } from "@/lib/supabase/types/academic"

// Modèles prédéfinis pour les cycles et niveaux
const PRESET_CYCLES: Record<string, { name: string; levels: string[] }> = {
  maternelle: {
    name: "Maternelle",
    levels: ["Petite Section", "Moyenne Section", "Grande Section"]
  },
  primaire: {
    name: "Primaire",
    levels: ["1ère année", "2ème année", "3ème année", "4ème année", "5ème année"]
  },
  college: {
    name: "Collège",
    levels: ["6ème", "5ème", "4ème", "3ème"]
  },
  lycee: {
    name: "Lycée",
    levels: ["Seconde LE", "Seconde S", "Première A1", "Première A2", "Première B", "Première S", "Terminale A1", "Terminale A2", "Terminale B", "Terminale C", "Terminale D"]
  },
  universite: {
    name: "Université",
    levels: ["Licence 1", "Licence 2", "Licence 3", "Master 1", "Master 2"]
  },
  centre_professionnel: {
    name: "Centre professionnel",
    levels: ["Niveau 1", "Niveau 2", "Niveau 3", "Formation personnalisée"]
  }
}

export default function StructurePage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId

  const { data: academicStructure, isLoading, refresh } = useAcademicStructure(establishmentId)

  // États pour les dialogs
  const [cycleDialogOpen, setCycleDialogOpen] = useState(false)
  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [levelDialogOpen, setLevelDialogOpen] = useState(false)
  const [classDialogOpen, setClassDialogOpen] = useState(false)

  // États pour les formulaires
  const [cycleForm, setCycleForm] = useState({ name: "" })
  const [levelForm, setLevelForm] = useState({ name: "", cycleId: "" })
  const [classForm, setClassForm] = useState({ name: "", levelId: "" })

  // États pour l'édition
  const [editingCycle, setEditingCycle] = useState<AcademicStructureCycle | null>(null)
  const [editingLevel, setEditingLevel] = useState<AcademicStructureLevel | null>(null)
  const [editingClass, setEditingClass] = useState<any>(null)

  // États pour l'expansion des cycles
  const [expandedCycles, setExpandedCycles] = useState<Set<string>>(new Set())
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set())

  if (!establishmentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erreur de chargement</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Impossible de charger l'identifiant de l'établissement.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const toggleCycleExpansion = (cycleId: string) => {
    setExpandedCycles(prev => {
      const newSet = new Set(prev)
      if (newSet.has(cycleId)) {
        newSet.delete(cycleId)
      } else {
        newSet.add(cycleId)
      }
      return newSet
    })
  }

  const toggleLevelExpansion = (levelId: string) => {
    setExpandedLevels(prev => {
      const newSet = new Set(prev)
      if (newSet.has(levelId)) {
        newSet.delete(levelId)
      } else {
        newSet.add(levelId)
      }
      return newSet
    })
  }

  const handleCreateCycle = async () => {
    if (!cycleForm.name.trim() || !establishmentId) return

    try {
      await createCycle(establishmentId, cycleForm.name.trim())
      setCycleForm({ name: "" })
      setCycleDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la création du cycle:", error)
      alert("Erreur lors de la création du cycle")
    }
  }

  const handleCreatePresetCycle = async (presetKey: string) => {
    if (!establishmentId) return

    const preset = PRESET_CYCLES[presetKey]
    if (!preset) return

    try {
      // Créer le cycle
      const cycle = await createCycle(establishmentId, preset.name)
      
      // Créer tous les niveaux du preset
      for (const levelName of preset.levels) {
        await createLevel(cycle.id, levelName)
      }
      
      setPresetDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la création du cycle prédéfini:", error)
      alert("Erreur lors de la création du cycle prédéfini")
    }
  }

  const handleUpdateCycle = async () => {
    if (!editingCycle || !cycleForm.name.trim()) return

    try {
      await updateCycle(editingCycle.id, { name: cycleForm.name.trim() })
      setCycleForm({ name: "" })
      setEditingCycle(null)
      setCycleDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la modification du cycle:", error)
      alert("Erreur lors de la modification du cycle")
    }
  }

  const handleDeactivateCycle = async (cycleId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir désactiver ce cycle ?")) return

    try {
      await deactivateCycle(cycleId)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la désactivation du cycle:", error)
      alert("Erreur lors de la désactivation du cycle")
    }
  }

  const handleCreateLevel = async () => {
    if (!levelForm.name.trim() || !levelForm.cycleId) return

    try {
      await createLevel(levelForm.cycleId, levelForm.name.trim())
      setLevelForm({ name: "", cycleId: "" })
      setLevelDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la création du niveau:", error)
      alert("Erreur lors de la création du niveau")
    }
  }

  const handleUpdateLevel = async () => {
    if (!editingLevel || !levelForm.name.trim()) return

    try {
      await updateLevel(editingLevel.id, { name: levelForm.name.trim() })
      setLevelForm({ name: "", cycleId: "" })
      setEditingLevel(null)
      setLevelDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la modification du niveau:", error)
      alert("Erreur lors de la modification du niveau")
    }
  }

  const handleDeactivateLevel = async (levelId: string) => {
    // Vérifier si le niveau a des classes
    const cycle = academicStructure?.find(c => c.grade_levels?.some(l => l.id === levelId))
    const level = cycle?.grade_levels?.find(l => l.id === levelId)
    
    if (level && level.school_classes && level.school_classes.length > 0) {
      alert(`Impossible de supprimer ce niveau car il est utilisé par ${level.school_classes.length} classe(s).`)
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir désactiver ce niveau ?")) return

    try {
      await deactivateLevel(levelId)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la désactivation du niveau:", error)
      alert("Erreur lors de la désactivation du niveau")
    }
  }

  const handleCreateClass = async () => {
    if (!classForm.name.trim() || !classForm.levelId) return

    try {
      await createClass(classForm.levelId, classForm.name.trim())
      setClassForm({ name: "", levelId: "" })
      setClassDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la création de la classe:", error)
      alert("Erreur lors de la création de la classe")
    }
  }

  const handleUpdateClass = async () => {
    if (!editingClass || !classForm.name.trim()) return

    try {
      await updateClass(editingClass.id, { name: classForm.name.trim() })
      setClassForm({ name: "", levelId: "" })
      setEditingClass(null)
      setClassDialogOpen(false)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la modification de la classe:", error)
      alert("Erreur lors de la modification de la classe")
    }
  }

  const handleDeactivateClass = async (classId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir désactiver cette classe ?")) return

    try {
      await deactivateClass(classId)
      refresh()
    } catch (error) {
      console.error("Erreur lors de la désactivation de la classe:", error)
      alert("Erreur lors de la désactivation de la classe")
    }
  }

  const handleMoveCycleUp = async (cycleId: string, currentIndex: number) => {
    if (currentIndex === 0) return

    try {
      const cycles = academicStructure || []
      const prevCycle = cycles[currentIndex - 1]
      
      await Promise.all([
        updateCycle(cycleId, { sort_order: prevCycle.sort_order || currentIndex - 1 }),
        updateCycle(prevCycle.id, { sort_order: currentIndex })
      ])
      
      refresh()
    } catch (error) {
      console.error("Erreur lors du réordonnancement du cycle:", error)
      alert("Erreur lors du réordonnancement du cycle")
    }
  }

  const handleMoveCycleDown = async (cycleId: string, currentIndex: number) => {
    const cycles = academicStructure || []
    if (currentIndex === cycles.length - 1) return

    try {
      const nextCycle = cycles[currentIndex + 1]
      
      await Promise.all([
        updateCycle(cycleId, { sort_order: nextCycle.sort_order || currentIndex + 1 }),
        updateCycle(nextCycle.id, { sort_order: currentIndex })
      ])
      
      refresh()
    } catch (error) {
      console.error("Erreur lors du réordonnancement du cycle:", error)
      alert("Erreur lors du réordonnancement du cycle")
    }
  }

  const handleMoveLevelUp = async (levelId: string, cycleId: string, currentIndex: number) => {
    if (currentIndex === 0) return

    try {
      const cycle = academicStructure?.find(c => c.id === cycleId)
      if (!cycle || !cycle.grade_levels) return

      const prevLevel = cycle.grade_levels[currentIndex - 1]
      
      await Promise.all([
        updateLevel(levelId, { sort_order: prevLevel.sort_order || currentIndex - 1 }),
        updateLevel(prevLevel.id, { sort_order: currentIndex })
      ])
      
      refresh()
    } catch (error) {
      console.error("Erreur lors du réordonnancement du niveau:", error)
      alert("Erreur lors du réordonnancement du niveau")
    }
  }

  const handleMoveLevelDown = async (levelId: string, cycleId: string, currentIndex: number) => {
    const cycle = academicStructure?.find(c => c.id === cycleId)
    if (!cycle || !cycle.grade_levels) return

    if (currentIndex === cycle.grade_levels.length - 1) return

    try {
      const nextLevel = cycle.grade_levels[currentIndex + 1]
      
      await Promise.all([
        updateLevel(levelId, { sort_order: nextLevel.sort_order || currentIndex + 1 }),
        updateLevel(nextLevel.id, { sort_order: currentIndex })
      ])
      
      refresh()
    } catch (error) {
      console.error("Erreur lors du réordonnancement du niveau:", error)
      alert("Erreur lors du réordonnancement du niveau")
    }
  }

  const openCycleDialog = (cycle?: AcademicStructureCycle) => {
    if (cycle) {
      setEditingCycle(cycle)
      setCycleForm({ name: cycle.name })
    } else {
      setEditingCycle(null)
      setCycleForm({ name: "" })
    }
    setCycleDialogOpen(true)
  }

  const openLevelDialog = (level?: AcademicStructureLevel, cycleId?: string) => {
    if (level) {
      setEditingLevel(level)
      setLevelForm({ name: level.name, cycleId: level.education_cycle_id })
    } else {
      setEditingLevel(null)
      setLevelForm({ name: "", cycleId: cycleId || "" })
    }
    setLevelDialogOpen(true)
  }

  const openClassDialog = (classItem?: any, levelId?: string) => {
    if (classItem) {
      setEditingClass(classItem)
      setClassForm({ name: classItem.name, levelId: classItem.grade_level_id })
    } else {
      setEditingClass(null)
      setClassForm({ name: "", levelId: levelId || "" })
    }
    setClassDialogOpen(true)
  }

  const closeAllDialogs = () => {
    setCycleDialogOpen(false)
    setLevelDialogOpen(false)
    setClassDialogOpen(false)
    setCycleForm({ name: "" })
    setLevelForm({ name: "", cycleId: "" })
    setClassForm({ name: "", levelId: "" })
    setEditingCycle(null)
    setEditingLevel(null)
    setEditingClass(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/settings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux paramètres
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Structure scolaire</h1>
            <p className="text-gray-600">Gérez les cycles, niveaux et classes de l'établissement</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Cycles d'enseignement</CardTitle>
                <CardDescription>Organisation hiérarchique : Cycle → Niveau → Classe</CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={presetDialogOpen} onOpenChange={setPresetDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Modèles
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un cycle prédéfini</DialogTitle>
                      <DialogDescription>
                        Sélectionnez un modèle pour créer automatiquement un cycle avec ses niveaux.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 py-4">
                      {Object.entries(PRESET_CYCLES).map(([key, preset]) => (
                        <Button
                          key={key}
                          variant="outline"
                          className="h-auto py-4 flex flex-col items-start gap-1"
                          onClick={() => handleCreatePresetCycle(key)}
                        >
                          <span className="font-semibold">{preset.name}</span>
                          <span className="text-xs text-muted-foreground">{preset.levels.length} niveaux</span>
                        </Button>
                      ))}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setPresetDialogOpen(false)}>Annuler</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog open={cycleDialogOpen} onOpenChange={setCycleDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => openCycleDialog()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau cycle
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingCycle ? "Modifier le cycle" : "Créer un nouveau cycle"}</DialogTitle>
                      <DialogDescription>
                        {editingCycle ? "Modifiez le nom du cycle d'enseignement." : "Créez un nouveau cycle d'enseignement (ex: Primaire, Collège, Lycée)."}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="cycleName">Nom du cycle <span className="text-red-500">*</span></Label>
                        <Input
                          id="cycleName"
                          value={cycleForm.name}
                          onChange={(e) => setCycleForm({ name: e.target.value })}
                          placeholder="Ex: Collège"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={closeAllDialogs}>Annuler</Button>
                      <Button onClick={editingCycle ? handleUpdateCycle : handleCreateCycle}>
                        {editingCycle ? "Modifier" : "Créer"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Chargement de la structure scolaire...</div>
            ) : !academicStructure || academicStructure.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">Aucun cycle configuré.</p>
                <Button onClick={() => openCycleDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer le premier cycle
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {academicStructure.map((cycle, cycleIndex) => (
                  <div key={cycle.id} className="border rounded-lg overflow-hidden">
                    <div 
                      className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => toggleCycleExpansion(cycle.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedCycles.has(cycle.id) ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                        <h3 className="font-semibold text-lg">{cycle.name}</h3>
                        <span className="text-sm text-gray-500">
                          ({cycle.grade_levels?.length || 0} niveau{cycle.grade_levels?.length !== 1 ? 'x' : ''})
                        </span>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleMoveCycleUp(cycle.id, cycleIndex)}
                          disabled={cycleIndex === 0}
                          title="Monter"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleMoveCycleDown(cycle.id, cycleIndex)}
                          disabled={cycleIndex === (academicStructure?.length || 0) - 1}
                          title="Descendre"
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openLevelDialog(undefined, cycle.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Niveau
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => openCycleDialog(cycle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDeactivateCycle(cycle.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {expandedCycles.has(cycle.id) && cycle.grade_levels && cycle.grade_levels.length > 0 && (
                      <div className="p-4 space-y-3 border-t">
                        {cycle.grade_levels.map((level, levelIndex) => (
                          <div key={level.id} className="border rounded-lg overflow-hidden">
                            <div 
                              className="flex items-center justify-between p-3 bg-white cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleLevelExpansion(level.id)}
                            >
                              <div className="flex items-center gap-3">
                                {expandedLevels.has(level.id) ? (
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-gray-500" />
                                )}
                                <h4 className="font-medium">{level.name}</h4>
                                <span className="text-sm text-gray-500">
                                  ({level.school_classes?.length || 0} classe{level.school_classes?.length !== 1 ? 's' : ''})
                                </span>
                              </div>
                              <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleMoveLevelUp(level.id, cycle.id, levelIndex)}
                                  disabled={levelIndex === 0}
                                  title="Monter"
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleMoveLevelDown(level.id, cycle.id, levelIndex)}
                                  disabled={levelIndex === cycle.grade_levels.length - 1}
                                  title="Descendre"
                                >
                                  <ChevronDownIcon className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openClassDialog(undefined, level.id)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Classe
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openLevelDialog(level)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeactivateLevel(level.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {expandedLevels.has(level.id) && level.school_classes && level.school_classes.length > 0 && (
                              <div className="p-3 space-y-2 border-t bg-gray-50">
                                {level.school_classes.map((classItem) => (
                                  <div key={classItem.id} className="flex items-center justify-between p-2 bg-white rounded border">
                                    <span className="font-medium">{classItem.name}</span>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => openClassDialog(classItem)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => handleDeactivateClass(classItem.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog pour les niveaux */}
        <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLevel ? "Modifier le niveau" : "Créer un nouveau niveau"}</DialogTitle>
              <DialogDescription>
                {editingLevel ? "Modifiez le nom du niveau scolaire." : "Créez un nouveau niveau scolaire (ex: 6ème, 2nde, Terminale)."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="levelName">Nom du niveau <span className="text-red-500">*</span></Label>
                <Input
                  id="levelName"
                  value={levelForm.name}
                  onChange={(e) => setLevelForm({ ...levelForm, name: e.target.value })}
                  placeholder="Ex: 6ème"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeAllDialogs}>Annuler</Button>
              <Button onClick={editingLevel ? handleUpdateLevel : handleCreateLevel}>
                {editingLevel ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog pour les classes */}
        <Dialog open={classDialogOpen} onOpenChange={setClassDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingClass ? "Modifier la classe" : "Créer une nouvelle classe"}</DialogTitle>
              <DialogDescription>
                {editingClass ? "Modifiez le nom de la classe." : "Créez une nouvelle classe (ex: 6ème A, 2nde B)."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="className">Nom de la classe <span className="text-red-500">*</span></Label>
                <Input
                  id="className"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="Ex: 6ème A"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeAllDialogs}>Annuler</Button>
              <Button onClick={editingClass ? handleUpdateClass : handleCreateClass}>
                {editingClass ? "Modifier" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
