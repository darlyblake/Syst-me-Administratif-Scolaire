"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Search, CalendarCheck, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useUserContext } from "@/hooks/useUserContext"
import { useDailyAbsences } from "@/hooks/useAbsences"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"

export default function JustificationsPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [classe, setClasse] = useState("all")
  const [statut, setStatut] = useState("all")
  const [search, setSearch] = useState("")

  const { absences, isLoading, error } = useDailyAbsences(establishmentId, date)
  const { data: academicStructure } = useAcademicStructure(establishmentId)

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

  const demandes = useMemo(
    () =>
      absences.filter((absence) => {
        const name = `${absence.student?.first_name ?? ""} ${absence.student?.last_name ?? ""}`.toLowerCase()
        const matchesClass = classe === "all" || absence.class_id === classe
        const matchesSearch = !search || name.includes(search.toLowerCase())
        const isJustifiable = absence.status === "absent" || absence.status === "late" || absence.status === "justified"
        const matchesStatus =
          statut === "all" ||
          (statut === "justifiee" && absence.status === "justified") ||
          (statut === "a_traiter" && absence.status !== "justified" && isJustifiable)
        return matchesClass && matchesSearch && matchesStatus && isJustifiable
      }),
    [absences, classe, search, statut]
  )

  return (
    <div className="min-h-screen bg-[#faf8ff]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-3 border-b border-[#d9dce5] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs text-[#64748b]">
              <Link href="/ecole/absences" className="hover:text-[#1e3a8a]">Absences</Link>
              <span>/</span>
              <span>Justifications</span>
            </div>
            <h1 className="text-2xl font-semibold text-[#131b2e]">Justifications d'absence</h1>
            <p className="mt-1 text-sm text-[#64748b]">Consultez les absences nécessitant une justification et leur état de traitement.</p>
          </div>
          <Button variant="outline" asChild className="border-[#c5c5d3] bg-white">
            <Link href="/ecole/absences"><ArrowLeft className="mr-2 h-4 w-4" />Retour aux absences</Link>
          </Button>
        </div>

        <div className="mb-5 border-y border-[#d9dce5] bg-white p-3">
          <div className="grid gap-3 md:grid-cols-4">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-[#c5c5d3] bg-white" />
            <Select value={classe} onValueChange={setClasse}>
              <SelectTrigger className="border-[#c5c5d3] bg-white"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statut} onValueChange={setStatut}>
              <SelectTrigger className="border-[#c5c5d3] bg-white"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="a_traiter">À traiter</SelectItem>
                <SelectItem value="justifiee">Justifiées</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un élève..." className="border-[#c5c5d3] bg-white pl-9" />
            </div>
          </div>
        </div>

        {isLoading && <p className="mb-4 border border-[#d9dce5] bg-white p-4 text-sm text-[#64748b]">Chargement des absences...</p>}
        {error && <p className="mb-4 border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}

        <section className="border border-[#d9dce5] bg-white">
          <div className="flex items-center justify-between border-b border-[#d9dce5] px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-[#131b2e]">Dossiers de justification</h2>
              <p className="mt-1 text-sm text-[#64748b]">{demandes.length} absence(s) affichée(s)</p>
            </div>
            <CalendarCheck className="h-5 w-5 text-[#1e3a8a]" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-[#d9dce5] bg-[#f7f8fc] text-left text-xs uppercase tracking-wide text-[#64748b]">
                <tr>
                  <th className="px-5 py-3">Élève</th>
                  <th className="px-5 py-3">Classe</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Motif</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e7eb]">
                {demandes.map((absence) => {
                  const studentName = `${absence.student?.last_name ?? "-"} ${absence.student?.first_name ?? ""}`.trim()
                  const className = classes.find((item) => item.id === absence.class_id)?.name ?? "-"
                  const justified = absence.status === "justified"
                  return (
                    <tr key={absence.id} className="hover:bg-[#faf8ff]">
                      <td className="px-5 py-4 font-medium text-[#131b2e]">{studentName}</td>
                      <td className="px-5 py-4 text-[#515f74]">{className}</td>
                      <td className="px-5 py-4 text-[#515f74]">{new Date(absence.date).toLocaleDateString("fr-FR")}</td>
                      <td className="max-w-xs px-5 py-4 text-[#515f74]">{absence.reason || absence.notes || "Non renseigné"}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center border px-2 py-1 text-xs font-medium ${justified ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                          {justified ? <Check className="mr-1 h-3.5 w-3.5" /> : <X className="mr-1 h-3.5 w-3.5" />}
                          {justified ? "Justifiée" : "À traiter"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button size="sm" variant="outline" className="border-[#c5c5d3]" disabled>
                          {justified ? "Justification validée" : "Traitement à venir"}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {!isLoading && demandes.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-[#64748b]">Aucune absence à justifier pour les filtres sélectionnés.</div>
          )}
        </section>
      </div>
    </div>
  )
}
