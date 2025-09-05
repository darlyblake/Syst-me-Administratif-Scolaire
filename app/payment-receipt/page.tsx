"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Home, CreditCard } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import type { DonneesEleve } from "@/types/models"
import type { Paiement } from "@/types/models"

export default function PaymentReceiptPage() {
  const searchParams = useSearchParams()
  const paymentId = searchParams.get("id")
  const [payment, setPayment] = useState<Paiement | null>(null)
  const [student, setStudent] = useState<DonneesEleve | null>(null)

  useEffect(() => {
    if (paymentId) {
      const payments = servicePaiements.obtenirTousLesPaiements()
      const students = serviceEleves.obtenirTousLesEleves()

      const foundPayment = payments.find((p: Paiement) => p.id === paymentId)
      if (foundPayment) {
        setPayment(foundPayment)
        const foundStudent = students.find((s: DonneesEleve) => s.id === foundPayment.eleveId)
        setStudent(foundStudent || null)
      }
    }
  }, [paymentId])

  const handlePrint = () => {
    window.print()
  }

  if (!payment || !student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">Chargement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "inscription":
        return "Frais d'inscription"
      case "scolarite":
        return "Frais de scolarité"
      case "tranche":
        return "Paiement par tranche"
      default:
        return type
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "especes":
        return "Espèces"
      case "cheque":
        return "Chèque"
      case "virement":
        return "Virement bancaire"
      default:
        return method
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        {/* Actions - masquées à l'impression */}
        <div className="flex justify-between items-center mb-6 print:hidden">
          <h1 className="text-2xl font-bold text-gray-900">Reçu de paiement</h1>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button asChild>
              <Link href="/payments">
                <CreditCard className="h-4 w-4 mr-2" />
                Retour aux paiements
              </Link>
            </Button>
          </div>
        </div>

        {/* Reçu */}
        <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:rounded-none">
          {/* En-tête */}
          <div className="text-center mb-8 border-b pb-6">
            <h1 className="text-2xl font-bold mb-2">COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO</h1>
            <p className="text-gray-600">B.P: 16109 Estuaire - Tél: 077947410</p>
            <p className="text-gray-600">Libreville, Gabon</p>
          </div>

          {/* Titre du reçu */}
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-green-600 mb-2">REÇU DE PAIEMENT N° {payment.id}</h2>
            <p className="text-gray-600">Date: {new Date(payment.datePaiement).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Informations */}
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">INFORMATIONS ÉLÈVE</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium w-32">Nom:</span>
                  <span>{student.nom.toUpperCase()}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Prénom:</span>
                  <span>{student.prenom}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">ID Élève:</span>
                  <span>{student.id}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Classe:</span>
                  <span className="font-bold text-blue-600">{student.classe}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Parent:</span>
                  <span>{student.nomParent}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-4 border-b pb-2">DÉTAILS DU PAIEMENT</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="font-medium w-32">Type:</span>
                  <span>{getTypeLabel(payment.typePaiement)}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-32">Mode:</span>
                  <span>{getMethodLabel(payment.methodePaiement)}</span>
                </div>
                {payment.description && (
                  <div className="flex">
                    <span className="font-medium w-32">Référence:</span>
                    <span>{payment.description}</span>
                  </div>
                )}
                <div className="flex">
                  <span className="font-medium w-32">Date:</span>
                  <span>{new Date(payment.datePaiement).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Montant */}
          <div className="mb-8">
            <div className="bg-green-50 p-6 rounded-lg border-2 border-green-200">
              <div className="text-center">
                <div className="text-sm text-green-700 mb-2">MONTANT PAYÉ</div>
                <div className="text-4xl font-bold text-green-800">{payment.montant.toLocaleString()} FCFA</div>
                <div className="text-sm text-green-600 mt-2">
                  {new Intl.NumberFormat("fr-FR", {
                    style: "currency",
                    currency: "XAF",
                    minimumFractionDigits: 0,
                  })
                    .format(payment.montant)
                    .replace("XAF", "francs CFA")}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {payment.description && (
            <div className="mb-8">
              <h3 className="font-bold text-gray-800 mb-2">Notes:</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{payment.description}</p>
            </div>
          )}

          {/* Signature */}
          <div className="flex justify-between items-end">
            <div>
              <p className="text-sm text-gray-600 mb-4">Signature du parent/tuteur:</p>
              <div className="w-40 h-16 border-b border-gray-400"></div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-4">L'Administration</p>
              <div className="w-40 h-16 border-b border-gray-400"></div>
              <p className="text-xs text-gray-500 mt-2">Cachet et signature</p>
            </div>
          </div>

          {/* Mentions légales */}
          <div className="mt-8 pt-4 border-t text-xs text-gray-500 text-center">
            <p>Ce reçu fait foi de paiement - Conservez précieusement ce document</p>
            <p>
              Paiement reçu le {new Date(payment.datePaiement).toLocaleDateString('fr-FR')} - Reçu N° {payment.id}
            </p>
          </div>
        </div>

        {/* Actions après impression */}
        <div className="mt-6 flex justify-center gap-4 print:hidden">
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button asChild>
            <Link href="/payments">
              <CreditCard className="h-4 w-4 mr-2" />
              Gestion des paiements
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
