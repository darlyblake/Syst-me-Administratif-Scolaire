"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react"

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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const hasSearch = searchQuery.trim().length > 0
  const hasSubject = Boolean(subjectFilter && subjectFilter !== "all")
  const hasStatus = Boolean(statusFilter && statusFilter !== "all")
  const activeFiltersCount = [hasSearch, hasSubject, hasStatus].filter(Boolean).length

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              placeholder="Rechercher un enseignant..."
              aria-label="Rechercher un enseignant"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 pr-10 h-11"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Effacer la recherche"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            type="button"
            variant={activeFiltersCount > 0 ? "secondary" : "outline"}
            onClick={() => setIsAdvancedOpen((open) => !open)}
            className="h-11 justify-between md:w-auto"
            aria-expanded={isAdvancedOpen}
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
              {activeFiltersCount > 0 && <Badge variant="default">{activeFiltersCount}</Badge>}
            </span>
            {isAdvancedOpen ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>

          {activeFiltersCount > 0 && (
            <Button type="button" variant="ghost" onClick={onResetFilters} className="h-11">
              Effacer
            </Button>
          )}
        </div>

        {isAdvancedOpen && (
          <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject-filter">Matière</Label>
              <Select value={subjectFilter || "all"} onValueChange={onSubjectChange}>
                <SelectTrigger id="subject-filter">
                  <SelectValue placeholder="Toutes les matières" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les matières</SelectItem>
                  {uniqueSubjects.map((subject) => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status-filter">Statut</Label>
              <Select value={statusFilter || "all"} onValueChange={onStatusChange}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="actif">Actif</SelectItem>
                  <SelectItem value="inactif">Inactif</SelectItem>
                  <SelectItem value="conge">En congé</SelectItem>
                  <SelectItem value="suspendu">Suspendu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm" aria-label="Filtres actifs">
            <span className="text-muted-foreground">Filtres actifs :</span>
            {hasSearch && <Badge variant="outline">Recherche : {searchQuery}</Badge>}
            {hasSubject && <Badge variant="outline">Matière : {subjectFilter}</Badge>}
            {hasStatus && <Badge variant="outline">Statut : {statusFilter}</Badge>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
