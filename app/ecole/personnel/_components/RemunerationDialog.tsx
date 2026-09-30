"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { payrollService } from "@/lib/supabase/services/payroll.service"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  establishmentId: string
  staffId: string
  firstName: string
  lastName: string
  onSaved?: () => void
}

export function RemunerationDialog({ open, onOpenChange, establishmentId, staffId, firstName, lastName, onSaved }: Props) {
  const [type, setType] = useState<"fixed" | "hourly">("fixed")
  const [salary, setSalary] = useState("")
  const [rate, setRate] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    payrollService.getStaff(establishmentId)
      .then((staff) => {
        if (cancelled) return
        const item = staff.find((s: any) => s.staff_id === staffId)
        setType(item?.remuneration_type === "hourly" ? "hourly" : "fixed")
        setSalary(item?.monthly_salary ? String(item.monthly_salary) : "")
        setRate(item?.hourly_rate ? String(item.hourly_rate) : "")
      })
      .catch((error) => toast.error(error.message || "Impossible de charger la rémunération."))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, establishmentId, staffId])

  const save = async () => {
    const value = Number(type === "fixed" ? salary : rate)
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(type === "fixed" ? "Saisissez un salaire mensuel valide." : "Saisissez un taux horaire valide.")
      return
    }
    try {
      setSaving(true)
      await payrollService.saveCompensation({
        establishmentId,
        staffType: "staff",
        staffId,
        remunerationType: type,
        monthlySalary: type === "fixed" ? value : 0,
        hourlyRate: type === "hourly" ? value : 0,
      })
      toast.success("Rémunération enregistrée.")
      onOpenChange(false)
      onSaved?.()
    } catch (error: any) {
      toast.error(error.message || "Impossible d'enregistrer la rémunération.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rémunération — {firstName} {lastName}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <p className="py-6 text-sm text-gray-500">Chargement…</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant={type === "fixed" ? "default" : "outline"} onClick={() => setType("fixed")}>
                Salaire fixe
              </Button>
              <Button type="button" variant={type === "hourly" ? "default" : "outline"} onClick={() => setType("hourly")}>
                Taux horaire
              </Button>
            </div>
            {type === "fixed" ? (
              <div>
                <label className="text-sm font-medium">Salaire mensuel</label>
                <Input type="number" min="0" value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="Ex. 200000" />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Taux horaire</label>
                <Input type="number" min="0" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Ex. 2500" />
                <p className="mt-1 text-xs text-gray-500">Le salaire sera calculé à partir des heures validées du pointage.</p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
