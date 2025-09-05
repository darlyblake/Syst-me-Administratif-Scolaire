"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Home, Users } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import type { DonneesEleve } from "@/types/models"

interface StudentData {
  id: string
  nom: string
  prenom: string
  dateNaissance: string
  lieuNaissance: string
  classe: string
  classeAncienne?: string
  nomParent: string
  contactParent: string
  adresse: string
  dateInscription: string
  typeInscription: "inscription" | "reinscription"
  fraisInscription: number
  fraisScolarite: number
  totalAPayer: number
  // Nouvelles propriétés pour le paiement détaillé
  modePaiement?: "mensuel" | "tranches"
  nombreTranches?: number
  moisPaiement?: string[]
  optionsSupplementaires?: {
    tenueScolaire: boolean
    carteScolaire: boolean
    cooperative: boolean
    tenueEPS: boolean
    assurance: boolean
  }
  fraisOptionsSupplementaires?: {
    tenueScolaire: number
    carteScolaire: number
    cooperative: number
    tenueEPS: number
    assurance: number
  }
  // Propriétés d'identification
  identifiant: string
  motDePasse: string
}

export default function ReceiptPage() {
  const searchParams = useSearchParams()
  const studentId = searchParams.get("id")
  const [student, setStudent] = useState<StudentData | null>(null)

  useEffect(() => {
    if (studentId) {
      const students = serviceEleves.obtenirTousLesEleves()
      const foundStudent = students.find((s: DonneesEleve) => s.id === studentId)
      setStudent(foundStudent as StudentData)
    }
  }, [studentId])

  const handlePrint = () => {
    window.print()
  }

  if (!student) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        {/* Actions - masquées à l'impression */}
        <div className="flex justify-between items-center mb-4 print:hidden">
          <h1 className="text-xl font-bold text-gray-900">Reçu d'inscription</h1>
          <div className="flex gap-2">
            <Button onClick={handlePrint} variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
            <Button asChild size="sm">
              <Link href="/students">
                <Users className="h-4 w-4 mr-2" />
                Liste des élèves
              </Link>
            </Button>
          </div>
        </div>

        {/* Reçu */}
        <div className="bg-white rounded-lg shadow-lg p-4 print:shadow-none print:rounded-none print:p-3">
          {/* En-tête */}
          <div className="text-center mb-3 border-b pb-3">
            <h1 className="text-lg font-bold mb-1">COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO</h1>
            <p className="text-xs text-gray-600">B.P: 16109 Estuaire - Tél: 077947410</p>
            <p className="text-xs text-gray-600">Libreville, Gabon</p>
          </div>

          {/* Titre du reçu */}
          <div className="text-center mb-3">
            <h2 className="text-base font-bold text-blue-600 mb-1">REÇU D'INSCRIPTION N° {student.id}</h2>
            <p className="text-xs text-gray-600">
              {student.typeInscription === "inscription" ? "NOUVELLE INSCRIPTION" : "RÉINSCRIPTION"}
            </p>
            <p className="text-xs text-gray-500">Date: {student.dateInscription}</p>
          </div>

          {/* Informations élève */}
          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <h3 className="font-bold text-gray-800 mb-1 border-b pb-0.5 text-sm">INFORMATIONS ÉLÈVE</h3>
              <div className="space-y-0.5 text-xs">
                <div className="flex">
                  <span className="font-medium w-20">Nom:</span>
                  <span>{student.nom.toUpperCase()}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-20">Prénom:</span>
                  <span>{student.prenom}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-20">Date naissance:</span>
                  <span>{student.dateNaissance}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-20">Lieu naissance:</span>
                  <span>{student.lieuNaissance}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-20">Classe:</span>
                  <span className="font-bold text-blue-600">{student.classe}</span>
                </div>
                {student.classeAncienne && (
                  <div className="flex">
                    <span className="font-medium w-20">Ancienne classe:</span>
                    <span>{student.classeAncienne}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-1 border-b pb-0.5 text-sm">INFORMATIONS PARENT/TUTEUR</h3>
              <div className="space-y-0.5 text-xs">
                <div className="flex">
                  <span className="font-medium w-20">Nom:</span>
                  <span>{student.nomParent}</span>
                </div>
                <div className="flex">
                  <span className="font-medium w-20">Contact:</span>
                  <span>{student.contactParent}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-xs">Adresse:</span>
                  <span className="mt-0.5">{student.adresse}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Détail des frais */}
          <div className="mb-3">
            <h3 className="font-bold text-gray-800 mb-1 border-b pb-0.5 text-sm">DÉTAIL DES FRAIS</h3>
            <div className="bg-gray-50 p-2 rounded">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Frais d'inscription:</span>
                  <span className="font-medium">{student.fraisInscription.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span>Frais de scolarité annuelle:</span>
                  <span className="font-medium">{student.fraisScolarite.toLocaleString()} FCFA</span>
                </div>

                {/* Options supplémentaires */}
                {student.optionsSupplementaires && Object.entries(student.optionsSupplementaires).some(([_, selected]) => selected) && (
                  <div className="border-t pt-0.5">
                    <h4 className="font-medium text-gray-900 mb-0.5 text-xs">Options supplémentaires:</h4>
                    <div className="space-y-0.5">
                      {Object.entries(student.optionsSupplementaires).map(([option, selected]) => {
                        if (!selected) return null
                        const optionLabels: { [key: string]: string } = {
                          tenueScolaire: "Tenue scolaire",
                          carteScolaire: "Carte scolaire",
                          cooperative: "Coopérative",
                          tenueEPS: "Tenue EPS",
                          assurance: "Assurance"
                        }
                        const prix = student.fraisOptionsSupplementaires ? student.fraisOptionsSupplementaires[option as keyof typeof student.fraisOptionsSupplementaires] : 0
                        return (
                          <div key={option} className="flex justify-between text-xs">
                            <span>{optionLabels[option]}</span>
                            <span>{prix.toLocaleString()} FCFA</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="border-t pt-1">
                  <div className="flex justify-between text-sm font-bold">
                    <span>TOTAL À PAYER:</span>
                    <span className="text-blue-600">{student.totalAPayer.toLocaleString()} FCFA</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modalités de paiement */}
          <div className="mb-3">
            <h3 className="font-bold text-gray-800 mb-1 border-b pb-0.5">MODALITÉS DE PAIEMENT</h3>
            <div className="bg-gray-50 p-2 rounded">
              <div className="text-sm space-y-1">
                {student.modePaiement === "mensuel" && student.moisPaiement && student.moisPaiement.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-3">Mode de paiement: Mensuel</p>
                    <div className="space-y-2">
                      <p className="font-medium">Détail des paiements mensuels:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {student.moisPaiement.map((mois, index) => {
                          const fraisParMois = student.fraisScolarite > 0 && student.moisPaiement ? Math.ceil(student.fraisScolarite / student.moisPaiement.length) : 0
                          return (
                            <div key={index} className="bg-blue-100 text-blue-800 px-3 py-2 rounded text-xs flex justify-between">
                              <span>{mois}:</span>
                              <span className="font-medium">{fraisParMois.toLocaleString()} FCFA</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 pt-2 border-t">
                        <div className="flex justify-between font-medium">
                          <span>Total payé:</span>
                          <span>{student.fraisScolarite.toLocaleString()} FCFA</span>
                        </div>
                        <p className="text-gray-600 mt-1">
                          Nombre de mois payés: {student.moisPaiement?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {student.modePaiement === "tranches" && student.moisPaiement && student.moisPaiement.length > 0 && (
                  <div>
                    <p className="font-medium text-gray-900 mb-3">Mode de paiement: Par tranches</p>
                    <div className="space-y-2">
                      <p className="font-medium">Détail des tranches payées:</p>
                      <div className="space-y-2">
                        {student.moisPaiement.map((tranche, index) => {
                          const nombreTranches = student.nombreTranches || 3
                          const fraisParTranche = student.fraisScolarite > 0 ? Math.ceil(student.fraisScolarite / nombreTranches) : 0
                          return (
                            <div key={index} className="bg-green-100 text-green-800 px-3 py-2 rounded text-xs flex justify-between">
                              <span>{tranche}:</span>
                              <span className="font-medium">{fraisParTranche.toLocaleString()} FCFA</span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="mt-3 pt-2 border-t">
                        <div className="flex justify-between font-medium">
                          <span>Total payé:</span>
                          <span>{student.fraisScolarite.toLocaleString()} FCFA</span>
                        </div>
                        <p className="text-gray-600 mt-1">
                          Nombre de tranches: {student.nombreTranches || 3} | Tranches payées: {student.moisPaiement?.length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!student.modePaiement && (
                  <div>
                    <p>• Paiement possible en 3 tranches (Octobre, Janvier, Avril)</p>
                    <p>• Paiement mensuel accepté (10 mois)</p>
                  </div>
                )}

                <div className="border-t pt-3 mt-3">
                  <p>• Remise de 5% pour paiement comptant</p>
                  <p>• Frais d'inscription à régler obligatoirement à l'inscription</p>
                </div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Signature du parent/tuteur:</p>
              <div className="w-32 h-12 border-b border-gray-400"></div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-2">L'Administration</p>
              <div className="w-32 h-12 border-b border-gray-400"></div>
              <p className="text-xs text-gray-500 mt-1">Cachet et signature</p>
            </div>
          </div>

          {/* Informations de connexion */}
          <div className="mb-3">
            <h3 className="font-bold text-gray-800 mb-1 border-b pb-0.5 text-sm">INFORMATIONS DE CONNEXION</h3>
            <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
              <div className="text-xs space-y-1">
                <p className="font-medium text-gray-900 text-xs">Identifiants générés automatiquement:</p>
                <div className="flex justify-center">
                  <div className="bg-white p-2 rounded border flex flex-col items-center">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Identifiant:${student.identifiant}%0AMot de passe:${student.motDePasse}`}
                      alt="QR Code des identifiants"
                      className="w-20 h-20"
                    />
                    <p className="text-xs text-gray-600 mt-1 text-center">Scannez le QR code pour obtenir vos identifiants</p>
                  </div>
                </div>
                <div className="mt-1 p-1 bg-blue-50 rounded">
                  <p className="text-blue-800 text-xs text-center">
                    <strong>Important:</strong> Conservez ce reçu, il contient vos identifiants d'accès aux plateformes de l'établissement.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mentions légales */}
          <div className="mt-4 pt-2 border-t text-xs text-gray-500 text-center">
            <p>Ce reçu fait foi d'inscription pour l'année académique 2024-2025</p>
            <p>Conservez précieusement ce document</p>
          </div>
        </div>

        {/* Actions après impression */}
        <div className="mt-4 flex justify-center gap-4 print:hidden">
          <Button variant="outline" asChild>
            <Link href="/">
              <Home className="h-4 w-4 mr-2" />
              Retour à l'accueil
            </Link>
          </Button>
          <Button asChild>
            <Link href="/students">
              <Users className="h-4 w-4 mr-2" />
              Voir tous les élèves
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
