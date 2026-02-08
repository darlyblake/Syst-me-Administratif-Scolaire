"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { serviceEnseignants } from "@/services/enseignants.service"
import { serviceClasses } from "@/services/classes.service"
import type { DonneesEnseignant } from "@/types/models"
import { CheckCircle, X, Plus, Trash2 } from "lucide-react"

interface AssignerClassesModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess?: () => void
}

export function AssignerClassesModal({ isOpen, onClose, enseignant, onSuccess }: AssignerClassesModalProps) {
  const [classesDisponibles, setClassesDisponibles] = useState<string[]>([])
  const [classesSelectionnees, setClassesSelectionnees] = useState<string[]>([])
  const [nouvelleClasse, setNouvelleClasse] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (enseignant && isOpen) {
      setClassesSelectionnees([...enseignant.classes])
      chargerClassesDisponibles()
    }
  }, [enseignant, isOpen])

  const chargerClassesDisponibles = () => {
    // Simulation des classes disponibles - à remplacer par un service réel
    const classes = [
      "6ème A", "6ème B", "5ème A", "5ème B", "4ème A", "4ème B",
      "3ème A", "3ème B", "2nde A", "2nde B", "1ère A", "1ère B",
      "Terminale A", "Terminale B", "Terminale C"
    ]
    setClassesDisponibles(classes)
  }

  const handleClasseToggle = (classe: string) => {
    setClassesSelectionnees(prev =>
      prev.includes(classe)
        ? prev.filter(c => c !== classe)
        : [...prev, classe]
    )
  }

  const ajouterNouvelleClasse = () => {
    if (nouvelleClasse.trim() && !classesDisponibles.includes(nouvelleClasse.trim())) {
      setClassesDisponibles(prev => [...prev, nouvelleClasse.trim()])
      setClassesSelectionnees(prev => [...prev, nouvelleClasse.trim()])
      setNouvelleClasse("")
    }
  }

  const supprimerClasse = (classe: string) => {
    setClassesDisponibles(prev => prev.filter(c => c !== classe))
    setClassesSelectionnees(prev => prev.filter(c => c !== classe))
  }

  const handleSubmit = async () => {
    if (!enseignant) return

    setLoading(true)
    try {
      // Assigner les classes à l'enseignant
      const success = serviceEnseignants.assignerClasses(enseignant.id, classesSelectionnees)

      if (success) {
        // Enregistrer dans l'historique
        const anciennesClasses = enseignant.classes
        const nouvellesClasses = classesSelectionnees

        // Enregistrer les changements dans l'historique
        for (const classe of nouvellesClasses) {
          if (!anciennesClasses.includes(classe)) {
            await serviceEnseignants.enregistrerAffectationHistorique({
              enseignantId: enseignant.id,
              type: "classe",
              ancienneValeur: "",
              nouvelleValeur: classe,
              motif: "Assignation de classe"
            })
          }
        }

        for (const classe of anciennesClasses) {
          if (!nouvellesClasses.includes(classe)) {
            await serviceEnseignants.enregistrerAffectationHistorique({
              enseignantId: enseignant.id,
              type: "classe",
              ancienneValeur: classe,
              nouvelleValeur: "",
              motif: "Retrait de classe"
            })
          }
        }

        setSuccess(true)
        onSuccess?.()

        setTimeout(() => {
          setSuccess(false)
          onClose()
        }, 2000)
      }
    } catch (error) {
      console.error("Erreur lors de l'assignation des classes:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setClassesSelectionnees([])
    setNouvelleClasse("")
    setSuccess(false)
    onClose()
  }

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Assigner des classes
            <Badge variant="secondary">{enseignant.prenom} {enseignant.nom}</Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Classes actuellement assignées */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Classes actuellement assignées ({classesSelectionnees.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classesSelectionnees.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune classe assignée</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {classesSelectionnees.map((classe) => (
                    <Badge key={classe} variant="default" className="flex items-center gap-1">
                      {classe}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-600"
                        onClick={() => handleClasseToggle(classe)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ajouter une nouvelle classe */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ajouter une nouvelle classe</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Nom de la nouvelle classe"
                  value={nouvelleClasse}
                  onChange={(e) => setNouvelleClasse(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && ajouterNouvelleClasse()}
                />
                <Button onClick={ajouterNouvelleClasse} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Classes disponibles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Classes disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto">
                {classesDisponibles.map((classe) => (
                  <div key={classe} className="flex items-center space-x-2">
                    <Checkbox
                      id={classe}
                      checked={classesSelectionnees.includes(classe)}
                      onCheckedChange={() => handleClasseToggle(classe)}
                    />
                    <Label htmlFor={classe} className="text-sm font-normal cursor-pointer">
                      {classe}
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => supprimerClasse(classe)}
                      className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading || classesSelectionnees.length === 0}>
            {loading ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>

        {/* Message de succès */}
        {success && (
          <div className="absolute inset-0 bg-green-50 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-800 mb-2">
                Classes assignées avec succès !
              </h3>
              <p className="text-green-600">
                {classesSelectionnees.length} classe(s) assignée(s) à {enseignant.prenom} {enseignant.nom}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
