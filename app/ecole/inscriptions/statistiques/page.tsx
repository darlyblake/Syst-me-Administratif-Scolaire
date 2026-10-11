"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, BarChart3, TrendingUp, Users, Calendar } from "lucide-react"
import Link from "next/link"
import { useUserContext } from "@/hooks/useUserContext"
import { supabaseBrowser } from "@/lib/supabase/client"
import { financeService } from "@/lib/supabase/services/finance.service"

export default function StatistiquesInscriptions() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [dateDebut, setDateDebut] = useState("")
  const [dateFin, setDateFin] = useState("")
  const [enrollments, setEnrollments] = useState<Array<{
    id: string
    student_id: string
    academic_year_id: string | null
    enrollment_date: string
    class_name: string
    birth_date: string
    academic_year_name: string
    academic_year_rank: number | null
  }>>([])
  const [revenueRows, setRevenueRows] = useState<Array<{ date: string; amount: number }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
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

  useEffect(() => {
    let active = true
    async function loadStatistics() {
      if (!establishmentId) {
        setEnrollments([])
        setRevenueRows([])
        setIsLoading(false)
        setLoadError(null)
        return
      }
      setIsLoading(true)
      setLoadError(null)
      try {
        // Charger toutes les inscriptions par lots : les statistiques ne doivent
        // pas être limitées aux 50 élèves de la liste d'affichage.
        const allEnrollments: typeof enrollments = []
        const pageSize = 1000
        for (let from = 0; ; from += pageSize) {
          const { data, error } = await supabaseBrowser
            .from("enrollments")
            .select("id, student_id, academic_year_id, enrollment_date, student:students!student_id(date_of_birth), class:school_classes!class_id(name)")
            .eq("establishment_id", establishmentId)
            .order("enrollment_date", { ascending: true })
            .range(from, from + pageSize - 1)
          if (error) throw error
          const batch = (data ?? []) as any[]
          allEnrollments.push(...batch.map((row) => ({
            id: row.id,
            student_id: row.student_id,
            academic_year_id: row.academic_year_id ?? null,
            enrollment_date: row.enrollment_date || "",
            class_name: row.class?.name || "Classe non renseignée",
            birth_date: row.student?.date_of_birth || "",
            academic_year_name: "",
            academic_year_rank: null,
          })))
          if (batch.length < pageSize) break
        }
        // Utiliser les années académiques configurées dans Paramètres pour les comparaisons.
        const academicYearIds = [...new Set(allEnrollments.map((row) => row.academic_year_id).filter((id): id is string => Boolean(id)))]
        if (academicYearIds.length) {
          const { data: academicYears, error: academicYearsError } = await supabaseBrowser
            .from("academic_years")
            .select("id, name, start_date")
            .in("id", academicYearIds)
          if (academicYearsError) throw academicYearsError
          const yearRank = new Map(
            [...(academicYears ?? [])]
              .sort((a, b) => String(a.start_date ?? "").localeCompare(String(b.start_date ?? "")))
              .map((year, index) => [year.id, index]),
          )
          const yearName = new Map((academicYears ?? []).map((year) => [year.id, year.name]))
          allEnrollments.forEach((row) => {
            row.academic_year_name = row.academic_year_id
              ? yearName.get(row.academic_year_id) ?? "Année académique non renseignée"
              : "Année académique non renseignée"
            row.academic_year_rank = row.academic_year_id ? yearRank.get(row.academic_year_id) ?? null : null
          })
        }
        const movements = await financeService.getMovements(establishmentId)
        const revenues = movements
          .filter((row) => row.direction === "credit")
          .map((row) => ({ date: row.transaction_date, amount: Number(row.amount) || 0 }))
        if (active) {
          setEnrollments(allEnrollments)
          setRevenueRows(revenues)
        }
      } catch (error) {
        if (active) {
          setEnrollments([])
          setRevenueRows([])
          setLoadError(error instanceof Error ? error.message : "Impossible de charger les statistiques.")
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void loadStatistics()
    return () => { active = false }
  }, [establishmentId])

  useEffect(() => {
    const inDateRange = (value: string) => {
      if (!value) return false
      const date = value.slice(0, 10)
      return (!dateDebut || date >= dateDebut) && (!dateFin || date <= dateFin)
    }
    const filtered = enrollments.filter((row) => inDateRange(row.enrollment_date))
    const filteredRevenues = revenueRows.filter((row) => inDateRange(row.date))
    const firstYearRankByStudent = new Map<string, number>()
    enrollments.forEach((row) => {
      if (!row.student_id || row.academic_year_rank === null) return
      const previousRank = firstYearRankByStudent.get(row.student_id)
      if (previousRank === undefined || row.academic_year_rank < previousRank) {
        firstYearRankByStudent.set(row.student_id, row.academic_year_rank)
      }
    })
    const reinscriptions = filtered.filter((row) => {
      const firstRank = firstYearRankByStudent.get(row.student_id)
      return row.academic_year_rank !== null && firstRank !== undefined && row.academic_year_rank > firstRank
    }).length
    const parClasse: Record<string, number> = {}
    const parAge: Record<string, number> = { "3-5 ans": 0, "6-8 ans": 0, "9-11 ans": 0, "12-15 ans": 0, "16+ ans": 0 }
    const parJour: Record<string, number> = {}
    const parAnnee: Record<string, number> = {}
    const today = new Date()
    filtered.forEach((row) => {
      parClasse[row.class_name] = (parClasse[row.class_name] || 0) + 1
      if (row.birth_date) {
        const birth = new Date(row.birth_date)
        if (!Number.isNaN(birth.getTime())) {
          let age = today.getFullYear() - birth.getFullYear()
          const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
          if (beforeBirthday) age--
          if (age >= 3 && age <= 5) parAge["3-5 ans"]++
          else if (age >= 6 && age <= 8) parAge["6-8 ans"]++
          else if (age >= 9 && age <= 11) parAge["9-11 ans"]++
          else if (age >= 12 && age <= 15) parAge["12-15 ans"]++
          else if (age >= 16) parAge["16+ ans"]++
        }
      }
      const date = row.enrollment_date.slice(0, 10)
      if (date) {
        const day = new Date(date + "T12:00:00")
        const key = day.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
        parJour[key] = (parJour[key] || 0) + 1
        const year = row.academic_year_name || "Année académique non renseignée"
        parAnnee[year] = (parAnnee[year] || 0) + 1
      }
    })
    const parJourArray = Object.entries(parJour).map(([date, nombre]) => ({ date, nombre })).slice(-7)
    const parAnneeArray = Object.entries(parAnnee).sort(([a], [b]) => a.localeCompare(b)).map(([annee, nombre], index, array) => {
      if (index === 0) return { annee, nombre }
      const previous = array[index - 1]
      return { annee, nombre, evolution: previous[1] > 0 ? ((nombre - previous[1]) / previous[1]) * 100 : 0 }
    }).slice(-3)
    setStats({
      totalInscriptions: filtered.length,
      totalReinscriptions: reinscriptions,
      totalTransferts: 0,
      tauxReinscription: filtered.length ? reinscriptions / filtered.length * 100 : 0,
      recettesTotales: filteredRevenues.reduce((sum, row) => sum + row.amount, 0),
      parClasse,
      parAge,
      parJour: parJourArray,
      parAnnee: parAnneeArray,
    })
  }, [enrollments, revenueRows, dateDebut, dateFin])

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

        {loadError ? <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p> : null}
        {isLoading ? <p role="status" className="text-sm text-muted-foreground">Chargement des statistiques...</p> : null}

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
