"use client"

import { useMemo, useState } from "react"
import { Receipt } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"

const money = (n: number) => new Intl.NumberFormat("fr-FR").format(n) + " FCFA"

const methods: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèque",
  virement: "Virement",
  mobile: "Mobile Money",
  mobile_money: "Mobile Money",
}

const paymentModeLabel = (mode?: string) =>
  mode === "monthly"
    ? "Paiement mensuel"
    : mode === "installments"
      ? "Paiement par tranches"
      : mode === "single"
        ? "Paiement en une fois"
        : "Mode non précisé"

const frenchLabel = (label: string) => {
  const months: Record<string, string> = {
    January: "Janvier",
    February: "Février",
    March: "Mars",
    April: "Avril",
    May: "Mai",
    June: "Juin",
    July: "Juillet",
    August: "Août",
    September: "Septembre",
    October: "Octobre",
    November: "Novembre",
    December: "Décembre",
  }
  return label.replace(
    /January|February|March|April|May|June|July|August|September|October|November|December/g,
    (month) => months[month] ?? month,
  )
}

const statusClass = (status: string) =>
  status === "Payée"
    ? "text-emerald-700"
    : status === "Partielle"
      ? "text-amber-700"
      : status === "En retard"
        ? "text-red-700"
        : "text-slate-500"

