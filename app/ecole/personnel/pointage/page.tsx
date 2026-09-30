"use client"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useUserContext } from "@/hooks/useUserContext"
import { payrollService } from "@/lib/supabase/services/payroll.service"
import { supabaseBrowser } from "@/lib/supabase/client"
import { Save, Clock3 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

type StaffRow = { staff_id: string; staff_type: string; first_name: string; last_name: string; position?: string | null; remuneration_type?: "fixed" | "hourly" | null; hourly_rate?: number | null }
type Entry = { id?: string; staff_id: string; staff_type: string; check_in: string; check_out: string; status: "present" | "late" | "absent" | "excused"; notes: string }

export default function PersonnelPointagePage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [staff, setStaff] = useState<StaffRow[]>([])
  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!establishmentId) return
    setLoading(true)
    try {
      const rows = (await payrollService.getStaff(establishmentId)) as StaffRow[]
      setStaff(rows)
      const { data, error } = await supabaseBrowser.from("staff_attendance").select("id,staff_id,staff_type,check_in,check_out,status,notes").eq("establishment_id", establishmentId).eq("attendance_date", date)
      if (error) throw error
      const next: Record<string, Entry> = {}
      for (const row of data ?? []) next[row.staff_id] = { id: row.id, staff_id: row.staff_id, staff_type: row.staff_type, check_in: row.check_in ? String(row.check_in).slice(0, 5) : "", check_out: row.check_out ? String(row.check_out).slice(0, 5) : "", status: row.status, notes: row.notes ?? "" }
      setEntries(next)
    } catch (e: any) { toast.error(e.message || "Impossible de charger le pointage.") }
    finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [establishmentId, date])

  const update = (person: StaffRow, patch: Partial<Entry>) => setEntries(prev => ({ ...prev, [person.staff_id]: { staff_id: person.staff_id, staff_type: person.staff_type, check_in: prev[person.staff_id]?.check_in ?? "", check_out: prev[person.staff_id]?.check_out ?? "", status: prev[person.staff_id]?.status ?? "present", notes: prev[person.staff_id]?.notes ?? "", ...patch } }))

  const save = async () => {
    if (!establishmentId) return
    setSaving(true)
    try {
      for (const person of staff) {
        const e = entries[person.staff_id]
        if (!e) continue
        const payload = { establishment_id: establishmentId, staff_type: person.staff_type, staff_id: person.staff_id, attendance_date: date, check_in: e.check_in ? e.check_in + ":00" : null, check_out: e.check_out ? e.check_out + ":00" : null, status: e.status, notes: e.notes || null }
        const result = e.id ? await supabaseBrowser.from("staff_attendance").update(payload).eq("id", e.id).eq("establishment_id", establishmentId) : await supabaseBrowser.from("staff_attendance").upsert(payload, { onConflict: "establishment_id,staff_type,staff_id,attendance_date" })
        if (result.error) throw result.error
      }
      toast.success("Pointage enregistré.")
      await load()
    } catch (e: any) { toast.error(e.message || "Impossible d'enregistrer le pointage.") }
    finally { setSaving(false) }
  }

  const hours = useMemo(() => Object.values(entries).reduce((total, e) => {
    if (!e.check_in || !e.check_out) return total
    const [ih, im] = e.check_in.split(":").map(Number), [oh, om] = e.check_out.split(":").map(Number)
    return total + Math.max(0, (oh * 60 + om - ih * 60 - im) / 60)
  }, 0), [entries])

  return (
    <div className="min-h-screen p-4"><div className="max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div><Link href="/ecole/personnel" className="text-sm text-gray-500 hover:text-gray-900">← Personnel</Link><h1 className="text-2xl font-bold text-gray-900 mt-1">Pointage du personnel</h1><p className="text-sm text-gray-500">Les heures enregistrées servent au calcul des salaires horaires.</p></div>
        <div className="flex items-center gap-3"><Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-auto bg-white" /><Button onClick={save} disabled={saving || loading}><Save className="h-4 w-4 mr-2" />{saving ? "Enregistrement…" : "Enregistrer"}</Button></div>
      </div>
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between"><span className="text-sm text-gray-600">{staff.length} membre(s)</span><span className="text-sm font-medium"><Clock3 className="inline h-4 w-4 mr-1" />{hours.toFixed(2)} h saisies</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead className="bg-gray-50 border-b"><tr><th className="text-left px-4 py-3">Personnel</th><th className="text-left px-4 py-3">Fonction</th><th className="text-left px-4 py-3">Rémunération</th><th className="text-left px-4 py-3">Arrivée</th><th className="text-left px-4 py-3">Départ</th><th className="text-left px-4 py-3">Statut</th><th className="text-left px-4 py-3">Note</th></tr></thead>
          <tbody className="divide-y">{loading ? <tr><td colSpan={7} className="p-8 text-center text-gray-500">Chargement…</td></tr> : staff.map(person => { const e = entries[person.staff_id]; return <tr key={person.staff_id} className="hover:bg-gray-50">
            <td className="px-4 py-3 font-medium">{person.first_name} {person.last_name}</td><td className="px-4 py-3 text-gray-600">{person.position || "—"}</td><td className="px-4 py-3">{person.remuneration_type === "hourly" ? (Number(person.hourly_rate || 0).toLocaleString("fr-FR") + " FCFA/h") : "Fixe"}</td>
            <td className="px-4 py-3"><Input type="time" value={e?.check_in || ""} onChange={x => update(person, { check_in: x.target.value })} className="w-32" /></td><td className="px-4 py-3"><Input type="time" value={e?.check_out || ""} onChange={x => update(person, { check_out: x.target.value })} className="w-32" /></td>
            <td className="px-4 py-3"><select className="border rounded-md px-2 py-2 bg-white" value={e?.status || "present"} onChange={x => update(person, { status: x.target.value as Entry["status"] })}><option value="present">Présent</option><option value="late">En retard</option><option value="absent">Absent</option><option value="excused">Excusé</option></select></td>
            <td className="px-4 py-3"><Input value={e?.notes || ""} onChange={x => update(person, { notes: x.target.value })} placeholder="Note…" /></td>
          </tr> })}</tbody>
        </table></div>
      </div>
    </div></div>
  )
}
