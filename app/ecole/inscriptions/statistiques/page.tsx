"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { servicePaiements } from "@/services/paiements.service"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"

export default function StatistiquesInscriptions() {
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

  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [stats, setStats] = useState({
    totalInscriptions: 0,
    totalReinscriptions: 0,
    totalTransferts: 0,
    tauxReinscription: 0,
    recettesTotales: 0,
    parClasse: {} as Record<string, number>,
    parAge: {} as Record<string, number>,
    parJour: [] as { date: string; nombre: number }[],
    parAnnee: [] as { annee: string; nombre: number; evolution?: number }[],
  })

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()

  useEffect(() => {
    calculerStatistiques()
  }, [dateDebut, dateFin])

  const calculerStatistiques = () => {
    const sourceStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
    const allPayments = servicePaiements.obtenirTousLesPaiements()
    
    // Filtrer les élèves par plage de dates
    const filteredStudents = sourceStudents.filter(student => {
      const inscriptionDate = new Date(student.dateInscription)
      const debut = dateDebut ? new Date(dateDebut) : null
      const fin = dateFin ? new Date(dateFin) : null
      
      if (debut && inscriptionDate < debut) return false
      if (fin && inscriptionDate > fin) return false
      return true
    })

    // Filtrer les paiements par plage de dates
    const filteredPayments = allPayments.filter(payment => {
      const paiementDate = new Date(payment.datePaiement)
      const debut = dateDebut ? new Date(dateDebut) : null
      const fin = dateFin ? new Date(dateFin) : null
      
      if (debut && paiementDate < debut) return false
      if (fin && paiementDate > fin) return false
      return true
    })
    
    const total = filteredStudents.length
    const reinscriptions = filteredStudents.filter(s => s.typeInscription === "reinscription").length
    const transferts = 0 // Pas encore de système de transfert implémenté
    const tauxReinscription = total > 0 ? (reinscriptions / total) * 100 : 0
    
    // Répartition par classe
    const parClasse: Record<string, number> = {}
    filteredStudents.forEach(student => {
      parClasse[student.classe] = (parClasse[student.classe] || 0) + 1
    })

    // Répartition par âge (basée sur la date de naissance réelle)
    const parAge: Record<string, number> = {
      "3-5 ans": 0,
      "6-8 ans": 0,
      "9-11 ans": 0,
      "12-15 ans": 0,
      "16+ ans": 0,
    }
    
    const currentYear = new Date().getFullYear()
    filteredStudents.forEach(student => {
      const birthYear = new Date(student.dateNaissance).getFullYear()
      const age = currentYear - birthYear
      
      if (age >= 3 && age <= 5) {
        parAge["3-5 ans"]++
      } else if (age >= 6 && age <= 8) {
        parAge["6-8 ans"]++
      } else if (age >= 9 && age <= 11) {
        parAge["9-11 ans"]++
      } else if (age >= 12 && age <= 15) {
        parAge["12-15 ans"]++
      } else if (age >= 16) {
        parAge["16+ ans"]++
      }
    })

    // Données par jour (basées sur les dates d'inscription réelles)
    const parJour: Record<string, number> = {}
    filteredStudents.forEach(student => {
      const date = new Date(student.dateInscription)
      const dateKey = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`
      parJour[dateKey] = (parJour[dateKey] || 0) + 1
    })
    
    // Convertir en tableau et trier par date
    const parJourArray = Object.entries(parJour)
      .map(([date, nombre]) => ({ date, nombre }))
      .sort((a, b) => {
        const [dayA, monthA] = a.date.split('/').map(Number)
        const [dayB, monthB] = b.date.split('/').map(Number)
        return monthA - monthB || dayA - dayB
      })
      .slice(-7) // Garder les 7 derniers jours

    // Données par année (basées sur les dates d'inscription réelles)
    const parAnnee: Record<string, number> = {}
    filteredStudents.forEach(student => {
      const year = new Date(student.dateInscription).getFullYear()
      parAnnee[year.toString()] = (parAnnee[year.toString()] || 0) + 1
    })
    
    // Convertir en tableau, trier par année et calculer l'évolution
    const parAnneeArray = Object.entries(parAnnee)
      .map(([annee, nombre]) => ({ annee, nombre }))
      .sort((a, b) => parseInt(a.annee) - parseInt(b.annee))
      .map((item, index, array) => {
        if (index === 0) return item
        const previous = array[index - 1]
        const evolution = previous.nombre > 0 ? ((item.nombre - previous.nombre) / previous.nombre) * 100 : 0
        return { ...item, evolution }
      })
      .slice(-3) // Garder les 3 dernières années

    // Recettes totales (basées sur les paiements réels)
    const recettesTotales = filteredPayments.reduce((sum, payment) => sum + payment.montant, 0)

    setStats({
      totalInscriptions: total,
      totalReinscriptions: reinscriptions,
      totalTransferts: transferts,
      tauxReinscription,
      recettesTotales,
      parClasse,
      parAge,
      parJour: parJourArray,
      parAnnee: parAnneeArray,
    })
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-primary" />
              Statistiques d'Inscription
            </h1>
            <p className="text-muted-foreground mt-1">Vue d'ensemble des inscriptions</p>
          </div>
        </div>

        {/* Filtres */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex items-center gap-2">
                <Label>Date de début:</Label>
                <Input 
                  type="date" 
                  value={dateDebut}
                  onChange={(e) => setDateDebut(e.target.value)}
                  className="w-48"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label>Date de fin:</Label>
                <Input 
                  type="date" 
                  value={dateFin}
                  onChange={(e) => setDateFin(e.target.value)}
                  className="w-48"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={() => { setDateDebut(""); setDateFin("") }}
              >
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalInscriptions}</p>
                  <p className="text-sm text-muted-foreground">Total Inscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalReinscriptions}</p>
                  <p className="text-sm text-muted-foreground">Réinscriptions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.tauxReinscription.toFixed(1)}%</p>
                  <p className="text-sm text-muted-foreground">Taux Réinscription</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.recettesTotales.toLocaleString()} FCFA</p>
                  <p className="text-sm text-muted-foreground">Recettes Totales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Inscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.totalInscriptions}</div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Réinscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.totalReinscriptions}</div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Taux Réinscription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.tauxReinscription.toFixed(1)}%</div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Recettes Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{stats.recettesTotales.toLocaleString()} FCFA</div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Répartition par classe */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par Classe</CardTitle>
              <CardDescription>Nombre d'élèves par classe</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(stats.parClasse).length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.parClasse).map(([classe, nombre]) => (
                    <div key={classe} className="flex items-center justify-between">
                      <span className="font-medium">{classe}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(nombre / stats.totalInscriptions) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold w-8 text-right">{nombre}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Répartition par âge */}
          <Card>
            <CardHeader>
              <CardTitle>Répartition par Âge</CardTitle>
              <CardDescription>Nombre d'élèves par tranche d'âge</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.values(stats.parAge).every(v => v === 0) ? (
                <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(stats.parAge).map(([age, nombre]) => (
                    <div key={age} className="flex items-center justify-between">
                      <span className="font-medium">{age}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-muted rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(nombre / stats.totalInscriptions) * 100}%` }}
                          />
                        </div>
                        <span className="font-semibold w-8 text-right">{nombre}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Comparaison avec Années Précédentes */}
        <Card>
          <CardHeader>
            <CardTitle>Comparaison avec Années Précédentes</CardTitle>
            <CardDescription>Évolution des inscriptions sur les 3 dernières années</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.parAnnee.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune donnée historique disponible</p>
            ) : (
              <div className="space-y-4">
                {stats.parAnnee.map((item) => (
                  <div key={item.annee} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">{item.annee}</span>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{item.nombre}</p>
                        <p className="text-sm text-muted-foreground">inscriptions</p>
                      </div>
                    </div>
                    {item.evolution !== undefined && (
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                        item.evolution >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <span className="font-semibold">
                          {item.evolution >= 0 ? '+' : ''}{item.evolution.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Évolution journalière */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution Journalière</CardTitle>
            <CardDescription>Inscriptions des 7 derniers jours</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.parJour.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Aucune donnée disponible</p>
            ) : (
              <div className="space-y-3">
                {stats.parJour.map((item) => (
                  <div key={item.date} className="flex items-center justify-between">
                    <span className="font-medium">{item.date}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-48 bg-muted rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(item.nombre / Math.max(...stats.parJour.map(d => d.nombre))) * 100}%` }}
                        />
                      </div>
                      <span className="font-semibold w-8 text-right">{item.nombre}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
