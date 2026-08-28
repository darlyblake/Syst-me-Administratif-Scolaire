"use client"

import { useState } from "react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowUpDown, ArrowUp, ArrowDown, Eye, Edit, Trash2, Users } from "lucide-react"
import Link from "next/link"
import type { DonneesEnseignant } from "@/types/models"

type SortField = "nom" | "matieres" | "statut" | "email"
type SortDirection = "asc" | "desc"

interface TeacherTableProps {
  teachers: DonneesEnseignant[]
  loading: boolean
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  onSelectTeacher: (teacher: DonneesEnseignant) => void
  onDeleteTeacher: (id: string) => void
  canEdit?: boolean
  canDelete?: boolean
}

export function TeacherTable({ teachers, loading, currentPage, totalPages, onPageChange, onSelectTeacher, onDeleteTeacher, canEdit = false, canDelete = false }: TeacherTableProps) {
  const [sortField, setSortField] = useState<SortField>("nom")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection((direction) => direction === "asc" ? "desc" : "asc")
    else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const sortedTeachers = [...teachers].sort((a, b) => {
    const values: Record<SortField, [string, string]> = {
      nom: [`${a.prenom} ${a.nom}`, `${b.prenom} ${b.nom}`],
      matieres: [a.matieres.join(", "), b.matieres.join(", ")],
      statut: [a.statut, b.statut],
      email: [a.email, b.email],
    }
    const [aValue, bValue] = values[sortField].map((value) => value.toLowerCase())
    if (aValue === bValue) return 0
    const result = aValue < bValue ? -1 : 1
    return sortDirection === "asc" ? result : -result
  })

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" aria-hidden="true" /> : <ArrowDown className="h-4 w-4" aria-hidden="true" />
  }

  const statusLabel: Record<string, string> = { actif: "Actif", inactif: "Inactif", conge: "En congé", suspendu: "Suspendu" }
  const statusClass: Record<string, string> = {
    actif: "bg-green-100 text-green-800",
    inactif: "bg-red-100 text-red-800",
    conge: "bg-blue-100 text-blue-800",
    suspendu: "bg-orange-100 text-orange-800",
  }

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle>Enseignants</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-12 rounded-md bg-muted animate-pulse" />)}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" aria-hidden="true" />
          Enseignants <span className="text-muted-foreground font-normal">({teachers.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedTeachers.length === 0 ? (
          <div className="rounded-lg border border-dashed py-12 text-center">
            <Users className="h-10 w-10 mx-auto mb-3 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium">Aucun enseignant trouvé</p>
            <p className="text-sm text-muted-foreground mt-1">Modifiez votre recherche ou vos filtres.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14" />
                  <TableHead><Button variant="ghost" onClick={() => handleSort("nom")} className="h-auto p-0 font-semibold">Nom {getSortIcon("nom")}</Button></TableHead>
                  <TableHead className="hidden md:table-cell"><Button variant="ghost" onClick={() => handleSort("matieres")} className="h-auto p-0 font-semibold">Matières {getSortIcon("matieres")}</Button></TableHead>
                  <TableHead className="hidden lg:table-cell"><Button variant="ghost" onClick={() => handleSort("email")} className="h-auto p-0 font-semibold">Contact {getSortIcon("email")}</Button></TableHead>
                  <TableHead><Button variant="ghost" onClick={() => handleSort("statut")} className="h-auto p-0 font-semibold">Statut {getSortIcon("statut")}</Button></TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeachers.map((teacher) => (
                  <TableRow key={teacher.id} className="cursor-pointer hover:bg-muted/50" onClick={() => onSelectTeacher(teacher)}>
                    <TableCell>
                      <div className="relative w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                        <span className="text-xs font-semibold">{teacher.prenom?.[0]}{teacher.nom?.[0]}</span>
                        <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background ${teacher.statut === "actif" ? "bg-green-500" : "bg-muted-foreground"}`} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{teacher.prenom} {teacher.nom}</div>
                      <div className="text-xs text-muted-foreground">{teacher.identifiant}</div>
                      <div className="md:hidden text-xs text-muted-foreground mt-1 truncate max-w-[180px]">{teacher.matieres.join(", ")}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex flex-wrap gap-1 max-w-[260px]">
                        {teacher.matieres.slice(0, 2).map((matiere) => <Badge key={matiere} variant="outline" className="text-xs">{matiere}</Badge>)}
                        {teacher.matieres.length > 2 && <Badge variant="outline" className="text-xs">+{teacher.matieres.length - 2}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="text-sm">{teacher.email}</div>
                      <div className="text-xs text-muted-foreground">{teacher.telephone}</div>
                    </TableCell>
                    <TableCell><Badge className={statusClass[teacher.statut] ?? ""}>{statusLabel[teacher.statut] ?? teacher.statut}</Badge></TableCell>
                    <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onSelectTeacher(teacher)} aria-label={`Voir ${teacher.prenom} ${teacher.nom}`} title="Voir le dossier"><Eye className="h-4 w-4" /></Button>
                        {canEdit && <Button variant="ghost" size="icon" asChild aria-label={`Modifier ${teacher.prenom} ${teacher.nom}`} title="Modifier"><Link href={`/enseignants/${teacher.id}/modifier`}><Edit className="h-4 w-4" /></Link></Button>}
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive" aria-label={`Désactiver ${teacher.prenom} ${teacher.nom}`} title="Désactiver"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Désactiver cet enseignant ?</AlertDialogTitle>
                                <AlertDialogDescription>Le dossier de {teacher.prenom} {teacher.nom} sera conservé afin de préserver l'historique scolaire.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => onDeleteTeacher(teacher.id)}>Désactiver</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 mt-4">
            <span className="text-sm text-muted-foreground">Page {currentPage} sur {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>Précédent</Button>
              <Button variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>Suivant</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
