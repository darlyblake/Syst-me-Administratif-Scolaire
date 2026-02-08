"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Printer, Home, Users } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { serviceParametres } from "@/services/parametres.service"
import type { DonneesEleve } from "@/types/models"
import type {  OptionsSupplementaires, OptionSupplementaire } from "@/services/parametres.service"

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
  const [schoolParams, setSchoolParams] = useState<ParametresEcole | null>(null)
  const [standardOptions, setStandardOptions] = useState<OptionsSupplementaires | null>(null)
  const [customOptions, setCustomOptions] = useState<OptionSupplementaire[]>([])

  useEffect(() => {
    if (studentId) {
      const students = serviceEleves.obtenirTousLesEleves()
      const foundStudent = students.find((s: DonneesEleve) => s.id === studentId)
      setStudent(foundStudent as StudentData)
    }
    // Fetch school parameters
    const params = serviceParametres.obtenirParametres()
    setSchoolParams(params)

    // Fetch all options
    const standardOpts = serviceParametres.obtenirOptionsSupplementaires()
    setStandardOptions(standardOpts)

    const customOpts = serviceParametres.obtenirOptionsSupplementairesPersonnalisees()
    setCustomOptions(customOpts)
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
        <div className="bg-white rounded-lg shadow-lg p-4 print:shadow-none print:rounded-none print:p-6 print:m-4">
          {/* En-tête avec logo */}
          <div className="text-center mb-6 border-b-2 border-gray-300 pb-4">
              <div className="flex justify-center items-center mb-3">
              {/* Logo de l'école */}
              {schoolParams?.logoUrl ? (
                <img
                  src={schoolParams.logoUrl}
                  alt="Logo de l'école"
                  className="w-16 h-16 border-2 border-gray-200 rounded-full mr-4 print:w-20 print:h-20 object-contain"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 border-2 border-gray-200 rounded-full flex items-center justify-center mr-4 print:w-20 print:h-20">
                  <span className="text-xs text-gray-500">LOGO</span>
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold mb-1 print:text-2xl">{schoolParams?.nomEcole || "École"}</h1>
                <p className="text-sm text-gray-600 print:text-base">{schoolParams?.adresseEcole} - Tél: {schoolParams?.telephoneEcole}</p>
                <p className="text-sm text-gray-600 print:text-base">Libreville, Gabon</p>
              </div>
            </div>
          </div>

          {/* Titre du reçu */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-blue-600 mb-2 print:text-xl">REÇU D'INSCRIPTION N° {student.id}</h2>
            <p className="text-sm text-gray-600 font-medium print:text-base">
              {student.typeInscription === "inscription" ? "NOUVELLE INSCRIPTION" : "RÉINSCRIPTION"}
            </p>
            <p className="text-sm text-gray-500 print:text-base">Date: {new Date(student.dateInscription).toLocaleDateString('fr-FR')}</p>
          </div>

          {/* Informations élève */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1 text-sm uppercase tracking-wide">INFORMATIONS ÉLÈVE</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Nom:</span>
                  <span className="font-semibold">{student.nom.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Prénom:</span>
                  <span>{student.prenom}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Date de naissance:</span>
                  <span>{student.dateNaissance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Lieu de naissance:</span>
                  <span>{student.lieuNaissance}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Classe:</span>
                  <span className="font-bold text-blue-600">{student.classe}</span>
                </div>
                {student.classeAncienne && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ancienne classe:</span>
                    <span>{student.classeAncienne}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-bold text-gray-800 mb-3 border-b-2 border-gray-300 pb-1 text-sm uppercase tracking-wide">INFORMATIONS PARENT/TUTEUR</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Nom:</span>
                  <span>{student.nomParent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-600">Contact:</span>
                  <span>{student.contactParent}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-600 mb-1">Adresse:</span>
                  <span className="text-sm bg-white p-2 rounded border">{student.adresse}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Détail des frais */}
          <div className="mb-6">
            <h3 className="font-bold text-gray-800 mb-4 border-b-2 border-gray-300 pb-1 text-sm uppercase tracking-wide">DÉTAIL DES FRAIS</h3>
            <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700 border-b">Désignation</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700 border-b">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3">Frais d'inscription</td>
                    <td className="px-4 py-3 text-right font-medium">{student.fraisInscription.toLocaleString()} FCFA</td>
                  </tr>
                  <tr className="border-b border-gray-200">
                    <td className="px-4 py-3">Frais de scolarité : {student.moisPaiement && student.moisPaiement.length > 0 ? student.moisPaiement.join(", ") : "annuelle"}</td>
                    <td className="px-4 py-3 text-right font-medium">{student.fraisScolarite.toLocaleString()} FCFA</td>
                  </tr>

                  {/* Options supplémentaires */}
                  {student.optionsSupplementaires && Object.entries(student.optionsSupplementaires).some(([_, selected]) => selected) && (
                    <>
                      <tr className="bg-gray-50">
                        <td colSpan={2} className="px-4 py-2 font-semibold text-gray-700 border-b">Options supplémentaires sélectionnées</td>
                      </tr>
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
                          <tr key={option} className="border-b border-gray-200">
                            <td className="px-4 py-2 pl-8 text-gray-600">{optionLabels[option]}</td>
                            <td className="px-4 py-2 text-right">{prix.toLocaleString()} FCFA</td>
                          </tr>
                        )
                      })}
                    </>
                  )}

                  {(() => {
                    let total = student.fraisInscription + student.fraisScolarite;
                    if (student.optionsSupplementaires && student.fraisOptionsSupplementaires) {
                      Object.entries(student.optionsSupplementaires).forEach(([option, selected]) => {
                        if (selected) {
                          total += student.fraisOptionsSupplementaires![option as keyof typeof student.fraisOptionsSupplementaires] || 0;
                        }
                      });
                    }
                    return (
                      <tr className="bg-blue-50 border-t-2 border-blue-200">
                        <td className="px-4 py-4 font-bold text-lg">TOTAL À PAYER</td>
                        <td className="px-4 py-4 text-right font-bold text-lg text-blue-600">{total.toLocaleString()} FCFA</td>
                      </tr>
                    );
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* Signature */}
          <div className="flex justify-between items-end mb-6 pt-4 border-t-2 border-gray-300">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3 font-medium">Signature du parent/tuteur</p>
              <div className="w-40 h-12 border-b-2 border-gray-400 mx-auto"></div>
              <p className="text-xs text-gray-500 mt-1">Date: ________________</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-3 font-medium">L'Administration</p>
              <div className="w-40 h-12 border-b-2 border-gray-400 mx-auto"></div>
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
