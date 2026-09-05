"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Calendar, Plus, Edit, Trash2, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { createAcademicYear, activateAcademicYear, closeAcademicYear } from "@/lib/supabase/services/academic-year.service"

export default function AcademicYearsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId
  const { data: academicYears, activeYear, isLoading, error, refresh } = useAcademicYears(establishmentId ?? null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingYear, setEditingYear] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: ""
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleOpenDialog = (year?: any) => {
    if (year) {
      setEditingYear(year)
      setFormData({
        name: year.name,
        start_date: year.start_date?.split("T")[0] || "",
        end_date: year.end_date?.split("T")[0] || ""
      })
    } else {
      setEditingYear(null)
      setFormData({
        name: "",
        start_date: "",
        end_date: ""
      })
    }
    setSaveError(null)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingYear(null)
    setFormData({ name: "", start_date: "", end_date: "" })
    setSaveError(null)
  }

  const handleSave = async () => {
    if (!establishmentId) {
      setSaveError("Établissement non identifié")
      return
    }

    if (!formData.name || !formData.start_date || !formData.end_date) {
      setSaveError("Veuillez remplir tous les champs")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      await createAcademicYear({
        establishment_id: establishmentId,
        name: formData.name,
        start_date: formData.start_date,
        end_date: formData.end_date,
        is_active: false
      })
      await refresh()
      handleCloseDialog()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur lors de la création de l'année académique")
    } finally {
      setIsSaving(false)
    }
  }

  const handleActivate = async (yearId: string) => {
    if (!confirm("Voulez-vous vraiment activer cette année académique ?")) return

    try {
      await activateAcademicYear(yearId)
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'activation")
    }
  }

  const handleClose = async (yearId: string) => {
    if (!confirm("Voulez-vous vraiment clôturer cette année académique ?")) return

    try {
      await closeAcademicYear(yearId)
      await refresh()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de la clôture")
    }
  }

  if (!establishmentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Accès non autorisé</CardTitle>
            <CardDescription>Impossible d'identifier l'établissement.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Veuillez vous reconnecter ou contacter l'administrateur.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" asChild>
              <Link href="/ecole/settings">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Années académiques</h1>
              <p className="text-sm text-gray-600">Gérez les années scolaires de votre établissement</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle année
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingYear ? "Modifier l'année" : "Nouvelle année académique"}</DialogTitle>
                <DialogDescription>
                  {editingYear ? "Modifiez les informations de l'année académique." : "Créez une nouvelle année académique."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'année</Label>
                  <Input
                    id="name"
                    placeholder="Ex: 2026-2027"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="start_date">Date de début</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Date de fin</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
                {saveError && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {saveError}
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseDialog}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Enregistrement..." : "Enregistrer"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Erreur de chargement : {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-500">Chargement...</div>
          </div>
        ) : academicYears.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune année académique</h3>
              <p className="text-gray-500 mb-4">Créez votre première année académique pour commencer.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Créer une année
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {academicYears.map((year) => (
              <Card key={year.id} className={year.is_active ? "border-blue-200 bg-blue-50" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">{year.name}</h3>
                        {year.is_active && (
                          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {year.start_date ? new Date(year.start_date).toLocaleDateString('fr-FR') : '—'} - {year.end_date ? new Date(year.end_date).toLocaleDateString('fr-FR') : '—'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!year.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(year.id)}
                        >
                          Activer
                        </Button>
                      )}
                      {year.is_active && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleClose(year.id)}
                        >
                          Clôturer
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
