import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

interface StudentFiltersProps {
  searchTerm: string
  selectedClass: string
  selectedStatus: string
  onSearchChange: (value: string) => void
  onClassChange: (value: string) => void
  onStatusChange: (value: string) => void
  classes: string[]
  classStats: { [key: string]: number }
}

export default function StudentFilters({
  searchTerm,
  selectedClass,
  selectedStatus,
  onSearchChange,
  onClassChange,
  onStatusChange,
  classes,
  classStats
}: StudentFiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Rechercher par nom, prénom ou identifiant..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      <Select value={selectedClass} onValueChange={onClassChange}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Toutes les classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les classes</SelectItem>
          {classes.map((classe) => (
            <SelectItem key={classe} value={classe}>
              {classe} ({classStats[classe] || 0})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={selectedStatus} onValueChange={onStatusChange}>
        <SelectTrigger className="w-full md:w-48">
          <SelectValue placeholder="Tous les statuts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="actif">Actifs</SelectItem>
          <SelectItem value="inactif">Inactifs</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}