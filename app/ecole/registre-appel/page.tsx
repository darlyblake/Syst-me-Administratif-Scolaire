"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, CheckCircle, XCircle, Clock, UserCheck, Calendar } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"
import { serviceRegistreAppel } from "@/services/registre-appel.service"
import { serviceEleves } from "@/services/eleves.service"
import { serviceClasses } from "@/services/classes.service"
import type { AppelEleve } from "@/services/registre-appel.service"

export default function RegistreAppelPage() {
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

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()

  const [appels, setAppels] = useState<AppelEleve[]>([])
  const [eleves, setEleves] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [showAppelModal, setShowAppelModal] = useState(false)
  const [selectedClasse, setSelectedClasse] = useState<string>("")
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [appelsEnCours, setAppelsEnCours] = useState<Record<string, AppelEleve["statut"]>>({})
  const [filterDate, setFilterDate] = useState("")
  const [filterClasse, setFilterClasse] = useState("tous")
  const [filterStatut, setFilterStatut] = useState("tous")

  useEffect(() => {
    setAppels(serviceRegistreAppel.obtenirTousLesAppels())
    setEleves(allStudents)
    setClasses(serviceClasses.obtenirToutesLesClasses())
    setFilterDate(new Date().toISOString().split('T')[0])
  }, [allStudents])

  const handleEffectuerAppel = () => {
    if (!selectedClasse || !selectedDate) {
      alert("Veuillez sélectionner une classe et une date")
      return
    }

    const elevesClasse = eleves.filter(e => e.classeId === selectedClasse)
    const appelsData = elevesClasse.map(eleve => ({
      eleveId: eleve.id,
      statut: appelsEnCours[eleve.id] || "present",
      motif: ""
    }))

    serviceRegistreAppel.effectuerAppelClasse(selectedClasse, selectedDate, appelsData)
    setAppels(serviceRegistreAppel.obtenirTousLesAppels())
    setShowAppelModal(false)
    setSelectedClasse("")
    setAppelsEnCours({})
  }

  const handleModifierStatut = (id: string, statut: AppelEleve["statut"]) => {
    serviceRegistreAppel.mettreAJourAppel(id, { statut })
    setAppels(serviceRegistreAppel.obtenirTousLesAppels())
  }

  const handleSupprimerAppel = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer cet appel ?")) {
      serviceRegistreAppel.supprimerAppel(id)
      setAppels(serviceRegistreAppel.obtenirTousLesAppels())
    }
  }

  const filteredAppels = appels.filter(appel => {
    const matchDate = !filterDate || appel.date === filterDate
    const matchClasse = filterClasse === "tous" || appel.classeId === filterClasse
    const matchStatut = filterStatut === "tous" || appel.statut === filterStatut
    return matchDate && matchClasse && matchStatut
  })

  const getEleveNom = (eleveId: string) => {
    const eleve = eleves.find(e => e.id === eleveId)
    return eleve ? `${eleve.prenom} ${eleve.nom}` : "Élève inconnu"
  }

  const getClasseNom = (classeId: string) => {
    const classe = classes.find(c => c.id === classeId)
    return classe ? classe.nom : "Classe inconnue"
  }

  const getStatutIcon = (statut: AppelEleve["statut"]) => {
    switch (statut) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "retard":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "excuse":
        return <UserCheck className="h-4 w-4 text-blue-600" />
    }
  }

  const statistiques = serviceRegistreAppel.obtenirStatistiques()

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck className="h-6 w-6" />
              Registre d'Appel
            </h1>
            <p className="text-gray-600">Suivi des présences des élèves</p>
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Total appels</p>
              <p className="text-2xl font-bold">{statistiques.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Présents</p>
              <p className="text-2xl font-bold text-green-600">{statistiques.parStatut.present || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Absents</p>
              <p className="text-2xl font-bold text-red-600">{statistiques.parStatut.absent || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-gray-600">Retards</p>
              <p className="text-2xl font-bold text-yellow-600">{statistiques.parStatut.retard || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et actions */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>
              <Select value={filterClasse} onValueChange={setFilterClasse}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par classe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Toutes les classes</SelectItem>
                  {classes.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatut} onValueChange={setFilterStatut}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filtrer par statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tous">Tous les statuts</SelectItem>
                  <SelectItem value="present">Présent</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="retard">Retard</SelectItem>
                  <SelectItem value="excuse">Excusé</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAppelModal(true)} className="ml-auto">
                <Calendar className="h-4 w-4 mr-2" />
                Effectuer appel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Liste des appels */}
        <Card>
          <CardHeader>
            <CardTitle>Appels Enregistrés</CardTitle>
            <CardDescription>{filteredAppels.length} appel(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {filteredAppels.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun appel enregistré</p>
              ) : (
                filteredAppels.map((appel) => (
                  <div key={appel.id} className="border rounded-lg p-4 flex justify-between items-center hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        {getStatutIcon(appel.statut)}
                      </div>
                      <div>
                        <p className="font-semibold">{getEleveNom(appel.eleveId)}</p>
                        <p className="text-sm text-gray-600">{getClasseNom(appel.classeId)}</p>
                        <div className="flex gap-2 mt-2">
                          <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-800">
                            {new Date(appel.date).toLocaleDateString()}
                          </span>
                          {appel.motif && (
                            <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                              {appel.motif}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Select
                        value={appel.statut}
                        onValueChange={(value) => handleModifierStatut(appel.id, value as any)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="present">Présent</SelectItem>
                          <SelectItem value="absent">Absent</SelectItem>
                          <SelectItem value="retard">Retard</SelectItem>
                          <SelectItem value="excuse">Excusé</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => handleSupprimerAppel(appel.id)}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Modal d'appel */}
        {showAppelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Effectuer l'Appel</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="classe">Classe *</Label>
                    <Select value={selectedClasse} onValueChange={setSelectedClasse}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((classe) => (
                          <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                    />
                  </div>
                </div>

                {selectedClasse && (
                  <div className="space-y-2">
                    <Label>Élèves de la classe</Label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {eleves.filter(e => e.classeId === selectedClasse).map((eleve) => (
                        <div key={eleve.id} className="flex items-center justify-between p-2 border rounded">
                          <span>{eleve.prenom} {eleve.nom}</span>
                          <Select
                            value={appelsEnCours[eleve.id] || "present"}
                            onValueChange={(value) => setAppelsEnCours({ ...appelsEnCours, [eleve.id]: value as any })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Présent</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="retard">Retard</SelectItem>
                              <SelectItem value="excuse">Excusé</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <Button onClick={handleEffectuerAppel} className="flex-1">
                  Enregistrer
                </Button>
                <Button variant="outline" onClick={() => setShowAppelModal(false)} className="flex-1">
                  Annuler
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