export default function ParentPaiements() {
  const {
    loading,
    error,
    refresh,
    children,
    payments,
    paymentSchedules,
    paymentAllocations,
    enrollmentOptions,
  } = useParentPortal()

  const allowed = useMemo(
    () => children.filter((child) => child.can_view_finance),
    [children],
  )
  const [childId, setChildId] = useState("tous")
  const [section, setSection] = useState<"echeances" | "historique" | "options">("echeances")

  const selectedChildren = allowed.filter(
    (child) => childId === "tous" || child.id === childId,
  )
  const enrollmentIds = new Set(
    selectedChildren.map((child) => child.enrollment_id).filter(Boolean),
  )
  const schedules = paymentSchedules.filter((schedule) =>
    enrollmentIds.has(schedule.enrollment_id),
  )
  const list = payments.filter((payment) => enrollmentIds.has(payment.enrollment_id))
  const options = enrollmentOptions.filter((option) =>
    enrollmentIds.has(option.enrollment_id),
  )
  const tuitionSchedules = useMemo(() => {
    const rows = schedules.filter((schedule) => schedule.category !== "option")
    return [...rows].sort((a, b) => {
      const aRegistration = a.category === "registration" || /inscription/i.test(a.label)
      const bRegistration = b.category === "registration" || /inscription/i.test(b.label)

      // Présentation de la scolarité : inscription en premier,
      // puis les échéances mensuelles dans l'ordre chronologique.
      if (aRegistration !== bRegistration) return aRegistration ? -1 : 1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }, [schedules])
  const optionSchedules = schedules.filter((schedule) => schedule.category === "option")

  const modes = [...new Set(selectedChildren.map((child) => child.payment_mode).filter(Boolean))]
  const modeLabel =
    modes.length === 1
      ? paymentModeLabel(modes[0])
      : modes.length > 1
        ? "Mode selon le niveau de chaque enfant"
        : paymentModeLabel()

  const familySchedules = schedules.filter((schedule) => (schedule.payer_type ?? "family") === "family")
  const stateSchedules = schedules.filter((schedule) => schedule.payer_type === "state")
  const otherSchedules = schedules.filter((schedule) => schedule.payer_type === "other")
  const due = familySchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)
  const paid = familySchedules.reduce((sum, schedule) => sum + schedule.amount_paid, 0)
  const stateCovered = stateSchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)
  const exempted = otherSchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)

  return (
    <div className="space-y-7">
      <ParentPageHeader
        eyebrow="Scolarité"
        title="Paiements"
        description="Suivez les versements, les échéances et le reste à payer."
        onRefresh={() => void refresh()}
        refreshing={loading}
      />

      {error && (
        <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && allowed.length === 0 ? (
        <ParentEmptyState
          title="Situation financière non disponible"
          description="Votre compte n’a pas actuellement l’autorisation de consulter les paiements."
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <ParentChildSelect
                children={allowed}
                value={childId}
                onChange={setChildId}
                financeOnly
              />
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                <span className="font-medium text-slate-700">{modeLabel}</span>
                <span>
                  Dû <strong className="text-slate-900">{money(due)}</strong>
                </span>
                <span>
                  Payé <strong className="text-emerald-700">{money(paid)}</strong>
                </span>
                <span>
                  Reste à charge familial{" "}
                  <strong className="text-slate-900">{money(Math.max(due - paid, 0))}</strong>
                </span>
              </div>
            </div>

            {(stateCovered > 0 || exempted > 0) && (
              <p className="text-xs text-slate-500">
                {stateCovered > 0 && <>Montant pris en charge par l’État : <strong className="text-slate-800">{money(stateCovered)}</strong>. </>}
                {exempted > 0 && <>Montant exonéré ou couvert par un autre organisme : <strong className="text-slate-800">{money(exempted)}</strong>.</>}
                Ces montants ne sont pas ajoutés à la dette de la famille.
              </p>
            )}

            {selectedChildren.length === 1 && (
              <p className="text-sm text-slate-500">
                Niveau :{" "}
                <strong className="text-slate-800">
                  {selectedChildren[0].level_name ?? "Non renseigné"}
                </strong>{" "}
                · Classe :{" "}
                <strong className="text-slate-800">
                  {selectedChildren[0].class_name ?? "Non renseignée"}
                </strong>{" "}
                · Année :{" "}
                <strong className="text-slate-800">
                  {selectedChildren[0].academic_year_name ?? "Non renseignée"}
                </strong>
              </p>
            )}

            {selectedChildren.length > 1 && (
              <p className="text-sm text-slate-500">
                Les échéances sont calculées selon le niveau et le plan de scolarité propres à chaque enfant.
              </p>
            )}
          </div>

          <div className="flex border-b border-slate-200" role="tablist" aria-label="Paiements">
            <button
              type="button"
              role="tab"
              aria-selected={section === "echeances"}
              onClick={() => setSection("echeances")}
              className={"border-b-2 px-4 py-3 text-sm font-semibold " + (section === "echeances" ? "border-terre text-terre" : "border-transparent text-slate-500 hover:text-slate-900")}
            >
              Échéances
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "historique"}
              onClick={() => setSection("historique")}
              className={"border-b-2 px-4 py-3 text-sm font-semibold " + (section === "historique" ? "border-terre text-terre" : "border-transparent text-slate-500 hover:text-slate-900")}
            >
              Historique des versements
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={section === "options"}
              onClick={() => setSection("options")}
              className={"border-b-2 px-4 py-3 text-sm font-semibold " + (section === "options" ? "border-terre text-terre" : "border-transparent text-slate-500 hover:text-slate-900")}
            >
              Options
            </button>
          </div>

          {section === "echeances" && (
            <section className="border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 font-semibold text-slate-900">
                Échéances
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Échéance</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Dû</th>
                      <th className="px-4 py-3">Payé</th>
                      <th className="px-4 py-3">Reste</th>
                      <th className="px-4 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terre/10">
                    {tuitionSchedules.map((schedule) => {
                      const payer = schedule.payer_type ?? "family"
                      const rest = payer === "family" ? Math.max(schedule.amount_due - schedule.amount_paid, 0) : 0
                      const status = payer === "state" ? "Prise en charge État" : payer === "other" ? "Exonérée / autre organisme" : schedule.status === "paid" || rest === 0 ? "Payée" : schedule.amount_paid > 0 ? "Partielle" : new Date(schedule.due_date) < new Date() ? "En retard" : "À venir"
                      return (
                        <tr key={schedule.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">{frenchLabel(schedule.label)}{payer !== "family" && <span className="mt-1 block text-xs font-normal text-slate-500">{payer === "state" ? "Payeur : État" : "Exonération / autre organisme"}</span>}</td>
                          <td className="px-4 py-3">{new Date(schedule.due_date).toLocaleDateString("fr-FR")}</td>
                          <td className="px-4 py-3">{money(schedule.amount_due)}</td>
                          <td className="px-4 py-3 text-emerald-700">{payer === "family" ? money(schedule.amount_paid) : "—"}</td>
                          <td className="px-4 py-3 font-semibold">{payer === "family" ? money(rest) : "—"}</td>
                          <td className={"px-4 py-3 font-medium " + statusClass(status)}>{status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {tuitionSchedules.length === 0 && (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    Aucune échéance de scolarité disponible.
                  </p>
                )}
              </div>
            </section>
          )}

          {section === "historique" && (
            <section className="border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="font-semibold text-slate-900">Historique des versements</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Chaque versement enregistré par l’établissement apparaît ici.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Élève</th>
                      <th className="px-4 py-3">Affecté à</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Référence</th>
                      <th className="px-4 py-3 text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terre/10">
                    {list.map((payment) => {
                      const child = children.find((item) => item.enrollment_id === payment.enrollment_id)
                      const allocation = paymentAllocations.find((item) => item.payment_id === payment.id)
                      const schedule = allocation
                        ? paymentSchedules.find((item) => item.id === allocation.payment_schedule_id)
                        : undefined
                      const allocationLabel = schedule
                        ? frenchLabel(schedule.label)
                        : payment.category === "option"
                          ? "Option"
                          : payment.category === "registration"
                            ? "Frais d'inscription"
                            : "Scolarité"
                      return (
                        <tr key={payment.id}>
                          <td className="px-4 py-3">{new Date(payment.payment_date).toLocaleDateString("fr-FR")}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {child ? child.first_name + " " + child.last_name : "—"}
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{allocationLabel}</td>
                          <td className="px-4 py-3">{payment.method ? methods[payment.method] ?? payment.method : "—"}</td>
                          <td className="px-4 py-3 text-slate-500">{payment.reference ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">+ {money(payment.amount)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {list.length === 0 && (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">Aucun paiement enregistré.</p>
                )}
              </div>
            </section>
          )}

          {section === "options" && (
            <section className="border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <h2 className="font-semibold text-slate-900">Options</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Suivez les options associées à l’inscription et leur règlement.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Option</th>
                      <th className="px-4 py-3">Montant</th>
                      <th className="px-4 py-3">Payé</th>
                      <th className="px-4 py-3">Reste</th>
                      <th className="px-4 py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-terre/10">
                    {options.map((option) => {
                      const schedulesForOption = optionSchedules.filter(
                        (schedule) =>
                          schedule.enrollment_id === option.enrollment_id &&
                          schedule.label === option.name,
                      )
                      const optionPaid = schedulesForOption.reduce((sum, schedule) => sum + schedule.amount_paid, 0)
                      const optionDue = schedulesForOption.length
                        ? schedulesForOption.reduce((sum, schedule) => sum + schedule.amount_due, 0)
                        : option.amount
                      const rest = Math.max(optionDue - optionPaid, 0)
                      const status = rest === 0 ? "Payée" : optionPaid > 0 ? "Partielle" : "À payer"
                      return (
                        <tr key={option.id}>
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {option.name}
                            {option.required && <span className="ml-2 text-xs text-slate-500">Obligatoire</span>}
                          </td>
                          <td className="px-4 py-3">{money(optionDue)}</td>
                          <td className="px-4 py-3 text-emerald-700">{money(optionPaid)}</td>
                          <td className="px-4 py-3 font-semibold">{money(rest)}</td>
                          <td className={"px-4 py-3 font-medium " + statusClass(status)}>{status}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {options.length === 0 && (
                  <p className="px-5 py-10 text-center text-sm text-slate-500">
                    Aucune option associée à cette inscription.
                  </p>
                )}
              </div>
            </section>
          )}

          {paymentAllocations.length > 0 && (
            <p className="flex items-center gap-2 border-t border-slate-200 pt-4 text-sm text-slate-500">
              <Receipt className="h-4 w-4" />
              Les versements partiels sont répartis sur les échéances selon les allocations enregistrées.
            </p>
          )}
        </>
      )}
    </div>
  )
}
