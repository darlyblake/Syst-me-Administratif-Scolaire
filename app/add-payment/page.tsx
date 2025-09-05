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
import type { DonneesEleve } from "@/types/models"
import type { Paiement } from "@/types/models"

export default function AddPaymentPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const preSelectedStudentId = searchParams.get("student")

  const [students, setStudents] = useState<DonneesEleve[]>([])
  const [selectedStudent, setSelectedStudent] = useState<DonneesEleve | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [payments, setPayments] = useState<Paiement[]>([])

  const [formData, setFormData] = useState({
    amount: "",
    type: "scolarite" as "inscription" | "scolarite" | "tranche",
    method: "especes" as "especes" | "cheque" | "virement",
    reference: "",
    notes: "",
  })

  useEffect(() => {
    const savedStudents = serviceEleves.obtenirTousLesEleves()
    const savedPayments = servicePaiements.obtenirTousLesPaiements()
    setStudents(savedStudents)
    setPayments(savedPayments)

    if (preSelectedStudentId) {
      const student = savedStudents.find((s: DonneesEleve) => s.id === preSelectedStudentId)
      if (student) {
        setSelectedStudent(student)
      }
    }
  }, [preSelectedStudentId])

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

  const getPaymentStatus = (student: DonneesEleve) => {
    const studentPayments = payments.filter((p) => p.eleveId === student.id)
    const totalPaid = studentPayments.reduce((sum, p) => sum + p.montant, 0)
    const remaining = student.totalAPayer - totalPaid
    return { totalPaid, remaining }
  }



  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent) return

    const nouveauPaiement = servicePaiements.ajouterPaiement({
      eleveId: selectedStudent.id,
      montant: Number.parseFloat(formData.amount),
      datePaiement: new Date().toISOString(),
      typePaiement: formData.type === "tranche" ? "autre" : formData.type,
      methodePaiement: formData.method,
      description: formData.reference || formData.notes || undefined,
    })

    alert("Paiement enregistré avec succès !")
    router.push(`/payment-receipt?id=${nouveauPaiement.id}`)
  }

  const paymentStatus = selectedStudent ? getPaymentStatus(selectedStudent) : null

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
                          onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                          required
                          min="0"
                          step="1000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="type">Type de paiement *</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, type: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="inscription">Frais d'inscription</SelectItem>
                            <SelectItem value="scolarite">Frais de scolarité</SelectItem>
                            <SelectItem value="tranche">Paiement par tranche</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="method">Mode de paiement *</Label>
                        <Select
                          value={formData.method}
                          onValueChange={(value) => setFormData((prev) => ({ ...prev, method: value as any }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="especes">Espèces</SelectItem>
                            <SelectItem value="cheque">Chèque</SelectItem>
                            <SelectItem value="virement">Virement</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reference">Référence (optionnel)</Label>
                        <Input
                          id="reference"
                          value={formData.reference}
                          onChange={(e) => setFormData((prev) => ({ ...prev, reference: e.target.value }))}
                          placeholder="N° chèque, référence virement..."
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes (optionnel)</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                        placeholder="Commentaires sur le paiement..."
                        rows={3}
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
            {selectedStudent && paymentStatus && (
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Situation financière</CardTitle>
                  <CardDescription>État des paiements de l'élève</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Total à payer:</span>
                      <span className="font-medium">{selectedStudent.totalAPayer.toLocaleString()} FCFA</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Déjà payé:</span>
                      <span className="font-medium text-green-600">
                        {paymentStatus.totalPaid.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-sm font-medium">Reste à payer:</span>
                      <span className="font-bold text-red-600">{paymentStatus.remaining.toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="text-sm text-gray-600 mb-2">Progression</div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{
                          width: `${Math.min((paymentStatus.totalPaid / selectedStudent.totalAPayer) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {((paymentStatus.totalPaid / selectedStudent.totalAPayer) * 100).toFixed(1)}% payé
                    </div>
                  </div>

                  {formData.amount && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-800 mb-1">Après ce paiement:</div>
                      <div className="text-sm text-blue-700">
                        Reste: {(paymentStatus.remaining - Number.parseFloat(formData.amount || "0")).toLocaleString()}{" "}
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
