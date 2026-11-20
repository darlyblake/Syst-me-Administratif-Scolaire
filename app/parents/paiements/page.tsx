"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowDownLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  CreditCard,
  Receipt,
  Wallet,
} from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { PresenceScene } from "@/components/parent/PresenceScene"

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
    ? "Mensuel"
    : mode === "installments"
      ? "Par tranches"
      : mode === "single"
        ? "En une fois"
        : "Non précisé"

const frenchLabel = (label: string) => {
  const months: Record<string, string> = {
    January: "Janvier", February: "Février", March: "Mars",
    April: "Avril", May: "Mai", June: "Juin",
    July: "Juillet", August: "Août", September: "Septembre",
    October: "Octobre", November: "Novembre", December: "Décembre",
  }
  return label.replace(
    /January|February|March|April|May|June|July|August|September|October|November|December/g,
    (month) => months[month] ?? month,
  )
}

const dateLabel = (value: string) =>
  new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
  })

type Section = "echeances" | "historique" | "options"

export default function ParentPaiements() {
  const {
    loading,
    error,
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
  const [section, setSection] = useState<Section>("echeances")
  const [newPaymentId, setNewPaymentId] = useState<string | null>(null)
  const knownPaymentIds = useRef<Set<string> | null>(null)

  const selectedChildren = allowed.filter(
    (child) => childId === "tous" || child.id === childId,
  )
  const enrollmentIds = new Set(
    selectedChildren.map((child) => child.enrollment_id).filter(Boolean),
  )
  const schedules = paymentSchedules.filter((schedule) =>
    enrollmentIds.has(schedule.enrollment_id),
  )
  const list = payments
    .filter((payment) => enrollmentIds.has(payment.enrollment_id))
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const options = enrollmentOptions.filter((option) =>
    enrollmentIds.has(option.enrollment_id),
  )

  // Le portail reçoit les paiements en temps réel. On repère uniquement les
  // nouvelles lignes après le premier chargement pour animer le versement entrant.
  useEffect(() => {
    if (loading) return
    const currentIds = new Set(payments.map((payment) => payment.id))
    if (knownPaymentIds.current === null) {
      knownPaymentIds.current = currentIds
      return
    }
    const incoming = payments.find((payment) => !knownPaymentIds.current?.has(payment.id))
    knownPaymentIds.current = currentIds
    if (!incoming) return

    setNewPaymentId(incoming.id)
    const timeout = window.setTimeout(() => setNewPaymentId(null), 5200)
    return () => window.clearTimeout(timeout)
  }, [loading, payments])

  const tuitionSchedules = useMemo(() => {
    const rows = schedules.filter((schedule) => schedule.category !== "option")
    return [...rows].sort((a, b) => {
      const aRegistration = a.category === "registration" || /inscription/i.test(a.label)
      const bRegistration = b.category === "registration" || /inscription/i.test(b.label)
      if (aRegistration !== bRegistration) return aRegistration ? -1 : 1
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    })
  }, [schedules])
  const optionSchedules = schedules.filter((schedule) => schedule.category === "option")

  // Les échéances de la famille sont classées par priorité : retard, partiel,
  // à venir. Les prises en charge externes restent dans leur rubrique dédiée.
  const familyTuitionSchedules = tuitionSchedules.filter(
    (schedule) => (schedule.payer_type ?? "family") === "family",
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const overdueSchedules = familyTuitionSchedules.filter((schedule) => {
    const dueDate = new Date(schedule.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return schedule.status !== "paid" && schedule.amount_due > schedule.amount_paid && dueDate < today
  })
  const partialSchedules = familyTuitionSchedules.filter(
    (schedule) => schedule.status !== "paid" && schedule.amount_paid > 0 && schedule.amount_due > schedule.amount_paid &&
      !overdueSchedules.some((item) => item.id === schedule.id),
  )
  const upcomingSchedules = familyTuitionSchedules.filter((schedule) => {
    const dueDate = new Date(schedule.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return schedule.status !== "paid" && schedule.amount_due > schedule.amount_paid && dueDate >= today
  })
  const settledSchedules = familyTuitionSchedules.filter(
    (schedule) => schedule.amount_due <= schedule.amount_paid || schedule.status === "paid",
  )
  const attentionCount = overdueSchedules.length + partialSchedules.length + upcomingSchedules.length

  // Une échéance future n'est pas encore exigible : l'avatar ne passe en alerte
  // que lorsqu'une échéance arrivée à date reste partiellement ou totalement due.
  const dueNowUnpaidSchedules = familyTuitionSchedules.filter((schedule) => {
    const dueDate = new Date(schedule.due_date)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate <= today && schedule.amount_due - schedule.amount_paid > 0.01
  })
  const paymentStatusUpToDate = dueNowUnpaidSchedules.length === 0


  const modes = [...new Set(selectedChildren.map((child) => child.payment_mode).filter(Boolean))]
  const modeLabel = modes.length === 1
    ? paymentModeLabel(modes[0])
    : modes.length > 1 ? "Selon le niveau" : paymentModeLabel()

  const familySchedules = schedules.filter((schedule) => (schedule.payer_type ?? "family") === "family")
  const stateSchedules = schedules.filter((schedule) => schedule.payer_type === "state")
  const otherSchedules = schedules.filter((schedule) => schedule.payer_type === "other")
  const due = familySchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)
  const paid = familySchedules.reduce((sum, schedule) => sum + schedule.amount_paid, 0)
  const remaining = Math.max(due - paid, 0)
  const progress = due > 0 ? Math.min((paid / due) * 100, 100) : 0
  const stateCovered = stateSchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)
  const organizationSchedules = otherSchedules.filter((schedule) => Boolean(schedule.organization_id))
  const exemptionSchedules = otherSchedules.filter((schedule) => !schedule.organization_id)
  const organizationDue = organizationSchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)
  const organizationPaid = organizationSchedules.reduce((sum, schedule) => sum + schedule.amount_paid, 0)
  const statePaid = stateSchedules.reduce((sum, schedule) => sum + schedule.amount_paid, 0)
  const stateRemaining = stateSchedules.reduce((sum, schedule) => sum + Math.max(schedule.amount_due - schedule.amount_paid, 0), 0)
  const organizationRemaining = organizationSchedules.reduce((sum, schedule) => sum + Math.max(schedule.amount_due - schedule.amount_paid, 0), 0)
  const exempted = exemptionSchedules.reduce((sum, schedule) => sum + schedule.amount_due, 0)

  const paymentDetails = (payment: (typeof list)[number]) => {
    const child = children.find((item) => item.enrollment_id === payment.enrollment_id)
    const allocation = paymentAllocations.find((item) => item.payment_id === payment.id)
    const schedule = allocation
      ? paymentSchedules.find((item) => item.id === allocation.payment_schedule_id)
      : undefined
    const label = schedule
      ? frenchLabel(schedule.label)
      : payment.category === "option"
        ? "Option"
        : payment.category === "registration"
          ? "Frais d'inscription"
          : "Scolarité"
    return { child, label }
  }

  const sectionTabs: { id: Section; label: string; count?: number }[] = [
    { id: "echeances", label: "Échéances", count: attentionCount },
    { id: "historique", label: "Versements", count: list.length },
    { id: "options", label: "Options", count: options.length },
  ]

  return (
    <div className="space-y-5 pb-4">
      <style>{`
        @keyframes payment-arrive {
          0% { opacity: 0; transform: translateY(14px) scale(.985); background: #e8f5ff; }
          55% { opacity: 1; transform: translateY(0) scale(1); background: #e8f5ff; }
          100% { opacity: 1; transform: translateY(0) scale(1); background: #fff; }
        }
        .payment-arrived { animation: payment-arrive 1.1s cubic-bezier(.2,.75,.25,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .payment-arrived { animation: none; outline: 2px solid #0284c7; outline-offset: -2px; }
        }
      `}</style>

      <ParentPageHeader
        eyebrow="Espace famille"
        title="Paiements"
        description="Comprenez en un coup d’œil ce qui est réglé et ce qu’il reste à payer."
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ParentChildSelect
              children={allowed}
              value={childId}
              onChange={setChildId}
              financeOnly
            />
            <span className="text-xs font-medium text-slate-500">Paiement {modeLabel.toLowerCase()}</span>
          </div>

          {familyTuitionSchedules.length > 0 && (
            <section
              aria-live="polite"
              className={`flex flex-col items-center gap-2 rounded-[22px] border px-4 py-4 text-center sm:flex-row sm:gap-4 sm:px-5 sm:text-left ${paymentStatusUpToDate ? "border-emerald-100 bg-[#f4fbf7]" : "border-amber-200 bg-[#fffaf3]"}`}
            >
              <div className="w-full shrink-0 sm:w-[150px]">
                <PresenceScene kind={paymentStatusUpToDate ? "payment-ok" : "payment-attention"} />
              </div>
              <div className="min-w-0">
                <p className={`text-sm font-bold ${paymentStatusUpToDate ? "text-emerald-800" : "text-amber-900"}`}>
                  {paymentStatusUpToDate ? "Scolarité à jour" : "Une échéance reste à régler"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {paymentStatusUpToDate
                    ? "Toutes les échéances arrivées à échéance sont réglées. Bravo, votre situation est à jour."
                    : `${dueNowUnpaidSchedules.length} échéance${dueNowUnpaidSchedules.length > 1 ? "s" : ""} arrivée${dueNowUnpaidSchedules.length > 1 ? "s" : ""} à échéance demande${dueNowUnpaidSchedules.length > 1 ? "nt" : ""} encore votre attention.`}
                </p>
                {!paymentStatusUpToDate && (
                  <p className="mt-1.5 text-xs font-semibold tabular-nums text-amber-800">
                    Reste à régler sur ces échéances : {money(dueNowUnpaidSchedules.reduce((sum, schedule) => sum + Math.max(schedule.amount_due - schedule.amount_paid, 0), 0))}
                  </p>
                )}
              </div>
            </section>
          )}

          <section className="overflow-hidden rounded-[24px] border border-[#dce8f5] bg-white shadow-sm">
            <div className="bg-[#0b3158] px-5 py-5 text-white sm:px-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-blue-100">Reste à la charge de la famille</p>
                  <p className="mt-2 text-[clamp(1.8rem,7vw,2.5rem)] font-bold tracking-tight">{money(remaining)}</p>
                </div>
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10">
                  <Wallet className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="mt-5">
                <div className="mb-2 flex justify-between text-xs text-blue-100">
                  <span>Progression de la scolarité</span>
                  <strong className="text-white">{Math.round(progress)} %</strong>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-[#72d6b0] transition-[width] duration-700" style={{ width: progress + "%" }} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="px-5 py-4 sm:px-6">
                <p className="text-xs text-slate-500">Montant prévu</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{money(due)}</p>
              </div>
              <div className="px-5 py-4 sm:px-6">
                <p className="text-xs text-slate-500">Déjà réglé</p>
                <p className="mt-1 text-base font-semibold text-emerald-700">{money(paid)}</p>
              </div>
            </div>
          </section>

          {selectedChildren.length === 1 && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">
                {selectedChildren[0].first_name} {selectedChildren[0].last_name}
              </span>
              <span>·</span><span>{selectedChildren[0].level_name ?? "Niveau non renseigné"}</span>
              <span>·</span><span>{selectedChildren[0].class_name ?? "Classe non renseignée"}</span>
              <span>·</span><span>{selectedChildren[0].academic_year_name ?? "Année non renseignée"}</span>
            </div>
          )}
          {selectedChildren.length > 1 && (
            <p className="text-xs text-slate-500">Vue regroupée pour vos enfants autorisés. Chaque échéancier conserve son propre tarif.</p>
          )}

          {(stateCovered > 0 || organizationDue > 0 || exempted > 0) && (
            <details className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-700">
                Voir les prises en charge et exonérations
                <ChevronRight className="ml-2 inline h-4 w-4" />
              </summary>
              <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                {stateCovered > 0 && <p>État : {money(statePaid)} réglés sur {money(stateCovered)} · reste {money(stateRemaining)}</p>}
                {organizationDue > 0 && <p>Organismes : {money(organizationPaid)} réglés sur {money(organizationDue)} · reste {money(organizationRemaining)}</p>}
                {exempted > 0 && <p>Montant exonéré : {money(exempted)}</p>}
                <p className="text-slate-400">Ces montants ne sont pas ajoutés à la dette de la famille.</p>
              </div>
            </details>
          )}

          <div className="flex rounded-2xl bg-[#eaf1f8] p-1" role="tablist" aria-label="Sections des paiements">
            {sectionTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={section === tab.id}
                onClick={() => setSection(tab.id)}
                className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-all sm:text-sm ${section === tab.id ? "bg-white text-[#124a78] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
              >
                {tab.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${section === tab.id ? "bg-blue-50 text-blue-800" : "bg-slate-200/70 text-slate-500"}`}>{tab.count}</span>
              </button>
            ))}
          </div>

          {section === "echeances" && (
            <section className="space-y-5">
              <div className="px-1">
                <h2 className="text-base font-semibold text-slate-900">Vos échéances</h2>
                <p className="mt-0.5 text-xs text-slate-500">Les paiements à suivre apparaissent en premier. Les échéances réglées restent consultables plus bas.</p>
              </div>

              {attentionCount === 0 && settledSchedules.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-9 text-center text-sm text-slate-500">
                  Aucune échéance de scolarité disponible.
                </div>
              ) : (
                <div className="space-y-5">
                  {overdueSchedules.length > 0 && (
                    <section className="space-y-2" aria-labelledby="overdue-title">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <h3 id="overdue-title" className="text-sm font-semibold text-red-700">En retard</h3>
                          <p className="text-xs text-slate-500">Ces échéances demandent votre attention.</p>
                        </div>
                        <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">{overdueSchedules.length}</span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-red-100 bg-white">
                        {overdueSchedules.map((schedule) => {
                          const rest = Math.max(schedule.amount_due - schedule.amount_paid, 0)
                          return (
                            <article key={schedule.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600"><Clock3 className="h-5 w-5" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{frenchLabel(schedule.label)}</p>
                                <p className="mt-1 text-xs text-red-600">Échéance du {dateLabel(schedule.due_date)}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-slate-900">{money(rest)}</p>
                                <p className="mt-1 text-[11px] text-red-600">Reste à payer</p>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {partialSchedules.length > 0 && (
                    <section className="space-y-2" aria-labelledby="partial-title">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <h3 id="partial-title" className="text-sm font-semibold text-amber-700">Partiellement réglées</h3>
                          <p className="text-xs text-slate-500">Un versement a déjà été enregistré.</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{partialSchedules.length}</span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-amber-100 bg-white">
                        {partialSchedules.map((schedule) => {
                          const rest = Math.max(schedule.amount_due - schedule.amount_paid, 0)
                          return (
                            <article key={schedule.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Wallet className="h-5 w-5" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{frenchLabel(schedule.label)}</p>
                                <p className="mt-1 text-xs text-slate-500">{money(schedule.amount_paid)} réglés sur {money(schedule.amount_due)}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-bold text-slate-900">{money(rest)}</p>
                                <p className="mt-1 text-[11px] text-slate-500">Reste à payer</p>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {upcomingSchedules.length > 0 && (
                    <section className="space-y-2" aria-labelledby="upcoming-title">
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <h3 id="upcoming-title" className="text-sm font-semibold text-[#124a78]">À venir</h3>
                          <p className="text-xs text-slate-500">Les prochaines dates de règlement.</p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{upcomingSchedules.length}</span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        {upcomingSchedules.map((schedule) => {
                          const rest = Math.max(schedule.amount_due - schedule.amount_paid, 0)
                          return (
                            <article key={schedule.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Clock3 className="h-5 w-5" /></div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-slate-900">{frenchLabel(schedule.label)}</p>
                                <p className="mt-1 text-xs text-slate-500">À régler avant le {dateLabel(schedule.due_date)}</p>
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-slate-900">{money(rest)}</p>
                                <p className="mt-1 text-[11px] text-slate-500">À payer</p>
                              </div>
                            </article>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {settledSchedules.length > 0 && (
                    <details className="overflow-hidden rounded-2xl border border-emerald-100 bg-white">
                      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          Déjà réglées
                        </span>
                        <span className="flex items-center gap-2 text-xs text-slate-500">
                          {settledSchedules.length} échéance(s) <ChevronRight className="h-4 w-4" />
                        </span>
                      </summary>
                      <div className="border-t border-slate-100">
                        {settledSchedules.map((schedule) => (
                          <article key={schedule.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Check className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{frenchLabel(schedule.label)}</p>
                              <p className="mt-1 text-xs text-slate-500">{dateLabel(schedule.due_date)} · Réglée</p>
                            </div>
                            <p className="shrink-0 text-sm font-semibold text-emerald-700">{money(schedule.amount_due)}</p>
                          </article>
                        ))}
                      </div>
                    </details>
                  )}

                  {attentionCount === 0 && settledSchedules.length > 0 && (
                    <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      Toutes vos échéances de scolarité sont réglées.
                    </p>
                  )}
                </div>
              )}
            </section>
          )}

          {section === "historique" && (
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Versements reçus</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Les règlements transmis par l’établissement.</p>
                </div>

              </div>

              {newPaymentId && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status" aria-live="polite">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                  <span><strong>Nouveau paiement reçu.</strong><br /><span className="text-xs">L’historique vient d’être actualisé.</span></span>
                </div>
              )}

              {list.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center">
                  <Receipt className="mx-auto h-7 w-7 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Aucun versement pour le moment</p>
                  <p className="mt-1 text-xs text-slate-500">Les paiements enregistrés par l’établissement apparaîtront ici.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {list.map((payment) => {
                    const { child, label } = paymentDetails(payment)
                    const arrived = payment.id === newPaymentId
                    return (
                      <article key={payment.id} className={`flex items-start gap-3 border-b border-slate-100 px-4 py-4 last:border-0 ${arrived ? "payment-arrived" : ""}`}>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                          {arrived ? <CheckCircle2 className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{label}</p>
                          <p className="mt-1 text-xs text-slate-500">{child ? child.first_name + " " + child.last_name : "Élève"} · {dateLabel(payment.payment_date)}</p>
                          <p className="mt-1 text-xs text-slate-400">{payment.method ? methods[payment.method] ?? payment.method : "Mode non précisé"}{payment.reference ? " · Réf. " + payment.reference : ""}</p>
                          {arrived && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> Reçu à l’instant</span>}
                        </div>
                        <p className="shrink-0 text-sm font-bold text-emerald-700">+ {money(payment.amount)}</p>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {section === "options" && (
            <section className="space-y-3">
              <div className="px-1">
                <h2 className="text-base font-semibold text-slate-900">Options et services</h2>
                <p className="mt-0.5 text-xs text-slate-500">Les frais complémentaires liés à chaque inscription.</p>
              </div>
              {options.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-9 text-center text-sm text-slate-500">Aucune option associée à cette inscription.</div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {options.map((option) => {
                    const optionRows = optionSchedules.filter((schedule) => schedule.enrollment_id === option.enrollment_id && schedule.label === option.name)
                    const optionPaid = optionRows.reduce((sum, schedule) => sum + schedule.amount_paid, 0)
                    const optionDue = optionRows.length ? optionRows.reduce((sum, schedule) => sum + schedule.amount_due, 0) : option.amount
                    const rest = Math.max(optionDue - optionPaid, 0)
                    return (
                      <article key={option.id} className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 last:border-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><CreditCard className="h-5 w-5" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">{option.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{option.required ? "Obligatoire" : "Facultative"} · {rest === 0 ? "Réglée" : optionPaid > 0 ? "Partiellement réglée" : "À payer"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-slate-900">{money(optionDue)}</p>
                          <p className="mt-1 text-[11px] text-slate-500">Reste {money(rest)}</p>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {paymentAllocations.length > 0 && (
            <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
              <Receipt className="mt-0.5 h-4 w-4 shrink-0" />
              Les versements peuvent être répartis sur plusieurs échéances. Les montants affichés tiennent compte des affectations enregistrées.
            </p>
          )}
        </>
      )}
    </div>
  )
}
