"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, CreditCard, Search } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import type { EleveAvecSuivi } from "@/types/models"
import { serviceFinances } from "@/services/finances.service"

export default function AddPaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const preSelectedStudentId = searchParams.get("student")

  const [students, setStudents] = useState<EleveAvecSuivi[]>([])
  const [selectedStudent, setSelectedStudent] = useState<EleveAvecSuivi | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  const [formData, setFormData] = useState({
    amount: "",
    notes: "",
    itemsToPay: [] as string[], // ex: ["Septembre", "Tranche 2", "Option: Cantine"]
  })

  useEffect(() => {
    const savedStudents = serviceEleves.obtenirElevesAvecSuiviFinancier()
    setStudents(savedStudents)

    if (preSelectedStudentId) {
      const student = savedStudents.find((s) => s.id === preSelectedStudentId)
      if (student) {
        setSelectedStudent(student)
      }
    }
  }, [preSelectedStudentId])

  // Mettre à jour le montant automatiquement quand les items à payer changent
  useEffect(() => {
    if (!selectedStudent) return;

    // La logique de calcul est maintenant entièrement dans le service finances
    const total = serviceFinances.calculerMontantPourItems(
      selectedStudent,
      formData.itemsToPay
    );

    setFormData(prev => ({ ...prev, amount: total > 0 ? total.toString() : "" }));

  }, [formData.itemsToPay, selectedStudent]);

  const searchStudent = () => {
    const found = students.find(
      (s) =>
        s.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    if (found) {
      setSelectedStudent(found)
      setSearchTerm("")
    } else {
      alert("Élève non trouvé")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    const amount = Number.parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert("Le montant est invalide.");
      return;
    }

    // On crée un paiement par item pour un meilleur suivi
    const nouveauxPaiements = formData.itemsToPay.map(item => {
      const { montantItem, typePaiement, description } = serviceFinances.creerDetailPaiementPourItem(
        selectedStudent!,
        item
      );

      return servicePaiements.ajouterPaiement({
        eleveId: selectedStudent.id,
        montant: montantItem,
        datePaiement: new Date().toISOString(),
        typePaiement: typePaiement,
        methodePaiement: "especes", // Mode de paiement par défaut
        description: description,
        moisPaiement: item.startsWith("Option:") || item.startsWith("Tranche") ? [] : [item],
      });
    });

    // Pour la redirection, on prend le premier reçu généré
    const nouveauPaiement = nouveauxPaiements[0];

    alert("Paiement enregistré avec succès !")
    router.push(`/payment-receipt?id=${nouveauPaiement.id}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/payments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Enregistrer un paiement</h1>
            <p className="text-gray-600">Ajouter un nouveau paiement pour un élève</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulaire */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Détails du paiement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Sélection élève */}
                {!selectedStudent && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Label className="text-base font-medium mb-2 block">Rechercher l'élève</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nom, prénom ou ID de l'élève..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && searchStudent()}
                      />
                      <Button onClick={searchStudent}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {selectedStudent && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-green-800">
                          {selectedStudent.prenom} {selectedStudent.nom}
                        </div>
                        <div className="text-sm text-green-600">
                          {selectedStudent.classe} • ID: {selectedStudent.id}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedStudent(null)}
                        className="text-green-600"
                      >
                        Changer
                      </Button>
                    </div>
                  </div>
                )}

                {selectedStudent && (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="amount">Montant (FCFA) *</Label>
                        <Input
                          id="amount"
                          type="number"
                          value={formData.amount}
                          readOnly // Le montant est calculé automatiquement
                          onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                          required
                          min="0"
                          step="1000"
                        />
                      </div>
                    </div>

                    {/* Items à payer */}
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium text-gray-900">Éléments à payer</h3>
                      <p className="text-sm text-gray-600">Cochez les éléments que vous souhaitez régler maintenant.</p>

                      {/* Mois restants */}
                      {selectedStudent.modePaiement === 'mensuel' && (
                        <div className="space-y-2 animate-in fade-in">
                          <Label>Mois de scolarité restants</Label>
                          <div className="grid grid-cols-3 gap-2">
                            {selectedStudent.moisRestants.map(mois => (
                              <div key={mois} className="flex items-center space-x-2 p-2 border rounded-md">
                                <input type="checkbox" id={mois} checked={formData.itemsToPay.includes(mois)} onChange={e => {
                                  const newItems = e.target.checked ? [...formData.itemsToPay, mois] : formData.itemsToPay.filter(i => i !== mois);
                                  setFormData(prev => ({ ...prev, itemsToPay: newItems }));
                                }} />
                                <Label htmlFor={mois} className="text-sm">{mois}</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tranches restantes */}
                      {selectedStudent.modePaiement === 'tranches' && (
                        <div className="space-y-2 animate-in fade-in">
                          <Label>Tranches de scolarité restantes</Label>
                          <div className="space-y-2">
                            {selectedStudent.tranchesRestantes.map(tranche => (
                              <div key={tranche.numero} className="flex items-center space-x-2 p-2 border rounded-md">
                                <input type="checkbox" id={`tranche-${tranche.numero}`} checked={formData.itemsToPay.includes(`Tranche ${tranche.numero}`)} onChange={e => {
                                  const item = `Tranche ${tranche.numero}`;
                                  const newItems = e.target.checked ? [...formData.itemsToPay, item] : formData.itemsToPay.filter(i => i !== item);
                                  setFormData(prev => ({ ...prev, itemsToPay: newItems }));
                                }} />
                                <Label htmlFor={`tranche-${tranche.numero}`} className="text-sm">{tranche.nom} ({tranche.pourcentage}%)</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Options restantes */}
                      {selectedStudent.optionsRestantes.length > 0 && (
                        <div className="space-y-2">
                          <Label>Options supplémentaires non payées</Label>
                          <div className="space-y-2">
                            {selectedStudent.optionsRestantes.map(option => (
                              <div key={option.nom} className="flex items-center space-x-2 p-2 border rounded-md">
                                <input type="checkbox" id={option.nom} checked={formData.itemsToPay.includes(`Option: ${option.nom}`)} onChange={e => {
                                  const item = `Option: ${option.nom}`;
                                  const newItems = e.target.checked ? [...formData.itemsToPay, item] : formData.itemsToPay.filter(i => i !== item);
                                  setFormData(prev => ({ ...prev, itemsToPay: newItems }));
                                }} />
                                <Label htmlFor={option.nom} className="text-sm">{option.nom} ({option.prix.toLocaleString()} FCFA)</Label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {selectedStudent.moisRestants.length === 0 && selectedStudent.tranchesRestantes.length === 0 && selectedStudent.optionsRestantes.length === 0 && (
                        <p className="text-center text-green-600 bg-green-50 p-4 rounded-md">
                          Félicitations ! Cet élève est à jour de tous ses paiements.
                        </p>
                      )}

                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optionnel)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Commentaires sur le paiement..."
                        rows={2}
                        />
                    </div>

                    <Button type="submit" className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer le paiement
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Récapitulatif */}
          <div className="lg:col-span-1">
            {selectedStudent && (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Situation financière</CardTitle>
                  <CardDescription>État des paiements de l'élève</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total dû (global):</span>
                      <span className="font-medium">
                        {selectedStudent.detteTotaleGlobale.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Déjà payé:</span>
                      <span className="font-medium text-green-600">
                        {selectedStudent.totalPayeGlobal.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium">Solde restant:</span>
                      <span className="font-bold text-red-600">{selectedStudent.resteAPayerGlobal.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">Progression</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${selectedStudent.pourcentagePaye}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {selectedStudent.pourcentagePaye.toFixed(1)}% de la scolarité payé
                    </div>
                  </div>

                  {formData.amount && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-1">Après ce paiement:</div>
                      <div className="text-sm text-blue-700">
                        Reste: {(selectedStudent.resteAPayerGlobal - Number.parseFloat(formData.amount || "0")).toLocaleString()}{" "}
                        FCFA
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {!selectedStudent && (
              <Card className="sticky top-4">
                <CardContent className="pt-6">
                  <div className="text-center text-gray-500 py-8">
                    <CreditCard className="mx-auto h-12 w-12 mb-4 opacity-50" />
                    <p>Sélectionnez un élève pour voir sa situation financière</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
