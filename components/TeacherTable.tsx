"use client"

import { useState } from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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
  canDelete?: boolean
}

export function TeacherTable({
  teachers,
  loading,
  currentPage,
  totalPages,
  onPageChange,
  onSelectTeacher,
  onDeleteTeacher,
  canDelete = true
}: TeacherTableProps) {
  const [sortField, setSortField] = useState<SortField>("nom")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Fonction de tri
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  // Tri des enseignants
  const sortedTeachers = [...teachers].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortField) {
      case "nom":
        aValue = `${a.prenom} ${a.nom}`.toLowerCase()
        bValue = `${b.prenom} ${b.nom}`.toLowerCase()
        break
      case "matieres":
        aValue = a.matieres.join(", ").toLowerCase()
        bValue = b.matieres.join(", ").toLowerCase()
        break
      case "statut":
        aValue = a.statut
        bValue = b.statut
        break
      case "email":
        aValue = a.email.toLowerCase()
        bValue = b.email.toLowerCase()
        break
      default:
        return 0
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
    return 0
  })

  // Fonction pour obtenir l'icône de tri
  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  // Fonction pour obtenir la couleur du statut
  const getStatusColor = (statut: string) => {
    switch (statut) {
      case "actif": return "bg-green-100 text-green-800 hover:bg-green-200"
      case "inactif": return "bg-red-100 text-red-800 hover:bg-red-200"
      case "conge": return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "suspendu": return "bg-orange-100 text-orange-800 hover:bg-orange-200"
      default: return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  // Fonction pour obtenir l'indicateur de statut
  const getStatusIndicator = (statut: string) => {
    return statut === "actif" ? "bg-green-500" : "bg-red-500"
  }

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <CardTitle>Liste des enseignants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Liste des enseignants ({teachers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-16"></TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("nom")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Nom {getSortIcon("nom")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("matieres")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Matières {getSortIcon("matieres")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("email")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Contact {getSortIcon("email")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button
                    variant="ghost"
                    onClick={() => handleSort("statut")}
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                  >
                    Statut {getSortIcon("statut")}
                  </Button>
                </TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeachers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-gray-500">Aucun enseignant trouvé</p>
                  </TableCell>
                </TableRow>
              ) : (
                sortedTeachers.map((teacher) => (
                  <TableRow
                    key={teacher.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onSelectTeacher(teacher)}
                  >
                    <TableCell>
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-600">
                            {teacher.prenom[0]}{teacher.nom[0]}
                          </span>
                        </div>
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusIndicator(teacher.statut)}`}></span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {teacher.prenom} {teacher.nom}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {teacher.identifiant}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {teacher.matieres.slice(0, 2).map((matiere, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {matiere}
                          </Badge>
                        ))}
                        {teacher.matieres.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{teacher.matieres.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="text-gray-900">{teacher.email}</div>
                        <div className="text-gray-500">{teacher.telephone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(teacher.statut)}>
                        {teacher.statut}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            onSelectTeacher(teacher)
                          }}
                          title="Voir détails"
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Modifier"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/enseignants/${teacher.id}/modifier`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        {canDelete && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Supprimer"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. L'enseignant {teacher.prenom} {teacher.nom} sera supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDeleteTeacher(teacher.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} sur {totalPages}
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Précédent
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPageChange(page)}
                  className="w-8 h-8 p-0"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
