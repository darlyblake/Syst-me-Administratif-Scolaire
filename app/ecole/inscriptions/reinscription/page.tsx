"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowLeft, RotateCcw, Search } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { serviceParametres } from "@/services/parametres.service"
import NouvelleInscriptionModal from "@/components/NouvelleInscriptionModal"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"
import type { DonneesEleve } from "@/types/models"

export default function Reinscription() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? "demo-establishment"
  const { data: supabaseStudents } = useStudents(establishmentId)

  const mappedSupabaseStudents = useMemo(() => {
    return (supabaseStudents ?? []).map((student) => ({
      id: student.id,
      identifiant: student.id.slice(0, 8).toUpperCase(),
      motDePasse: "",
      nom: student.last_name || "",
      prenom: student.first_name || "",
      dateNaissance: student.date_of_birth || "",
      lieuNaissance: student.place_of_birth || "",
      sexe: student.gender || "",
      classe: "",
      classeAncienne: "",
      nomParent: "",
      contactParent: "",
      adresse: "",
      dateInscription: student.created_at || "",
      statut: "actif" as const,
      totalAPayer: 0,
      typeInscription: "inscription" as const,
      informationsContact: {
        telephone: student.phone || "",
        email: student.email || "",
        adresse: "",
      },
      modePaiement: "mensuel" as const,
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      fraisOptionsSupplementaires: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      },
      moisPaiement: [],
      optionsPersonnalisees: [],
    }))
  }, [supabaseStudents])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterClasse, setFilterClasse] = useState("")
  const [filterAnnee, setFilterAnnee] = useState("")
  const [selectedStudent, setSelectedStudent] = useState<DonneesEleve | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
  const parametres = serviceParametres.obtenirParametres()
  const anneeCourante = parametres.anneeAcademique

  // Obtenir les années académiques uniques
  const anneesDisponibles = Array.from(new Set(allStudents.map(s => {
    const year = new Date(s.dateInscription).getFullYear()
    return `${year}-${year + 1}`
  })))

  // Obtenir les classes uniques
  const classesDisponibles = Array.from(new Set(allStudents.map(s => s.classe)))

  const filteredStudents = allStudents.filter(
    (student) => {
      const matchSearch = !searchTerm || 
        student.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.identifiant.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchClasse = !filterClasse || student.classe === filterClasse
      
      const studentYear = new Date(student.dateInscription).getFullYear()
      const studentAnnee = `${studentYear}-${studentYear + 1}`
      const matchAnnee = !filterAnnee || studentAnnee === filterAnnee
      
      return matchSearch && matchClasse && matchAnnee
    }
  )

  const handleStudentSelect = (student: DonneesEleve) => {
    setSelectedStudent(student)
    setShowModal(true)
  }

  const handleModalClose = () => {
    setShowModal(false)
    setSelectedStudent(null)
  }

  const handleModalSuccess = () => {
    setShowModal(false)
    setSelectedStudent(null)
    setAllStudents(serviceEleves.obtenirTousLesEleves())
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/inscriptions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <RotateCcw className="h-6 w-6" />
              Réinscription
            </h1>
            <p className="text-gray-600">Réinscrire un élève pour l'année scolaire suivante</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sélectionner l'Élève</CardTitle>
            <CardDescription>Rechercher et filtrer les élèves à réinscrire</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par nom, prénom ou identifiant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <select
                  value={filterClasse}
                  onChange={(e) => setFilterClasse(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Toutes les classes</option>
                  {classesDisponibles.map(classe => (
                    <option key={classe} value={classe}>{classe}</option>
                  ))}
                </select>
              </div>
              <div className="w-48">
                <select
                  value={filterAnnee}
                  onChange={(e) => setFilterAnnee(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Toutes les années</option>
                  {anneesDisponibles.map(annee => (
                    <option key={annee} value={annee}>{annee}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun élève trouvé</p>
              ) : (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleStudentSelect(student)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-semibold">{student.prenom} {student.nom}</p>
                        <div className="flex gap-4 text-sm text-gray-600 mt-1">
                          <span>Classe: {student.classe}</span>
                          <span>Identifiant: {student.identifiant}</span>
                          <span>
                            Année: {new Date(student.dateInscription).getFullYear()}-{new Date(student.dateInscription).getFullYear() + 1}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Sélectionner
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {filteredStudents.length > 0 && (
              <div className="text-sm text-gray-600 pt-2 border-t">
                {filteredStudents.length} élève(s) trouvé(s)
              </div>
            )}
          </CardContent>
        </Card>

        <NouvelleInscriptionModal
          isOpen={showModal}
          onClose={handleModalClose}
          onSuccess={handleModalSuccess}
          typeInscription="reinscription"
          studentId={selectedStudent?.id}
        />
      </div>
    </div>
  )
}
