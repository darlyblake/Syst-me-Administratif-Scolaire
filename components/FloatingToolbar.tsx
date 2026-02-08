"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Plus,
  UserCheck,
  Download,
  Filter,
  ArrowLeft,
  Settings,
  ChevronUp,
  ChevronDown
} from "lucide-react"
import Link from "next/link"

interface FloatingToolbarProps {
  onCreateTeacher: () => void
  onAddTeacherById: () => void
  onExport: () => void
  onBulkActions: () => void
  selectedCount?: number
  canCreate?: boolean
  canExport?: boolean
  canBulkActions?: boolean
}

export function FloatingToolbar({
  onCreateTeacher,
  onAddTeacherById,
  onExport,
  onBulkActions,
  selectedCount = 0,
  canCreate = true,
  canExport = true,
  canBulkActions = true
}: FloatingToolbarProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isMinimized, setIsMinimized] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)

  // Gestion de la visibilité basée sur le scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scroll vers le bas - masquer la toolbar
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        // Scroll vers le haut - afficher la toolbar
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  if (!isVisible) return null

  return (
    <Card className={`fixed bottom-6 right-6 z-50 shadow-lg border-2 transition-all duration-300 ${
      isMinimized ? 'w-auto' : 'w-80'
    } ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}`}>
      <div className="p-4">
        {/* Header avec bouton de réduction */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium text-gray-700">
              Actions rapides
            </span>
            {selectedCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Contenu de la toolbar */}
        {!isMinimized && (
          <div className="space-y-3">
            {/* Actions principales */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onCreateTeacher}
                className="flex items-center gap-2 h-auto py-2 px-3 text-sm"
                size="sm"
                disabled={!canCreate}
              >
                <Plus className="h-4 w-4" />
                Créer
              </Button>
              <Button
                onClick={onAddTeacherById}
                variant="outline"
                className="flex items-center gap-2 h-auto py-2 px-3 text-sm"
                size="sm"
                disabled={!canCreate}
              >
                <UserCheck className="h-4 w-4" />
                Ajouter par ID
              </Button>
            </div>

            {/* Actions secondaires */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onExport}
                variant="outline"
                className="flex items-center gap-2 h-auto py-2 px-3 text-sm"
                size="sm"
                disabled={!canExport}
              >
                <Download className="h-4 w-4" />
                Exporter
              </Button>
              <Button
                onClick={onBulkActions}
                variant="outline"
                className="flex items-center gap-2 h-auto py-2 px-3 text-sm"
                size="sm"
                disabled={selectedCount === 0 || !canBulkActions}
              >
                <Filter className="h-4 w-4" />
                Actions groupées
              </Button>
            </div>

            {/* Lien de retour */}
            <div className="pt-2 border-t">
              <Button
                variant="ghost"
                asChild
                className="w-full flex items-center gap-2 h-auto py-2 px-3 text-sm justify-start"
                size="sm"
              >
                <Link href="/tableau-bord">
                  <ArrowLeft className="h-4 w-4" />
                  Retour au tableau de bord
                </Link>
              </Button>
            </div>

            {/* Indicateur de statut */}
            <div className="text-xs text-gray-500 text-center pt-2 border-t">
              {selectedCount > 0
                ? `${selectedCount} enseignant${selectedCount > 1 ? 's' : ''} sélectionné${selectedCount > 1 ? 's' : ''}`
                : 'Aucune sélection'
              }
            </div>
          </div>
        )}

        {/* Version minimisée */}
        {isMinimized && (
          <div className="flex gap-1">
            <Button
              onClick={onCreateTeacher}
              size="sm"
              className="h-8 w-8 p-0"
              title="Créer un enseignant"
              disabled={!canCreate}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              onClick={onAddTeacherById}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Ajouter par ID"
              disabled={!canCreate}
            >
              <UserCheck className="h-4 w-4" />
            </Button>
            <Button
              onClick={onExport}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Exporter"
              disabled={!canExport}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              onClick={onBulkActions}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              title="Actions groupées"
              disabled={selectedCount === 0 || !canBulkActions}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
