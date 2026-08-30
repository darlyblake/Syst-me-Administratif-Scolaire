"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle, XCircle, Clock, UserCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAttendanceHistory } from "@/hooks/useAttendance"

export default function RegistreAppelPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: academicStructure } = useAcademicStructure(establishmentId)

  const [filterDate, setFilterDate] = useState("")
  const [filterDateTo, setFilterDateTo] = useState("")
  const [filterClasse, setFilterClasse] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data, isLoading, error, refetch } = useAttendanceHistory({
    establishmentId,
    page,
    pageSize,
    classId: filterClasse,
    from: filterDate || undefined,
    to: filterDateTo || undefined,
  })

  const classes = useMemo(
    () =>
      academicStructure.flatMap((cycle) =>
        (cycle.grade_levels ?? []).flatMap((level) =>
          (level.school_classes ?? []).map((schoolClass) => ({
            id: schoolClass.id,
            name: schoolClass.name,
          }))
        )
      ),
    [academicStructure]
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "absent":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "late":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "justified":
        return <UserCheck className="h-4 w-4 text-blue-600" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "present":
        return "Présent"
      case "absent":
        return "Absent"
      case "late":
        return "Retard"
      case "justified":
        return "Justifié"
      default:
        return status
    }
  }

  const getClassLabel = (classId: string) => {
    return classes.find((c) => c.id === classId)?.name || classId
  }

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
              Historique des Présences
            </h1>
            <p className="text-gray-600">Consultation des enregistrements de présence</p>
          </div>
        </div>

        {/* Filtres */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date-from">Date début</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={filterDate}
                  onChange={(e) => {
                    setFilterDate(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-to">Date fin</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => {
                    setFilterDateTo(e.target.value)
                    setPage(1)
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class">Classe</Label>
                <Select
                  value={filterClasse || "all"}
                  onValueChange={(value) => {
                    setFilterClasse(value === "all" ? null : value)
                    setPage(1)
                  }}
                >
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Toutes les classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les classes</SelectItem>
                    {classes.map((classe) => (
                      <SelectItem key={classe.id} value={classe.id}>
                        {classe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button onClick={() => refetch()} variant="outline" className="w-full">
                  Rafraîchir
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* État de chargement */}
        {isLoading && (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border b-2 border-gray-900"></div>
              </div>
              <p className="text-gray-600">Chargement des enregistrements...</p>
            </CardContent>
          </Card>
        )}

        {/* État erreur */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <p className="text-red-800">{error}</p>
              <Button onClick={() => refetch()} variant="outline" size="sm" className="mt-2">
                Réessayer
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Historique des présences */}
        {!isLoading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Enregistrements de présence</CardTitle>
              <CardDescription>
                {data?.total ? `${data.total} enregistrement(s) au total` : "Aucun enregistrement"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data?.data || data.data.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600">Aucun enregistrement de présence pour cette période.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Date</th>
                          <th className="text-left py-2 px-2">Élève</th>
                          <th className="text-left py-2 px-2">Classe</th>
                          <th className="text-center py-2 px-2">Statut</th>
                          <th className="text-left py-2 px-2">Motif</th>
                          <th className="text-left py-2 px-2">Enregistré le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.data.map((record) => (
                          <tr key={record.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-900">
                              {new Date(record.attendance_date).toLocaleDateString("fr-FR")}
                            </td>
                            <td className="py-2 px-2">
                              <span className="font-medium">
                                {record.first_name} {record.last_name}
                              </span>
                            </td>
                            <td className="py-2 px-2">{getClassLabel(record.class_id)}</td>
                            <td className="py-2 px-2">
                              <div className="flex items-center justify-center gap-2">
                                {getStatusIcon(record.status)}
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {getStatusLabel(record.status)}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 px-2 text-gray-600">{record.reason || "-"}</td>
                            <td className="py-2 px-2 text-gray-500 text-xs">
                              {record.created_at ? new Date(record.created_at).toLocaleDateString("fr-FR") : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {data && data.total_pages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t">
                      <div className="text-sm text-gray-600">
                        {Math.min((page - 1) * pageSize + 1, data.total)}–{Math.min(page * pageSize, data.total)}{" "}
                        sur {data.total} enregistrement(s)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.max(1, page - 1))}
                          disabled={page === 1}
                        >
                          Précédent
                        </Button>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Page {data.page} sur {data.total_pages}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPage(Math.min(data.total_pages, page + 1))}
                          disabled={page === data.total_pages}
                        >
                          Suivant
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
