"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calculator, Clock, DollarSign, AlertCircle } from "lucide-react"
import { serviceEnseignants } from "@/services/enseignants.service"
import type { DonneesEnseignant } from "@/types/models"

interface GestionSalairesModalProps {
  isOpen: boolean
  onClose: () => void
  enseignant: DonneesEnseignant | null
  onSuccess: () => void
}

export function GestionSalairesModal({ isOpen, onClose, enseignant, onSuccess }: GestionSalairesModalProps) {
  const [loading, setLoading] = useState(false)
  const [typeContrat, setTypeContrat] = useState<"cdi" | "cdd" | "vacataire" | "consultant">("cdi")
  const [salaireFixe, setSalaireFixe] = useState("")
  const [tauxHoraire, setTauxHoraire] = useState("")
  const [heuresTravaillees, setHeuresTravaillees] = useState(0)
  const [calculSalaire, setCalculSalaire] = useState<{
    salaireBase: number
    heuresTravaillees: number
    typeContrat: string
    details: string
  } | null>(null)

  // Charger les informations actuelles de l'enseignant
  useEffect(() => {
    if (enseignant && isOpen) {
      setTypeContrat(enseignant.typeContrat || "cdi")
      setSalaireFixe(enseignant.salaireMensuel?.toString() || "")
      setTauxHoraire(enseignant.tauxHoraire?.toString() || "")

      // Calculer les heures travaillées depuis l'emploi du temps
      const heures = serviceEnseignants.calculerHeuresEnseignement(enseignant.id)
      setHeuresTravaillees(heures)

      // Calculer le salaire actuel
      const calcul = serviceEnseignants.calculerSalaireEnseignant(enseignant.id)
      setCalculSalaire(calcul)
    }
  }, [enseignant, isOpen])

  const calculerSalaire = () => {
    if (!enseignant) return

    let salaireBase = 0
    let details = ""

    if (typeContrat === "vacataire") {
      const taux = parseFloat(tauxHoraire) || 0
      salaireBase = heuresTravaillees * taux
      details = `${heuresTravaillees}h × ${taux}€/h = ${salaireBase.toFixed(2)}€`
    } else if (typeContrat === "cdi") {
      salaireBase = parseFloat(salaireFixe) || 0
      details = `Salaire fixe: ${salaireBase.toFixed(2)}€`
    }

    setCalculSalaire({
      salaireBase,
      heuresTravaillees,
      typeContrat,
      details
    })
  }

  const sauvegarderModifications = async () => {
    if (!enseignant) return

    setLoading(true)
    try {
      const succes = serviceEnseignants.mettreAJourInformationsSalariales(enseignant.id, {
        typeContrat,
        salaireMensuel: typeContrat === "cdi" ? parseFloat(salaireFixe) : undefined,
        tauxHoraire: typeContrat === "vacataire" ? parseFloat(tauxHoraire) : undefined,
      })

      if (succes) {
        onSuccess()
        onClose()
      } else {
        alert("Erreur lors de la mise à jour des informations salariales")
      }
    } catch (error) {
      console.error("Erreur:", error)
      alert("Une erreur est survenue")
    } finally {
      setLoading(false)
    }
  }

  if (!enseignant) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Gestion des salaires - {enseignant.prenom} {enseignant.nom}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations actuelles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations actuelles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-500">Type de contrat</Label>
                  <p className="text-gray-900 capitalize">{enseignant.typeContrat || "Non défini"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-500">Heures travaillées (ce mois)</Label>
                  <p className="text-gray-900">{heuresTravaillees}h</p>
                </div>
              </div>
              {calculSalaire && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Salaire actuel</span>
                  </div>
                  <p className="text-blue-800 font-semibold">{calculSalaire.salaireBase.toFixed(2)}€</p>
                  <p className="text-blue-600 text-sm">{calculSalaire.details}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configuration du salaire */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Configuration du salaire</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="typeContrat">Type de contrat</Label>
                <Select value={typeContrat} onValueChange={(value: any) => setTypeContrat(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cdi">CDI - Contrat à durée indéterminée</SelectItem>
                    <SelectItem value="cdd">CDD - Contrat à durée déterminée</SelectItem>
                    <SelectItem value="vacataire">Vacataire - Paiement horaire</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {typeContrat === "cdi" && (
                <div>
                  <Label htmlFor="salaireFixe">Salaire mensuel fixe (FCFA)</Label>
                  <Input
                    id="salaireFixe"
                    type="number"
                    value={salaireFixe}
                    onChange={(e) => setSalaireFixe(e.target.value)}
                    placeholder="ex: 150000"
                  />
                </div>
              )}

              {typeContrat === "vacataire" && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="tauxHoraire">Taux horaire (FCFA)</Label>
                    <Input
                      id="tauxHoraire"
                      type="number"
                      value={tauxHoraire}
                      onChange={(e) => setTauxHoraire(e.target.value)}
                      placeholder="ex: 5000"
                    />
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-600" />
                      <span className="font-medium text-gray-900">Heures travaillées ce mois</span>
                    </div>
                    <p className="text-gray-800 font-semibold">{heuresTravaillees} heures</p>
                    <p className="text-gray-600 text-sm">Calculé automatiquement depuis l'emploi du temps</p>
                  </div>
                </div>
              )}

              <Button
                onClick={calculerSalaire}
                variant="outline"
                className="w-full"
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calculer le salaire
              </Button>

              {calculSalaire && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Aperçu du salaire</span>
                  </div>
                  <p className="text-green-800 font-bold text-lg">{calculSalaire.salaireBase.toFixed(2)} FCFA</p>
                  <p className="text-green-700 text-sm">{calculSalaire.details}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertes et informations */}
          <div className="flex items-start gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Information importante</p>
              <p className="text-yellow-700 text-sm">
                Les modifications salariales seront enregistrées dans l'historique des affectations.
                Pour les contrats vacataires, les heures sont calculées automatiquement depuis l'emploi du temps.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={sauvegarderModifications} disabled={loading}>
            {loading ? "Enregistrement..." : "Sauvegarder les modifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
