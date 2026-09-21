"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Shield, Trash2, AlertCircle } from "lucide-react"
import { useRoles, type RoleWithPermissions } from "@/hooks/useRoles"
import { useEstablishment } from "@/hooks/useEstablishment"
import { useAuthentification } from "@/providers/authentification.provider"

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'students', label: 'Élèves' },
  { id: 'inscriptions', label: 'Inscriptions' },
  { id: 'classes', label: 'Classes' },
  { id: 'teachers', label: 'Enseignants' },
  { id: 'notes', label: 'Notes' },
  { id: 'attendance', label: 'Absences' },
  { id: 'documents', label: 'Documents' },
  { id: 'communication', label: 'Communication' },
  { id: 'finance', label: 'Finance' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'settings', label: 'Paramètres' },
  { id: 'roles.manage', label: 'Gestion des rôles' },
  { id: 'users.manage', label: 'Gestion des utilisateurs' }
]

export default function RolesTab() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null
  const { roles, isLoading, error, addRole, editRole, removeRole, getRoleUsageCount } = useRoles(establishmentId)
  
  const [showForm, setShowForm] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleWithPermissions | null>(null)
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    isActive: true,
    permissions: [] as string[]
  })

  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({})

  // Load usage counts for displayed roles
  useEffect(() => {
    async function loadUsage() {
      const counts: Record<string, number> = {}
      for (const role of roles) {
        try {
          const count = await getRoleUsageCount(role.role.id)
          counts[role.role.id] = count
        } catch (e) {
          counts[role.role.id] = 0
        }
      }
      setUsageCounts(counts)
    }
    if (roles.length > 0) {
      loadUsage()
    }
  }, [roles, getRoleUsageCount])

  const handleOpenForm = (role?: RoleWithPermissions) => {
    if (role) {
      setEditingRole(role)
      setFormData({
        name: role.role.name,
        description: role.role.description || "",
        isActive: role.role.active,
        permissions: role.permissions.map(p => p.permission)
      })
    } else {
      setEditingRole(null)
      setFormData({
        name: "",
        description: "",
        isActive: true,
        permissions: []
      })
    }
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingRole(null)
  }

  const togglePermission = (permId: string) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permId)
        ? prev.permissions.filter(p => p !== permId)
        : [...prev.permissions, permId]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert("Le nom du rôle est obligatoire.")
      return
    }

    try {
      if (editingRole) {
        if (editingRole.role.name === 'Administrateur' && !formData.isActive) {
          if (!confirm("Attention : vous êtes sur le point de désactiver un rôle Administrateur. Êtes-vous sûr ?")) return
        }
        await editRole(editingRole.role.id, formData.name, formData.description, formData.isActive, formData.permissions)
        alert("Rôle modifié.")
      } else {
        await addRole(formData.name, formData.description, formData.permissions)
        alert("Rôle créé.")
      }
      handleCloseForm()
    } catch (err: any) {
      alert(err.message || "Une erreur est survenue")
    }
  }

  const handleDelete = async (role: RoleWithPermissions) => {
    if (role.role.name === 'Administrateur' || role.role.is_system) {
      alert("Ce rôle système ne peut pas être supprimé.")
      return
    }

    try {
      const count = await getRoleUsageCount(role.role.id)
      if (count > 0) {
        alert(`❌ Ce rôle est utilisé par ${count} membre(s).\nDésactivez-le plutôt que de le supprimer.`)
        return
      }

      if (confirm(`Voulez-vous vraiment supprimer le rôle "${role.role.name}" ?`)) {
        await removeRole(role.role.id)
        alert("Rôle supprimé avec succès.")
      }
    } catch (err: any) {
      alert(err.message || "Erreur lors de la suppression")
    }
  }

  if (isLoading) return (
    <div className="p-8 text-center text-gray-500 text-sm">Chargement des rôles...</div>
  )
  if (error) return (
    <div className="p-6 rounded-lg border border-red-200 bg-red-50 flex items-center gap-2 text-red-700">
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm">{error}</span>
    </div>
  )

  if (showForm) {
    return (
      <div className="max-w-2xl">
        <div className="mb-6">
          <button
            type="button"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            onClick={handleCloseForm}
          >
            ← Retour aux rôles
          </button>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">
            {editingRole ? `Modifier « ${editingRole.role.name} »` : 'Nouveau rôle'}
          </h2>
          <p className="text-sm text-gray-500">Définissez les modules accessibles pour ce rôle.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="roleName">Nom du rôle <span className="text-red-500">*</span></Label>
              <Input
                id="roleName"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                disabled={editingRole?.role.is_system}
                placeholder="Ex : Secrétaire"
                className="max-w-xs"
              />
              {editingRole?.role.is_system && (
                <p className="text-xs text-gray-400">Le nom d'un rôle système ne peut pas être modifié.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="roleDesc">Description</Label>
              <Input
                id="roleDesc"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Ex : Gestion des inscriptions et documents"
              />
            </div>
          </div>

          {/* Accès autorisés */}
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Accès autorisés</h3>
              <p className="text-xs text-gray-500 mt-0.5">Sélectionnez les modules auxquels ce rôle aura accès.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVAILABLE_MODULES.map(module => (
                <label
                  key={module.id}
                  className={`flex items-center gap-3 p-2.5 rounded cursor-pointer border transition-colors ${
                    formData.permissions.includes(module.id)
                      ? 'border-blue-200 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 rounded border-gray-300"
                    checked={formData.permissions.includes(module.id)}
                    onChange={() => togglePermission(module.id)}
                  />
                  <span className={`text-sm ${
                    formData.permissions.includes(module.id) ? 'text-blue-800 font-medium' : 'text-gray-700'
                  }`}>{module.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400">{formData.permissions.length} module(s) sélectionné(s)</p>
          </div>

          {/* Statut */}
          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={e => setFormData({...formData, isActive: e.target.checked})}
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm font-medium">Rôle actif</span>
            </label>
            {!formData.isActive && (
              <p className="text-xs text-amber-600 mt-1 ml-6">
                Ce rôle ne pourra plus être attribué à de nouveaux utilisateurs.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleCloseForm}>Annuler</Button>
            <Button type="submit">{editingRole ? 'Enregistrer les modifications' : 'Créer le rôle'}</Button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Rôles et accès</h2>
          <p className="text-sm text-gray-500">Les rôles déterminent ce que chaque utilisateur peut faire dans l'application.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rôle
        </Button>
      </div>

      {roles.length === 0 ? (
        <div className="border rounded-lg p-12 text-center">
          <Shield className="h-8 w-8 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Aucun rôle n'a été créé pour le moment.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => handleOpenForm()}>
            Créer le premier rôle
          </Button>
        </div>
      ) : (
        <div className="bg-white border rounded-lg divide-y">
          {roles.map((item) => {
            const permLabels = item.permissions
              .map(p => AVAILABLE_MODULES.find(m => m.id === p.permission)?.label)
              .filter(Boolean)
            const count = usageCounts[item.role.id]

            return (
              <div key={item.role.id} className="px-4 py-3 flex items-center gap-4">
                {/* Identité du rôle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.role.name}</span>
                    {item.role.is_system && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded uppercase tracking-wide">Système</span>
                    )}
                    {!item.role.active && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-wide">Inactif</span>
                    )}
                  </div>
                  {item.role.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.role.description}</p>
                  )}
                  {permLabels.length > 0 && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {permLabels.join(' · ')}
                    </p>
                  )}
                </div>

                {/* Utilisation */}
                <div className="text-sm text-gray-500 whitespace-nowrap">
                  {count !== undefined ? `${count} utilisateur${count > 1 ? 's' : ''}` : '—'}
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenForm(item)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Modifier
                  </Button>
                  {!item.role.is_system && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(item)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
