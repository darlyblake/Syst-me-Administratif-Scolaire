"use client"

import { useEffect, useState } from "react"
import {
  Bell,
  Check,
  ChevronRight,
  Globe2,
  LockKeyhole,
  MonitorCog,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react"

const sections = [
  { id: "general", label: "Général", description: "Identité et préférences de la plateforme", icon: Settings2 },
  { id: "securite", label: "Sécurité", description: "Protection et accès administrateur", icon: ShieldCheck },
  { id: "notifications", label: "Notifications", description: "Alertes du centre d'administration", icon: Bell },
  { id: "interface", label: "Interface", description: "Apparence et comportement de NOVA", icon: Palette },
]

type SettingsState = {
  platformName: string
  country: string
  timezone: string
  language: string
  emailAlerts: boolean
  establishmentAlerts: boolean
  securityAlerts: boolean
  compactMode: boolean
}

const defaults: SettingsState = {
  platformName: "NOVA — Système de Gestion Scolaire",
  country: "Gabon",
  timezone: "Africa/Libreville",
  language: "Français",
  emailAlerts: true,
  establishmentAlerts: true,
  securityAlerts: true,
  compactMode: false,
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${checked ? "bg-primary" : "bg-muted-foreground/25"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${checked ? "left-6" : "left-1"}`} />
    </button>
  )
}

export default function Page() {
  const [active, setActive] = useState("general")
  const [settings, setSettings] = useState<SettingsState>(defaults)
  const [saved, setSaved] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("nova-admin-settings")
      if (stored) setSettings({ ...defaults, ...JSON.parse(stored) })
    } catch {
      // Les préférences restent simplement sur les valeurs par défaut.
    }
  }, [])

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
    setSaved(false)
  }

  const save = () => {
    window.localStorage.setItem("nova-admin-settings", JSON.stringify(settings))
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const reset = () => {
    setSettings(defaults)
    window.localStorage.removeItem("nova-admin-settings")
    setResetOpen(false)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }

  const activeSection = sections.find((section) => section.id === active) ?? sections[0]

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-3xl border border-primary/10 bg-gradient-to-br from-primary/[0.10] via-white to-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-primary">
              <SlidersHorizontal className="h-4 w-4" />
              Administration NOVA
            </div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Paramètres</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
              Configurez le comportement général du centre d'administration sans mélanger les réglages avec les opérations quotidiennes.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setResetOpen(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser
            </button>
            <button
              type="button"
              onClick={save}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "Enregistré" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border bg-white p-2 shadow-sm lg:sticky lg:top-24">
          <div className="px-3 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Configuration</p>
          </div>
          <nav className="space-y-1" aria-label="Sections des paramètres">
            {sections.map((section) => {
              const Icon = section.icon
              const selected = section.id === active
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActive(section.id)}
                  className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/[0.06] hover:text-foreground"}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-white/15" : "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{section.label}</span>
                    <span className={`mt-0.5 block truncate text-[11px] ${selected ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{section.description}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
                </button>
              )
            })}
          </nav>
        </aside>

        <section className="min-w-0 rounded-2xl border bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b p-5 md:p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/[0.08] text-primary">
              <activeSection.icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold">{activeSection.label}</h2>
              <p className="text-sm text-muted-foreground">{activeSection.description}</p>
            </div>
          </div>

          {active === "general" && (
            <div className="divide-y">
              <SettingRow icon={Globe2} title="Identité de la plateforme" description="Nom affiché dans les espaces d'administration.">
                <input value={settings.platformName} onChange={(e) => update("platformName", e.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-primary/30 md:w-80" />
              </SettingRow>
              <SettingRow icon={Globe2} title="Pays par défaut" description="Pays utilisé comme valeur par défaut lors de certaines configurations.">
                <select value={settings.country} onChange={(e) => update("country", e.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 md:w-52">
                  <option>Gabon</option>
                  <option>Cameroun</option>
                  <option>Congo</option>
                  <option>Côte d'Ivoire</option>
                </select>
              </SettingRow>
              <SettingRow icon={Globe2} title="Fuseau horaire" description="Fuseau utilisé pour l'affichage des dates et horaires.">
                <select value={settings.timezone} onChange={(e) => update("timezone", e.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 md:w-52">
                  <option value="Africa/Libreville">Africa/Libreville</option>
                  <option value="Africa/Douala">Africa/Douala</option>
                  <option value="Africa/Brazzaville">Africa/Brazzaville</option>
                </select>
              </SettingRow>
              <SettingRow icon={Globe2} title="Langue de l'administration" description="Langue utilisée par l'interface du centre de contrôle.">
                <select value={settings.language} onChange={(e) => update("language", e.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/30 md:w-52">
                  <option>Français</option>
                  <option>English</option>
                </select>
              </SettingRow>
            </div>
          )}

          {active === "securite" && (
            <div className="divide-y">
              <SettingRow icon={LockKeyhole} title="Protection du compte" description="Les actions sensibles doivent rester réservées aux administrateurs autorisés.">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Active</span>
              </SettingRow>
              <SettingRow icon={UserRound} title="Gestion des administrateurs" description="Les administrateurs créés depuis le module Administrateurs restent soumis au niveau de droits de leur créateur.">
                <span className="text-right text-xs font-medium text-muted-foreground">Gérée dans Administrateurs</span>
              </SettingRow>
              <div className="m-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:m-6">
                <div className="flex gap-3">
                  <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-amber-900">Paramètres sensibles</p>
                    <p className="mt-1 text-xs leading-5 text-amber-800">Les réglages d'authentification, de rôles et de permissions ne sont pas simulés ici. Ils doivent être appliqués côté backend avant d'être considérés comme actifs.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {active === "notifications" && (
            <div className="divide-y">
              <ToggleRow icon={Bell} title="Alertes générales" description="Recevoir les notifications importantes du centre d'administration." checked={settings.emailAlerts} onChange={() => update("emailAlerts", !settings.emailAlerts)} />
              <ToggleRow icon={Bell} title="Établissements" description="Être alerté lors d'une nouvelle demande ou d'un changement important concernant un établissement." checked={settings.establishmentAlerts} onChange={() => update("establishmentAlerts", !settings.establishmentAlerts)} />
              <ToggleRow icon={ShieldCheck} title="Alertes de sécurité" description="Afficher les événements importants liés aux accès administrateurs." checked={settings.securityAlerts} onChange={() => update("securityAlerts", !settings.securityAlerts)} />
            </div>
          )}

          {active === "interface" && (
            <div className="divide-y">
              <ToggleRow icon={MonitorCog} title="Mode compact" description="Réduire légèrement l'espacement des listes et tableaux du centre d'administration." checked={settings.compactMode} onChange={() => update("compactMode", !settings.compactMode)} />
              <SettingRow icon={Palette} title="Thème" description="Le centre d'administration utilise le thème de l'application.">
                <span className="inline-flex items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2 text-xs font-medium"><Palette className="h-4 w-4 text-primary" /> Thème NOVA</span>
              </SettingRow>
              <div className="m-5 rounded-2xl border border-primary/10 bg-primary/[0.04] p-4 md:m-6">
                <p className="text-sm font-semibold">Une interface simple avant tout</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Les réglages visuels restent volontairement limités pour conserver une expérience cohérente entre les modules du panneau d'administration.</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {resetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResetOpen(false)} />
          <div role="dialog" aria-modal="true" aria-labelledby="reset-title" className="relative w-full max-w-md overflow-hidden rounded-2xl border bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h3 id="reset-title" className="font-semibold">Réinitialiser les paramètres ?</h3>
                <p className="mt-1 text-sm text-muted-foreground">Les préférences enregistrées dans ce navigateur seront remises à leur valeur par défaut.</p>
              </div>
              <button type="button" onClick={() => setResetOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Fermer"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex justify-end gap-2 p-5">
              <button type="button" onClick={() => setResetOpen(false)} className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted">Annuler</button>
              <button type="button" onClick={reset} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Réinitialiser</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingRow({ icon: Icon, title, description, children }: { icon: typeof Globe2; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
      <div className="flex min-w-0 gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
        <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p></div>
      </div>
      <div className="md:ml-6 md:shrink-0">{children}</div>
    </div>
  )
}

function ToggleRow({ icon: Icon, title, description, checked, onChange }: { icon: typeof Bell; title: string; description: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-5 md:p-6">
      <div className="flex min-w-0 gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></div>
        <div><p className="text-sm font-semibold">{title}</p><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{description}</p></div>
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} />
    </div>
  )
}
