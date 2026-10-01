"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Search, Settings2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { payrollService } from "@/lib/supabase/services/payroll.service"
import { useUserContext } from "@/hooks/useUserContext"

const money = (n: number) => Number(n || 0).toLocaleString("fr-FR") + " FCFA"

type StaffRow = {
  establishment_id: string
  staff_type: string
  staff_id: string
  first_name: string
  last_name: string
  position?: string | null
  active?: boolean
  remuneration_type?: "fixed" | "hourly" | null
  monthly_salary?: number
  hourly_rate?: number
}

export default function ConfigurationSalairesPage() {
  const { etablissementActif } = useUserContext()
  const establishmentId = etablissementActif?.id
  const [rows, setRows] = useState<StaffRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<StaffRow | null>(null)
  const [remType, setRemType] = useState<"fixed" | "hourly">("fixed")
  const [salary, setSalary] = useState("")
  const [rate, setRate] = useState("")

  const load = async () => {
    if (!establishmentId) return
    try {
      setLoading(true)
      setRows(await payrollService.getStaff(establishmentId))
    } catch (error: any) {
      toast.error(error?.message || "Impossible de charger le personnel.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [establishmentId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return rows
    return rows.filter((row) =>
      `${row.first_name} ${row.last_name} ${row.position || ""}`.toLowerCase().includes(term)
    )
  }, [rows, search])

  const openEditor = (row: StaffRow) => {
    setEditing(row)
    setRemType(row.remuneration_type === "hourly" ? "hourly" : "fixed")
    setSalary(row.monthly_salary ? String(row.monthly_salary) : "")
    setRate(row.hourly_rate ? String(row.hourly_rate) : "")
  }

  const save = async () => {
    if (!establishmentId || !editing) return

    const value = remType === "fixed" ? Number(salary) : Number(rate)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(remType === "fixed" ? "Indiquez un salaire mensuel valide." : "Indiquez un taux horaire valide.")
      return
    }

    const key = `${editing.staff_type}:${editing.staff_id}`
    try {
      setSaving(key)
      await payrollService.saveCompensation({
        establishmentId,
        staffType: editing.staff_type,
        staffId: editing.staff_id,
        remunerationType: remType,
        monthlySalary: remType === "fixed" ? value : 0,
        hourlyRate: remType === "hourly" ? value : 0,
      })
      toast.success("Configuration du salaire enregistrée.")
      setEditing(null)
      await load()
    } catch (error: any) {
      toast.error(error?.message || "Impossible d'enregistrer la configuration.")
    } finally {
      setSaving(null)
    }
  }

  const configuredCount = rows.filter((row) => row.remuneration_type && (
    row.remuneration_type === "fixed" ? Number(row.monthly_salary) > 0 : Number(row.hourly_rate) > 0
  )).length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href="/ecole/finance/paie" className="inline-flex items-center gap-2 text-sm text-pierre hover:text-terre mb-3">
            <ArrowLeft className="h-4 w-4" /> Retour à la paie
          </Link>
          <h1 className="text-xl font-semibold">Configuration des salaires</h1>
          <p className="text-sm text-gray-500 mt-1">
            Définissez la rémunération de chaque membre du personnel avant de générer l'état de salaire.
          </p>
        </div>
        <div className="border rounded bg-white px-4 py-3 text-sm">
          <span className="text-gray-500">Personnel configuré</span>
          <span className="font-semibold ml-2">{configuredCount} / {rows.length}</span>
        </div>
      </div>

      <div className="border rounded bg-white p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium">Rémunération du personnel</p>
          <p className="text-xs text-gray-500 mt-1">Salaire fixe pour le personnel mensualisé ou taux horaire pour les vacataires.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un membre..." className="pl-9" />
        </div>
      </div>

      <div className="border rounded bg-white overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              {["Personnel", "Fonction", "Type de rémunération", "Montant", "État", ""].map((head) => (
                <th key={head} className="px-4 py-3 text-left font-medium">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-500">Chargement du personnel...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-500">Aucun membre du personnel trouvé.</td></tr>
            ) : filtered.map((row) => {
              const key = `${row.staff_type}:${row.staff_id}`
              const configured = row.remuneration_type === "hourly"
                ? Number(row.hourly_rate) > 0
                : Number(row.monthly_salary) > 0
              return (
                <tr key={key} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{row.first_name} {row.last_name}</td>
                  <td className="px-4 py-3">{row.position || "—"}</td>
                  <td className="px-4 py-3">
                    {row.remuneration_type === "hourly" ? "Taux horaire" : row.remuneration_type === "fixed" ? "Salaire fixe" : "Non configuré"}
                  </td>
                  <td className="px-4 py-3">
                    {configured
                      ? row.remuneration_type === "hourly"
                        ? `${money(Number(row.hourly_rate))} / heure`
                        : money(Number(row.monthly_salary))
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {configured ? (
                      <span className="inline-flex items-center gap-1 text-green-700"><Check className="h-4 w-4" /> Configuré</span>
                    ) : (
                      <span className="text-amber-700">À configurer</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEditor(row)}>
                      <Settings2 className="h-4 w-4 mr-2" />
                      {configured ? "Modifier" : "Configurer"}
                    </Button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded border w-full max-w-md p-5 space-y-4">
            <div>
              <h2 className="font-semibold">Salaire — {editing.first_name} {editing.last_name}</h2>
              <p className="text-sm text-gray-500 mt-1">{editing.position || "Personnel"}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button variant={remType === "fixed" ? "default" : "outline"} onClick={() => setRemType("fixed")}>Salaire fixe</Button>
              <Button variant={remType === "hourly" ? "default" : "outline"} onClick={() => setRemType("hourly")}>Taux horaire</Button>
            </div>

            {remType === "fixed" ? (
              <div>
                <label className="text-xs font-medium">Salaire mensuel</label>
                <Input type="number" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Ex. 150000" />
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium">Taux horaire</label>
                <Input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ex. 2500" />
              </div>
            )}

            <p className="text-xs text-gray-500">
              Le salaire configuré ici sera utilisé lors de la génération de l'état de salaire. Pour les personnels horaires, les heures proviennent du pointage validé.
            </p>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Annuler</Button>
              <Button onClick={save} disabled={!!saving}>
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
