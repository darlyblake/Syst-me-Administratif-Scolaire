"use client"

import { Check, CreditCard, FileText, ShoppingCart, CheckCircle } from "lucide-react"
import { Reveal } from "./Reveal"

const steps = [
  {
    icon: ShoppingCart,
    title: "Inscription",
    description: "Inscription de l'élève dans la classe.",
  },
  {
    icon: CreditCard,
    title: "Mode de paiement",
    description: "Sélection du mode (mensuel, tranches, unique).",
  },
  {
    icon: FileText,
    title: "Échéancier",
    description: "Calendrier automatique des paiements.",
  },
  {
    icon: Check,
    title: "Paiement",
    description: "Enregistrement des paiements reçus.",
  },
  {
    icon: CheckCircle,
    title: "Reçu",
    description: "Génération du reçu de paiement.",
  },
]

export function PaymentWorkflow() {
  return (
    <section className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
        <Reveal>
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-slate-500">Scolarité et paiements</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Une gestion fluide des paiements.
            </h2>
            <p className="mt-4 text-slate-600">
              De l'inscription au reçu, chaque étape du paiement est clarifiée. Les tarifs sont définis par niveau et les modes de paiement sont configurés par l'établissement.
            </p>
          </div>
        </Reveal>

        {/* Payment Flow Diagram */}
        <div className="mt-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {steps.map(({ icon: Icon, title, description }, i) => (
              <Reveal key={title} delay={i * 80}>
                <div className="group rounded-2xl border border-slate-200 bg-[#fafaf8] p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-5 text-slate-500">{description}</p>

                  {i < steps.length - 1 && (
                    <div className="mt-4 flex h-1 items-center overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-1/2 bg-slate-950" />
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Payment Options */}
        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          <Reveal delay={100}>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#fafaf8] to-white p-8">
              <div className="mb-6 h-2 w-12 rounded-full bg-slate-950" />
              <h3 className="text-lg font-semibold">Paiement mensuel</h3>
              <p className="mt-3 text-sm text-slate-600">
                Plusieurs versements réguliers tout au long de l'année scolaire.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>Flexible</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>Régulier</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#fafaf8] to-white p-8">
              <div className="mb-6 h-2 w-12 rounded-full bg-slate-950" />
              <h3 className="text-lg font-semibold">Paiement par tranches</h3>
              <p className="mt-3 text-sm text-slate-600">
                Calendrier personnalisé défini par l'établissement pour chaque niveau.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>Personnalisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>Clair</span>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-[#fafaf8] to-white p-8">
              <div className="mb-6 h-2 w-12 rounded-full bg-slate-950" />
              <h3 className="text-lg font-semibold">Paiement unique</h3>
              <p className="mt-3 text-sm text-slate-600">
                Une seule transaction pour l'année scolaire complète.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>Simplifié</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-slate-950" />
                  <span>Unique</span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
