"use client"

import { useMemo, useState } from "react"
import { BookOpen, ClipboardList } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { Input } from "@/components/ui/input"

export default function ParentCahier() {
  const { loading, error, children, lessons, homework } = useParentPortal()
  const allowed = useMemo(() => children.filter(child => child.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [tab, setTab] = useState<"lessons" | "homework">("lessons")
  const [query, setQuery] = useState("")
  const classIds = new Set(allowed.filter(child => childId === "tous" || child.id === childId).map(child => child.class_id).filter(Boolean))
  const lessonList = lessons.filter(item => classIds.has(item.class_id)).filter(item => (item.subject + " " + item.topic + " " + item.content).toLowerCase().includes(query.toLowerCase()))
  const homeworkList = homework.filter(item => classIds.has(item.class_id)).filter(item => (item.subject + " " + item.title + " " + item.instructions).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="space-y-5 sm:space-y-7">
      <ParentPageHeader eyebrow="Travail scolaire" title="Cahier de textes & devoirs" description="Leçons, consignes et devoirs publiés par les enseignants." />
      {error && <div className="border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">{error}</div>}
      {!loading && allowed.length === 0 ? (
        <ParentEmptyState title="Contenus scolaires non disponibles" description="Votre compte n’a pas actuellement l’autorisation de consulter le travail scolaire." />
      ) : (
        <>
          <div className="space-y-3 border-b border-slate-200 pb-3">
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Type de contenu">
              <button type="button" role="tab" aria-selected={tab === "lessons"} onClick={() => setTab("lessons")} className={tab === "lessons" ? "flex min-h-11 items-center justify-center gap-2 border-b-2 border-blue-700 bg-blue-50 px-2 text-sm font-semibold text-blue-800" : "flex min-h-11 items-center justify-center gap-2 border-b border-slate-200 px-2 text-sm text-slate-600"}>
                <BookOpen className="h-4 w-4" />Leçons
              </button>
              <button type="button" role="tab" aria-selected={tab === "homework"} onClick={() => setTab("homework")} className={tab === "homework" ? "flex min-h-11 items-center justify-center gap-2 border-b-2 border-blue-700 bg-blue-50 px-2 text-sm font-semibold text-blue-800" : "flex min-h-11 items-center justify-center gap-2 border-b border-slate-200 px-2 text-sm text-slate-600"}>
                <ClipboardList className="h-4 w-4" />Devoirs
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
              <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
              <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher une matière, une leçon…" className="w-full" />
            </div>
          </div>

          {tab === "lessons" ? (
            <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:border sm:rounded-lg">
              {lessonList.map(item => (
                <article key={item.id} className="space-y-2 px-3 py-4 sm:px-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <p className="font-semibold text-slate-900">{item.subject}</p>
                    <time className="text-xs text-slate-500">{new Date(item.lesson_date).toLocaleDateString("fr-FR")}</time>
                  </div>
                  <h3 className="font-medium text-slate-900">{item.topic || "Cours"}</h3>
                  {item.content && <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">{item.content}</p>}
                  {item.activities && <p className="break-words text-sm text-slate-500">Activités : {item.activities}</p>}
                </article>
              ))}
              {lessonList.length === 0 && <ParentEmptyState title="Aucun cours publié" description="Les entrées du cahier de textes apparaîtront ici dès leur publication." />}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:border sm:rounded-lg">
              {homeworkList.map(item => (
                <article key={item.id} className="space-y-2 px-3 py-4 sm:px-5">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <h3 className="break-words font-semibold text-slate-900">{item.subject} — {item.title}</h3>
                    <time className="shrink-0 text-xs text-slate-500">{item.due_date ? "À rendre le " + new Date(item.due_date).toLocaleDateString("fr-FR") : "Date non précisée"}</time>
                  </div>
                  <p className="whitespace-pre-line break-words text-sm leading-6 text-slate-600">{item.instructions}</p>
                </article>
              ))}
              {homeworkList.length === 0 && <ParentEmptyState title="Aucun devoir publié" description="Les devoirs actifs apparaîtront ici dès leur publication." />}
            </div>
          )}
        </>
      )}
    </div>
  )
}
