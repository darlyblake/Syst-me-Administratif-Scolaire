import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FolderTree, GraduationCap, Building2 } from "lucide-react"
import type { AcademicStructureCycle } from "@/lib/supabase/types"

interface AcademicStructureTreeProps {
  data: AcademicStructureCycle[]
  isLoading?: boolean
  error?: string | null
}

export function AcademicStructureTree({ data, isLoading = false, error = null }: AcademicStructureTreeProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-4 w-4" />
            Chargement de la structure...
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Récupération des cycles, niveaux et classes en cours.
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Building2 className="h-4 w-4" />
            Impossible de charger la structure
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
      </Card>
    )
  }

  if (!data.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderTree className="h-4 w-4" />
            Aucune structure académique
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Aucun cycle n’a encore été créé pour cet établissement.</p>
          <p>Ajoutez un cycle, puis des niveaux et des classes pour organiser la scolarité.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {data.map((cycle) => (
        <Card key={cycle.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderTree className="h-4 w-4" />
                {cycle.name}
              </CardTitle>
              <Badge variant="secondary">Cycle</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!cycle.grade_levels || cycle.grade_levels.length === 0) && (
              <p className="text-sm text-muted-foreground">Aucun niveau associé à ce cycle.</p>
            )}

            {cycle.grade_levels?.map((level) => (
              <div key={level.id} className="rounded-md border bg-muted/30 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-medium">
                    <GraduationCap className="h-4 w-4" />
                    {level.name}
                  </div>
                  <Badge variant="outline">Niveau</Badge>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(!level.school_classes || level.school_classes.length === 0) && (
                    <span className="text-sm text-muted-foreground">Aucune classe pour ce niveau.</span>
                  )}

                  {level.school_classes?.map((schoolClass) => (
                    <Badge key={schoolClass.id} variant="secondary" className="rounded-full px-3 py-1">
                      {schoolClass.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
