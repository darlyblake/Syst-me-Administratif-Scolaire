import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Search, X } from "lucide-react"

interface StudentFiltersProps {
  searchTerm: string
  selectedClass: string
  selectedStatus: string
  selectedLevel: string
  onSearchChange: (value: string) => void
  onClassChange: (value: string) => void
  onStatusChange: (value: string) => void
  onLevelChange: (value: string) => void
  classes: string[]
  classStats: { [key: string]: number }
  levels: string[]
}

export default function StudentFilters({ searchTerm, selectedClass, selectedStatus, selectedLevel, onSearchChange, onClassChange, onStatusChange, onLevelChange, classes, classStats, levels }: StudentFiltersProps) {
  const activeFiltersCount = (selectedClass !== "all" ? 1 : 0) + (selectedStatus !== "all" ? 1 : 0) + (selectedLevel !== "all" ? 1 : 0) + (searchTerm ? 1 : 0)

  const handleClearFilters = () => {
    onSearchChange("")
    onClassChange("all")
    onStatusChange("all")
    onLevelChange("all")
  }

  return (
    <div className="w-full space-y-4">
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative min-w-0 sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Rechercher par nom, prénom ou identifiant..." value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="h-10 w-full min-w-0 pl-10" />
        </div>
        <Select value={selectedLevel} onValueChange={onLevelChange}>
          <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Tous les niveaux" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les niveaux</SelectItem>
            {levels.map((level) => <SelectItem key={level} value={level}>{level.charAt(0).toUpperCase() + level.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedClass} onValueChange={onClassChange}>
          <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {classes.map((classe) => <SelectItem key={classe} value={classe}>{classe} ({classStats[classe] || 0})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="h-10 w-full min-w-0"><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="actif">Actifs</SelectItem>
            <SelectItem value="inactif">Inactifs</SelectItem>
            <SelectItem value="archivé">Archivés</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {activeFiltersCount > 0 && (
        <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <Badge variant="secondary">{activeFiltersCount} filtre{activeFiltersCount > 1 ? "s" : ""} actif{activeFiltersCount > 1 ? "s" : ""}</Badge>
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="max-w-full">
            <X className="mr-1 h-4 w-4 shrink-0" /><span className="truncate">Effacer les filtres</span>
          </Button>
        </div>
      )}
    </div>
  )
}
