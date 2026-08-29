"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowRight, BarChart3, Bell, CalendarDays, Check, ChevronRight, ClipboardCheck, GraduationCap, LayoutDashboard, ShieldCheck, Users, WalletCards } from "lucide-react"
import { Button } from "@/components/ui/button"

const espaces = [
  { key: "parent", titre: "Mon espace Parent", description: "Suivez la scolarité, les résultats, les présences et les informations de vos enfants.", href: "/login?espace=parent", icon: Users, points: ["Suivi des enfants", "Notes et présences", "Informations scolaires"] },
  { key: "ecole", titre: "Mon établissement", description: "Pilotez vos élèves, vos équipes, la scolarité et les finances depuis un seul espace.", href: "/login?espace=ecole", icon: LayoutDashboard, points: ["Élèves et classes", "Scolarité et paiements", "Administration complète"] },
  { key: "enseignant", titre: "Mon espace Enseignant", description: "Retrouvez vos établissements, classes, élèves, cours et emploi du temps général.", href: "/login?espace=enseignant", icon: GraduationCap, points: ["Plusieurs établissements", "Classes et élèves", "Planning et évaluations"] },
]

const fonctionnalites = [
  [Users, "Élèves & classes", "Structure scolaire et inscriptions organisées."],
  [ClipboardCheck, "Notes & présences", "Suivi des résultats et des présences."],
  [WalletCards, "Scolarité & paiements", "Mensualités, tranches, échéanciers et reçus."],
  [CalendarDays, "Emploi du temps", "Horaires, classes, salles et enseignants."],
  [Bell, "Communication", "Les informations importantes au bon endroit."],
  [BarChart3, "Tableaux de bord", "Les indicateurs utiles pour piloter l'activité."],
] as const

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.12 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className={`reveal ${visible ? "reveal-visible" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

function Compteur({ value, label }: { value: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [count, setCount] = useState(0)
  const [started, setStarted] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setStarted(true); observer.disconnect() }
    }, { threshold: 0.6 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!started) return
    const start = performance.now()
    let frame = 0
    const run = (time: number) => {
      const p = Math.min((time - start) / 1300, 1)
      setCount(Math.round(value * (1 - Math.pow(1 - p, 4))))
      if (p < 1) frame = requestAnimationFrame(run)
    }
    frame = requestAnimationFrame(run)
    return () => cancelAnimationFrame(frame)
  }, [started, value])
  return <div ref={ref} className="text-center"><div className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">{count}+</div><div className="mt-1 text-sm text-slate-500">{label}</div></div>
}

function DashboardPreview() {
  const bars = [38,55,46,72,60,84,68,92,76,88,70,96]
  return <div className="relative mx-auto w-full max-w-2xl"><div className="absolute -inset-10 rounded-[3rem] bg-slate-200/60 blur-3xl animate-pulse-soft" /><div className="relative rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-300/40 transition duration-500 hover:-translate-y-2 hover:shadow-slate-300/60 sm:rounded-[2rem] sm:p-3"><div className="overflow-hidden rounded-[1rem] border border-slate-100 bg-[#f7f7f5] sm:rounded-[1.5rem]"><div className="flex h-12 items-center justify-between border-b bg-white px-4"><div className="flex items-center gap-2"><div className="h-7 w-7 rounded-lg bg-slate-950" /><span className="text-xs font-semibold">Tableau de bord</span></div><span className="text-[10px] text-slate-400">2026–2027</span></div><div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6"><div className="space-y-3"><div className="rounded-xl bg-slate-950 p-4 text-white transition-transform duration-300 hover:scale-[1.02]"><p className="text-[11px] text-slate-300">Élèves inscrits</p><p className="mt-2 text-2xl font-semibold">1 248</p><p className="mt-1 text-[10px] text-slate-400">Année scolaire</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-xl border bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"><Users className="h-4 w-4 text-slate-400" /><p className="mt-3 text-lg font-semibold">48</p><p className="text-[10px] text-slate-500">Classes</p></div><div className="rounded-xl border bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-md"><GraduationCap className="h-4 w-4 text-slate-400" /><p className="mt-3 text-lg font-semibold">76</p><p className="text-[10px] text-slate-500">Enseignants</p></div></div></div><div className="rounded-xl border bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold">Activité scolaire</p><p className="mt-1 text-[10px] text-slate-500">Vue d'ensemble</p></div><BarChart3 className="h-4 w-4 text-slate-400" /></div><div className="mt-8 flex h-32 items-end gap-2" aria-label="Graphique d'activité scolaire">{bars.map((h,i) => <div key={i} className="chart-bar flex-1 rounded-t bg-slate-900/85" style={{ height: `${h}%`, animationDelay: `${450 + i * 70}ms` }} />)}</div><div className="mt-3 flex justify-between text-[9px] text-slate-400"><span>Jan</span><span>Juin</span><span>Déc</span></div></div></div></div></div></div>
}

export default function PageAccueil() {
  const router = useRouter(); const [active, setActive] = useState("ecole")
  return <main className="min-h-screen overflow-x-hidden bg-[#f8f7f3] text-slate-950">
    <style jsx global>{`@keyframes rise{from{opacity:0;transform:translateY(24px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}@keyframes bar{from{transform:scaleY(0);transform-origin:bottom}to{transform:scaleY(1);transform-origin:bottom}}@keyframes pulseSoft{0%,100%{opacity:.45;transform:scale(.98)}50%{opacity:.75;transform:scale(1.02)}}.reveal{opacity:0;transform:translateY(28px);transition:opacity .75s cubic-bezier(.22,1,.36,1),transform .75s cubic-bezier(.22,1,.36,1)}.reveal-visible{opacity:1;transform:translateY(0)}.chart-bar{animation:bar .85s cubic-bezier(.22,1,.36,1) both}.animate-float{animation:float 5s ease-in-out infinite}.animate-pulse-soft{animation:pulseSoft 5s ease-in-out infinite}@media(prefers-reduced-motion:reduce){.reveal{opacity:1;transform:none;transition:none}.chart-bar,.animate-float,.animate-pulse-soft{animation:none!important}}`}</style>
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-[#f8f7f3]/90 backdrop-blur-xl"><div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8"><button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex items-center gap-3 text-left transition-opacity hover:opacity-70"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 text-white"><GraduationCap className="h-5 w-5" /></span><span><span className="block text-sm font-semibold">Système Administratif Scolaire</span><span className="hidden text-[11px] text-slate-500 sm:block">Une gestion scolaire plus simple</span></span></button><Button variant="outline" className="rounded-full bg-white transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => router.push("/login")}>Se connecter</Button></div></header>

    <section><div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-16 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[.9fr_1.1fr] lg:pb-24"><Reveal className="max-w-2xl"><div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm animate-float"><ShieldCheck className="h-3.5 w-3.5" /> Une plateforme pensée pour la communauté scolaire</div><h1 className="text-4xl font-semibold leading-[1.08] tracking-[-.035em] sm:text-5xl lg:text-6xl">Toute votre gestion scolaire, <span className="text-slate-500">au même endroit.</span></h1><p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg">Une plateforme claire pour les établissements, les enseignants et les parents. Chacun retrouve uniquement les outils dont il a besoin.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="lg" className="rounded-full px-6 transition-all hover:-translate-y-1 hover:shadow-lg" onClick={() => router.push("/login?espace=ecole")}>Accéder à mon établissement <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></Button><Button size="lg" variant="outline" className="rounded-full bg-white px-6 transition-all hover:-translate-y-1 hover:shadow-md" onClick={() => router.push("/login?espace=enseignant")}>Espace enseignant</Button></div><div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">{["Élèves", "Notes", "Présences", "Paiements", "Emploi du temps"].map(x => <span key={x} className="inline-flex items-center gap-1.5 transition-colors hover:text-slate-900"><Check className="h-3.5 w-3.5" />{x}</span>)}</div></Reveal><Reveal delay={160}><DashboardPreview /></Reveal></div></section>

    <section className="border-y border-slate-200 bg-white"><Reveal><div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-5 py-10 sm:grid-cols-4 sm:px-8"><Compteur value={1200} label="élèves gérés" /><Compteur value={70} label="enseignants" /><Compteur value={40} label="classes" /><Compteur value={99} label="simplicité" /></div></Reveal></section>

    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28"><Reveal><div className="max-w-2xl"><p className="text-sm font-semibold text-slate-500">Un espace pour chacun</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Une expérience adaptée à votre rôle.</h2><p className="mt-4 text-slate-600">Pas de menus inutiles. Chaque utilisateur retrouve directement les informations et actions dont il a besoin.</p></div></Reveal><div className="mt-10 grid gap-4 lg:grid-cols-3">{espaces.map((e,i) => { const Icon=e.icon; return <Reveal key={e.key} delay={i*100}><button onClick={() => { setActive(e.key); router.push(e.href) }} className={`group w-full rounded-2xl border p-6 text-left transition-all duration-500 ${active===e.key ? "border-slate-950 bg-white shadow-xl shadow-slate-200/60" : "border-slate-200 bg-white/60 hover:-translate-y-2 hover:bg-white hover:shadow-xl"}`}><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 transition-transform duration-300 group-hover:scale-110"><Icon className="h-5 w-5" /></span><ChevronRight className="h-5 w-5 text-slate-300 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-slate-700" /></div><h3 className="mt-6 text-xl font-semibold">{e.titre}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{e.description}</p><div className="mt-5 space-y-2">{e.points.map(p => <div key={p} className="flex items-center gap-2 text-sm text-slate-600"><Check className="h-4 w-4 transition-transform group-hover:scale-110" />{p}</div>)}</div></button></Reveal> })}</div></section>

    <section className="border-y border-slate-200 bg-white"><div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr] lg:items-end"><Reveal><div><p className="text-sm font-semibold text-slate-500">Tout le nécessaire</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Des outils qui travaillent ensemble.</h2><p className="mt-4 max-w-lg text-slate-600">De l'inscription au suivi quotidien, les informations restent organisées pour faciliter le travail de toute la communauté scolaire.</p></div></Reveal><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fonctionnalites.map(([Icon,title,text],i) => <Reveal key={title} delay={i*70}><div className="group h-full rounded-2xl border border-slate-200 bg-[#fafaf8] p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-lg"><Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" /><h3 className="mt-4 text-sm font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div></Reveal>)}</div></div></div></section>

    <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28"><Reveal><div className="overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-12 text-white transition-transform duration-500 hover:-translate-y-1 sm:px-12 lg:px-16 lg:py-16"><div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-sm text-slate-400">Prêt à commencer ?</p><h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Une gestion scolaire claire commence par un espace bien organisé.</h2><p className="mt-4 max-w-xl leading-7 text-slate-400">Choisissez votre espace et connectez-vous. Le système déterminera ensuite automatiquement votre profil et vos accès.</p></div><Button size="lg" variant="secondary" className="rounded-full px-7 transition-all hover:-translate-y-1 hover:shadow-lg" onClick={() => router.push("/login")}>Se connecter <ArrowRight className="ml-2 h-4 w-4" /></Button></div></div></Reveal></section>

    <footer className="border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8"><div className="font-medium text-slate-800">Système Administratif Scolaire</div><div>Gestion scolaire simple, moderne et professionnelle.</div></div></footer>
  </main>
}
