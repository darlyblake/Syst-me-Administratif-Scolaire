"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Search, Filter, X, ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

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
  onResetFilters
}: TeacherFiltersProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const hasActiveFilters = searchQuery || subjectFilter || statusFilter

  const activeFiltersCount = [
    searchQuery,
    subjectFilter && subjectFilter !== "all",
    statusFilter && statusFilter !== "all"
  ].filter(Boolean).length

  return (
    <Card className="animate-slide-down">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtres et recherche
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetFilters}
              className="flex items-center gap-2"
            >
              <X className="h-4 w-4" />
              Réinitialiser
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recherche principale */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher par nom, prénom ou email..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filtres avancés */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres avancés
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {activeFiltersCount}
                  </Badge>
                )}
              </span>
              {isAdvancedOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtre par matière */}
              <div className="space-y-2">
                <Label htmlFor="subject-filter">Matière</Label>
                <Select value={subjectFilter} onValueChange={onSubjectChange}>
                  <SelectTrigger id="subject-filter">
                    <SelectValue placeholder="Toutes les matières" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les matières</SelectItem>
                    {uniqueSubjects.map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtre par statut */}
              <div className="space-y-2">
                <Label htmlFor="status-filter">Statut</Label>
                <Select value={statusFilter} onValueChange={onStatusChange}>
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

            {/* Indicateurs de filtres actifs */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                <span className="text-sm text-gray-600 mr-2">Filtres actifs :</span>
                {searchQuery && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Recherche: "{searchQuery}"
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => onSearchChange("")}
                    />
                  </Badge>
                )}
                {subjectFilter && subjectFilter !== "all" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Matière: {subjectFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => onSubjectChange("")}
                    />
                  </Badge>
                )}
                {statusFilter && statusFilter !== "all" && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    Statut: {statusFilter}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => onStatusChange("")}
                    />
                  </Badge>
                )}
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        {/* Résumé des résultats */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
          <div className="flex items-center justify-between">
            <span>
              {hasActiveFilters ? "Filtres appliqués" : "Aucun filtre actif"}
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onResetFilters}
                className="h-auto p-1 text-xs"
              >
                Tout effacer
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
