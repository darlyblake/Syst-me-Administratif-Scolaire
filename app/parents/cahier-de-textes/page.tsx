"use client"

import { useMemo, useState } from "react"
import { BookOpen, ClipboardList, Eye } from "lucide-react"
import { useParentPortal } from "@/hooks/use-parent-portal"
import { ParentPageHeader } from "@/components/parent/ParentPageHeader"
import { ParentEmptyState } from "@/components/parent/ParentEmptyState"
import { ParentChildSelect } from "@/components/parent/ParentChildSelect"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default function ParentCahier() {
  const { loading, error, children, lessons, homework } = useParentPortal()
  const allowed = useMemo(() => children.filter(child => child.can_view_academic), [children])
  const [childId, setChildId] = useState("tous")
  const [tab, setTab] = useState<"lessons" | "homework">("lessons")
  const [query, setQuery] = useState("")
  const [selectedContent, setSelectedContent] = useState<
    | { type: "lesson"; item: (typeof lessons)[number] }
    | { type: "homework"; item: (typeof homework)[number] }
    | null
  >(null)

  const classIds = new Set(allowed.filter(child => childId === "tous" || child.id === childId).map(child => child.class_id).filter(Boolean))
  const visibleLessons = lessons.filter(item => classIds.has(item.class_id))
  const visibleHomework = homework.filter(item => classIds.has(item.class_id))

  const subjectOptions = Array.from(new Set(
    (tab === "lessons" ? visibleLessons : visibleHomework)
      .map(item => item.subject?.trim())
      .filter((subject): subject is string => Boolean(subject))
  )).sort((a, b) => a.localeCompare(b, "fr"))

  const normalizedQuery = query.trim().toLocaleLowerCase("fr")
  const lessonList = visibleLessons.filter(item =>
    !normalizedQuery || [item.subject, item.topic, item.content, item.activities]
      .some(value => value?.toLocaleLowerCase("fr").includes(normalizedQuery))
  )
  const homeworkList = visibleHomework.filter(item =>
    !normalizedQuery || [item.subject, item.title, item.instructions]
      .some(value => value?.toLocaleLowerCase("fr").includes(normalizedQuery))
  )

  const formatDate = (value: string | null | undefined) =>
    value ? new Date(value).toLocaleDateString("fr-FR") : "Date non précisée"

  return (
    <div className="space-y-5 sm:space-y-7">
      <ParentPageHeader eyebrow="Travail scolaire" title="Cahier de textes & devoirs" description="Consultez les leçons et les devoirs publiés par les enseignants." />
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
            <div className="grid gap-2 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)]">
              <ParentChildSelect children={allowed} value={childId} onChange={setChildId} />
              <div>
                <Input
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Rechercher une matière, un thème…"
                  className="w-full"
                  list="parent-cahier-subjects"
                />
                <datalist id="parent-cahier-subjects">
                  {subjectOptions.map(subject => <option key={subject} value={subject} />)}
                </datalist>
              </div>
            </div>
          </div>

          {tab === "lessons" ? (
            <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:rounded-lg sm:border">
              {lessonList.map(item => (
                <article key={item.id} className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs text-slate-500">{formatDate(item.lesson_date)}</p>
                    <p className="font-medium text-blue-800">{item.subject || "Matière non précisée"}</p>
                    <h3 className="break-words font-semibold text-slate-900">{item.topic || "Cours"}</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setSelectedContent({ type: "lesson", item })}>
                    <Eye className="mr-2 h-4 w-4" />Afficher
                  </Button>
                </article>
              ))}
              {lessonList.length === 0 && <ParentEmptyState title="Aucun cours publié" description="Aucun cours ne correspond à cette recherche pour le moment." />}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border-y border-slate-200 bg-white sm:rounded-lg sm:border">
              {homeworkList.map(item => (
                <article key={item.id} className="flex flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:px-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs text-slate-500">{formatDate(item.due_date)}</p>
                    <p className="font-medium text-blue-800">{item.subject || "Matière non précisée"}</p>
                    <h3 className="break-words font-semibold text-slate-900">{item.title || "Devoir"}</h3>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="w-full shrink-0 sm:w-auto" onClick={() => setSelectedContent({ type: "homework", item })}>
                    <Eye className="mr-2 h-4 w-4" />Afficher
                  </Button>
                </article>
              ))}
              {homeworkList.length === 0 && <ParentEmptyState title="Aucun devoir publié" description="Aucun devoir ne correspond à cette recherche pour le moment." />}
            </div>
          )}
        </>
      )}

      <Dialog open={selectedContent !== null} onOpenChange={open => { if (!open) setSelectedContent(null) }}>
        <DialogContent className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {selectedContent && (
            <>
              <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-5 pr-12 text-left sm:px-6">
                <p className="text-xs font-medium uppercase tracking-wide text-blue-700">
                  {selectedContent.type === "lesson" ? "Détail de la leçon" : "Détail du devoir"}
                </p>
                <DialogTitle className="mt-1 break-words text-lg text-slate-900">
                  {selectedContent.type === "lesson"
                    ? selectedContent.item.topic || "Cours"
                    : selectedContent.item.title || "Devoir"}
                </DialogTitle>
                <DialogDescription>
                  {selectedContent.item.subject || "Matière non précisée"} · {formatDate(selectedContent.type === "lesson" ? selectedContent.item.lesson_date : selectedContent.item.due_date)}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
                {selectedContent.type === "lesson" ? (
                  <>
                    <section className="space-y-2">
                      <h3 className="text-sm font-semibold text-slate-900">Contenu du cours</h3>
                      <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                        {selectedContent.item.content?.trim() || "Aucun contenu détaillé n’a été renseigné."}
                      </p>
                    </section>
                    {selectedContent.item.activities?.trim() && (
                      <section className="space-y-2 border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-semibold text-slate-900">Activités</h3>
                        <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">{selectedContent.item.activities}</p>
                      </section>
                    )}
                  </>
                ) : (
                  <section className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-900">Consignes du devoir</h3>
                    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-slate-700">
                      {selectedContent.item.instructions?.trim() || "Aucune consigne détaillée n’a été renseignée."}
                    </p>
                  </section>
                )}
              </div>
              <div className="shrink-0 border-t border-slate-200 px-5 py-3 sm:px-6">
                <Button type="button" variant="outline" className="w-full sm:ml-auto sm:w-auto" onClick={() => setSelectedContent(null)}>Fermer</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
