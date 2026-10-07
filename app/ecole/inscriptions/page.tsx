"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  UserPlus,
  RefreshCw,
  ArrowRightLeft,
  BarChart3,
  Search,
  Printer,
  RotateCcw,
  FileText,
  Clock3,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import NouvelleInscriptionModal from "@/components/NouvelleInscriptionModal"
import ChangerClasseModal from "@/components/ChangerClasseModal"
import { serviceTransfert } from "@/services/transfert.service"
import { useUserContext } from "@/hooks/useUserContext"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useEnrollments } from "@/hooks/useEnrollments"

type Row = {
  id: string
  studentId: string
  dossier: string
  firstName: string
  lastName: string
  studentNumber: string
  classId: string
  className: string
  date: string
  status: string
  annualAmount: number
  gradeLevelId: string
}

export default function InscriptionsPage() {
  const { primaryEstablishment, estEnCoursDeChargement } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { activeYear } = useAcademicYears(establishmentId)
  const { data: academicStructure } = useAcademicStructure(establishmentId)

  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<"inscription" | "reinscription">("inscription")
  const [search, setSearch] = useState("")
  const [filterClasse, setFilterClasse] = useState("")
  const [filterStatut, setFilterStatut] = useState("")
  const [period, setPeriod] = useState("all")
  const [page, setPage] = useState(1)
  const [refreshKey, setRefreshKey] = useState(0)
  const [classChangeRow, setClassChangeRow] = useState<Row | null>(null)

  const { enrollments, total, totalPages, isLoading, error } = useEnrollments({
    establishmentId,
    page,
    pageSize: 25,
    academicYearId: activeYear?.id ?? null,
    classId: filterClasse || null,
    status: filterStatut || null,
    refreshKey,
    search,
  })

  const classMap = useMemo(() => {
    const map = new Map<string, string>()
    academicStructure.forEach((cycle) => {
      cycle.grade_levels?.forEach((level) => {
        level.school_classes?.forEach((schoolClass) => {
          map.set(schoolClass.id, schoolClass.name)
        })
      })
    })
    return map
  }, [academicStructure])

  const rows = useMemo<Row[]>(() => enrollments.map((enrollment) => {
    const raw = enrollment as any
    const firstName = raw.student?.first_name ?? raw.first_name ?? ""
    const lastName = raw.student?.last_name ?? raw.last_name ?? ""
    const studentNumber = raw.student?.student_number ?? raw.student_number ?? ""
    const classId = raw.class_id ?? raw.class?.id ?? ""
    const className = raw.class?.name ?? raw.class_name ?? classMap.get(classId) ?? "—"

    return {
      id: raw.id,
      studentId: raw.student_id,
      dossier: `INS-${String(activeYear?.name ?? "").replace(/\D/g, "").slice(-4) || "2026"}-${String(raw.id).slice(0, 4).toUpperCase()}`,
      firstName,
      lastName,
      studentNumber,
      classId,
      className,
      date: raw.enrollment_date ?? raw.created_at ?? "",
      status: raw.status ?? "active",
      annualAmount: Number(raw.tuition_plan?.annual_tuition ?? raw.annual_tuition ?? 0),
      gradeLevelId: raw.class?.grade_level_id ?? raw.grade_level_id ?? raw.tuition_plan?.grade_level_id ?? "",
    }
  }), [enrollments, classMap, activeYear?.name])

  const classes = useMemo(
    () => academicStructure.flatMap((cycle) =>
      (cycle.grade_levels ?? []).flatMap((level) =>
        (level.school_classes ?? []).filter((schoolClass) => schoolClass.active !== false).map((schoolClass) => ({
          id: schoolClass.id,
          name: schoolClass.name,
          gradeLevelId: level.id,
        }))
      )
    ),
    [academicStructure],
  )

  const activeCount = rows.filter((row) => row.status === "active").length
  const inactiveCount = rows.filter((row) => row.status !== "active").length
  const transferCount = useMemo(() => serviceTransfert.getEnAttente().length, [refreshKey])

  const resetFilters = () => {
    setSearch("")
    setFilterClasse("")
    setFilterStatut("")
    setPeriod("all")
    setPage(1)
  }

  const openInscription = () => {
    setModalType("inscription")
    setShowModal(true)
  }

  const openReinscription = () => {
    setModalType("reinscription")
    setShowModal(true)
  }

  const onSuccess = () => {
    setShowModal(false)
    setRefreshKey((value) => value + 1)
    toast.success(modalType === "inscription" ? "Inscription enregistrée" : "Réinscription enregistrée")
  }

  const formatDate = (value: string) => {
    if (!value) return "—"
    return new Date(value).toLocaleDateString("fr-FR")
  }

  const statusLabel = (status: string) => {
    if (status === "active") return "Inscrit définitif"
    if (status === "transferred") return "Transféré"
    if (status === "cancelled") return "Annulé"
    return "En attente"
  }

  return (
    <div className="w-full min-w-0 text-[#131b2e]">
      {(estEnCoursDeChargement || isLoading) && (
        <div className="mb-3 border border-[#c5c5d3] bg-white px-3 py-2 text-[12px] text-[#515f74]">
          Chargement des inscriptions…
        </div>
      )}

      {error && (
        <div className="mb-3 border border-[#f3b7b2] bg-[#ffefed] px-3 py-2 text-[12px] text-[#ba1a1a]">
          {error}
        </div>
      )}

      <header className="border-b border-[#c5c5d3]/60 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[23px] font-semibold leading-7 tracking-[-0.01em]">Inscriptions</h1>
              <span className="inline-flex h-6 items-center bg-[#dce1ff] px-2 text-[11px] font-medium text-[#264191]">
                Session {activeYear?.name ?? "—"}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] leading-4 text-[#515f74]">
              Traitement et validation des dossiers d'inscription et de réinscription
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={openInscription}
              className="inline-flex h-8 items-center gap-1.5 border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium text-white hover:bg-[#00236f]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Nouvelle inscription
            </button>
            <button
              type="button"
              onClick={openReinscription}
              className="inline-flex h-8 items-center gap-1.5 border border-[#c5c5d3] bg-white px-3 text-[11px] font-medium text-[#131b2e] hover:bg-[#f2f3ff]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Réinscription rapide
            </button>
            <Link
              href="/ecole/inscriptions/transfert"
              className="inline-flex h-8 items-center gap-1.5 border border-[#c5c5d3] bg-white px-3 text-[11px] font-medium hover:bg-[#f2f3ff]"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Transfert
            </Link>
            <Link
              href="/ecole/inscriptions/statistiques"
              className="inline-flex h-8 items-center gap-1.5 border border-[#c5c5d3] bg-white px-3 text-[11px] font-medium hover:bg-[#f2f3ff]"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              Rapports
            </Link>
          </div>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-2 border border-[#c5c5d3]/50 bg-white lg:grid-cols-4">
        {[
          { label: "Dossiers totaux", value: total, icon: FileText, tone: "text-[#00236f] bg-[#dce1ff]" },
          { label: "Inscrits & validés", value: activeCount, icon: CheckCircle2, tone: "text-[#166534] bg-[#dcfce7]" },
          { label: "En attente / autres", value: inactiveCount, icon: Clock3, tone: "text-[#92400e] bg-[#fef3c7]" },
          { label: "Transferts en attente", value: transferCount, icon: ArrowRightLeft, tone: "text-[#7a5600] bg-[#fff7dc]" },
        ].map((item, index) => {
          const Icon = item.icon
          return (
            <div key={item.label} className={`flex min-h-[70px] items-center justify-between border-b border-[#c5c5d3]/45 p-3 ${index < 3 ? "lg:border-r" : ""} ${index % 2 === 0 ? "border-r" : ""} lg:border-b-0`}>
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[.04em] text-[#515f74]">{item.label}</p>
                <p className="mt-1 text-[21px] font-semibold tabular-nums">{item.value.toLocaleString("fr-FR")}</p>
              </div>
              <span className={`flex h-8 w-8 items-center justify-center ${item.tone}`}>
                <Icon className="h-4 w-4" />
              </span>
            </div>
          )
        })}
      </section>

      <section className="mt-3 overflow-hidden border border-[#c5c5d3]/45 bg-white">
        <div className="flex flex-wrap items-center gap-1 border-b border-[#c5c5d3]/45 px-2 pt-1">
          <button className="border-b-2 border-[#00236f] px-3 py-2 text-[12px] font-medium text-[#00236f]">
            Toutes les demandes <span className="ml-1 text-[11px] text-[#515f74]">{total}</span>
          </button>
          <button className="px-3 py-2 text-[12px] text-[#515f74] hover:bg-[#f2f3ff]">
            En attente <span className="ml-1 text-[11px]">{inactiveCount}</span>
          </button>
          <button className="px-3 py-2 text-[12px] text-[#515f74] hover:bg-[#f2f3ff]">
            Validées / Inscrit <span className="ml-1 text-[11px] text-[#166534]">{activeCount}</span>
          </button>
          <button className="px-3 py-2 text-[12px] text-[#515f74] hover:bg-[#f2f3ff]">
            Transferts <span className="ml-1 text-[11px] text-[#92400e]">{transferCount}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2 bg-[#f2f3ff] p-2 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515f74]" />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Rechercher par N° dossier, nom élève, tuteur…"
              className="h-8 rounded border-[#c5c5d3]/70 bg-white pl-8 text-[12px]"
            />
          </div>

          <div className="flex items-center gap-2 md:col-span-3">
            <label className="whitespace-nowrap text-[11px] font-medium text-[#515f74]">Classe :</label>
            <select
              value={filterClasse}
              onChange={(event) => {
                setFilterClasse(event.target.value)
                setPage(1)
              }}
              className="h-8 w-full rounded border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]"
            >
              <option value="">Toutes les classes</option>
              {classes.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <label className="whitespace-nowrap text-[11px] font-medium text-[#515f74]">Période :</label>
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              className="h-8 w-full rounded border border-[#c5c5d3]/70 bg-white px-2 text-[12px] outline-none focus:border-[#00236f]"
            >
              <option value="all">Toute la session</option>
              <option value="30">30 derniers jours</option>
              <option value="7">7 derniers jours</option>
              <option value="today">Aujourd'hui</option>
            </select>
          </div>

          <div className="flex items-center gap-2 md:col-span-2">
            <label className="whitespace-nowrap text-[11px] font-medium text-[#515f74]">Statut :</label>
            <select
              value={filterStatut}
              onChange={(event) => {
                setFilterStatut(event.target.value)
                setPage(1)
              }}
              className="h-8 w-full rounded border border-[#c5c5d3]/70 bg-white px-2 text-[12px] outline-none focus:border-[#00236f]"
            >
              <option value="">Tous les statuts</option>
              <option value="active">Inscrit</option>
              <option value="pending">En attente</option>
              <option value="cancelled">Annulé</option>
              <option value="transferred">Transféré</option>
            </select>
          </div>

          <button
            type="button"
            onClick={resetFilters}
            title="Réinitialiser les filtres"
            className="flex h-8 items-center justify-center rounded border border-[#c5c5d3]/70 bg-white text-[#515f74] hover:bg-[#eaedff] md:col-span-1"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-left">
            <thead>
              <tr className="border-b border-[#c5c5d3]/50 bg-[#eaedff]">
                {[
                  ["N° Dossier", "w-32"],
                  ["Dépôt", "w-32"],
                  ["Futur élève", ""],
                  ["Niveau / classe", "w-32"],
                  ["Responsable", ""],
                  ["Frais dossier", "w-32"],
                  ["Statut dossier", "w-40"],
                  ["Actions", "w-36"],
                ].map(([label, width]) => (
                  <th key={label} className={`px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[.04em] text-[#515f74] ${width}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-[12px]">
              {rows.map((row) => {
                const isActive = row.status === "active"
                return (
                  <tr key={row.id} className="border-b border-[#c5c5d3]/30 hover:bg-[#f2f3ff]">
                    <td className="px-3 py-2 font-mono text-[11px] font-medium text-[#00236f]">{row.dossier}</td>
                    <td className="whitespace-nowrap px-3 py-2 text-[11px] text-[#444651]">{formatDate(row.date)}</td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-[#131b2e]">{row.lastName} {row.firstName}</div>
                      <div className="text-[11px] text-[#515f74]">{row.studentNumber || row.studentId.slice(0, 8).toUpperCase()}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex border border-[#c5c5d3]/40 bg-[#eaedff] px-1.5 py-0.5 text-[11px] font-medium">
                        {row.className}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="text-[12px] font-medium text-[#131b2e]">—</div>
                      <div className="font-mono text-[10px] text-[#68758a]">Contact non renseigné</div>
                    </td>
                    <td className="px-3 py-2">
                      {row.annualAmount > 0 ? (
                        <span className="inline-flex items-center gap-1 border border-[#bbf7d0] bg-[#dcfce7] px-2 py-0.5 text-[11px] font-semibold text-[#15803d]">
                          <CheckCircle2 className="h-3 w-3" />
                          {row.annualAmount.toLocaleString("fr-FR")} FCFA
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#515f74]">Non configuré</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[11px] font-medium ${isActive ? "border-[#bbf7d0] bg-[#dcfce7] text-[#166534]" : "border-[#fde68a] bg-[#fef3c7] text-[#92400e]"}`}>
                        {isActive ? <CheckCircle2 className="h-3 w-3" /> : <Clock3 className="h-3 w-3" />}
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setClassChangeRow(row)}
                          className="inline-flex h-6 items-center gap-1 border border-[#c5c5d3]/70 px-2 text-[10px] text-[#515f74] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                          title={row.classId ? "Changer de classe" : "Affecter une classe"}
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          {row.classId ? "Classe" : "Affecter"}
                        </button>
                        {isActive && (
                          <button
                            type="button"
                            onClick={() => window.open(`/receipt?id=${row.studentNumber || row.studentId}`, "_blank")}
                            className="inline-flex h-6 items-center gap-1 border border-[#c5c5d3]/70 px-2 text-[10px] text-[#515f74] hover:bg-[#f2f3ff] hover:text-[#131b2e]"
                            title="Imprimer le reçu"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Reçu
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => toast.info(`Dossier ${row.dossier}`)}
                          className="inline-flex h-6 items-center gap-1 bg-[#1e3a8a] px-2 text-[10px] font-medium text-white hover:bg-[#00236f]"
                        >
                          Voir
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && !isLoading && (
          <div className="px-4 py-14 text-center">
            <XCircle className="mx-auto h-8 w-8 text-[#68758a]" />
            <p className="mt-2 text-[12px] font-medium text-[#131b2e]">Aucune inscription trouvée</p>
            <p className="mt-1 text-[11px] text-[#515f74]">Modifiez les filtres ou créez un nouveau dossier.</p>
            <button
              type="button"
              onClick={openInscription}
              className="mt-4 inline-flex h-8 items-center gap-1.5 border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium text-white"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Nouvelle inscription
            </button>
          </div>
        )}

        <div className="flex flex-col gap-2 border-t border-[#c5c5d3]/40 px-3 py-2 text-[11px] text-[#515f74] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Affichage de {rows.length ? ((page - 1) * 25) + 1 : 0} à {((page - 1) * 25) + rows.length} sur {total} inscriptions
          </span>
          <div className="flex items-center gap-1.5">
            <span>Lignes :</span>
            <span className="border border-[#c5c5d3]/70 bg-white px-2 py-1">25</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
              className="h-7 rounded px-2 text-[11px]"
            >
              Précédent
            </Button>
            <span className="inline-flex h-7 min-w-7 items-center justify-center bg-[#00236f] px-2 text-[11px] font-medium text-white">{page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages || totalPages === 0}
              className="h-7 rounded px-2 text-[11px]"
            >
              Suivant
            </Button>
          </div>
        </div>
      </section>

      <ChangerClasseModal
        isOpen={classChangeRow !== null}
        onClose={() => setClassChangeRow(null)}
        onSuccess={() => {
          setClassChangeRow(null)
          setRefreshKey((value) => value + 1)
        }}
        establishmentId={establishmentId}
        enrollmentId={classChangeRow?.id ?? ""}
        studentName={classChangeRow ? `${classChangeRow.lastName} ${classChangeRow.firstName}` : ""}
        currentClassName={classChangeRow?.className ?? "Aucune classe"}
        currentGradeLevelId={classChangeRow?.gradeLevelId || null}
        classes={classes}
      />

      <NouvelleInscriptionModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={onSuccess}
        typeInscription={modalType}
      />
    </div>
  )
}
