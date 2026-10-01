"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, X } from "lucide-react"

interface TeacherFiltersProps {
  searchQuery: string
  subjectFilter: string
  statusFilter: string
  uniqueSubjects: string[]
  onSearchChange: (query: string) => void
  onSubjectChange: (subject: string) => void
  onStatusChange: (status: string) => void
  onResetFilters: () => void
}

export function TeacherFilters({
  searchQuery,
  subjectFilter,
  statusFilter,
  uniqueSubjects,
  onSearchChange,
  onSubjectChange,
  onStatusChange,
  onResetFilters,
}: TeacherFiltersProps) {

  const hasSearch = searchQuery.trim().length > 0
  const hasSubject = Boolean(subjectFilter && subjectFilter !== "all")
  const hasStatus = Boolean(statusFilter && statusFilter !== "all")
  const activeFiltersCount = [hasSearch, hasSubject, hasStatus].filter(Boolean).length

  return (
    <section className="border-b pb-4" aria-label="Recherche et filtres">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="relative flex-1">
          <Label htmlFor="teacher-search" className="mb-1.5 block text-sm">Rechercher</Label>
          <Search className="absolute left-3 top-[2.35rem] h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input id="teacher-search" type="search" placeholder="Nom, identifiant, email ou téléphone" aria-label="Rechercher un enseignant" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} className="pl-9" />
          {hasSearch && <button type="button" onClick={() => onSearchChange("")} aria-label="Effacer la recherche" className="absolute right-3 bottom-2.5 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>}
        </div>
        <div className="w-full md:w-56">
          <Label htmlFor="subject-filter" className="mb-1.5 block text-sm">Matière</Label>
          <Select value={subjectFilter || "all"} onValueChange={onSubjectChange}>
            <SelectTrigger id="subject-filter"><SelectValue placeholder="Toutes les matières" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Toutes les matières</SelectItem>{uniqueSubjects.map((subject) => <SelectItem key={subject} value={subject}>{subject}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-48">
          <Label htmlFor="status-filter" className="mb-1.5 block text-sm">Statut</Label>
          <Select value={statusFilter || "all"} onValueChange={onStatusChange}>
            <SelectTrigger id="status-filter"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
            <SelectContent><SelectItem value="all">Tous les statuts</SelectItem><SelectItem value="actif">Actif</SelectItem><SelectItem value="inactif">Inactif</SelectItem><SelectItem value="conge">En congé</SelectItem><SelectItem value="suspendu">Suspendu</SelectItem></SelectContent>
          </Select>
        </div>
        {activeFiltersCount > 0 && <Button type="button" variant="ghost" onClick={onResetFilters} className="h-10">Effacer</Button>}
      </div>
    </section>
  )

}
