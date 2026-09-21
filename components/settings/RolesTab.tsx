"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Edit, Shield, Check, Trash2 } from "lucide-react"
import { useRoles, type RoleWithPermissions } from "@/hooks/useRoles"
import { useEstablishment } from "@/hooks/useEstablishment"
import { useAuthentification } from "@/providers/authentification.provider"

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Tableau de bord' },
  { id: 'inscriptions', label: 'Inscriptions' },
  { id: 'classes', label: 'Classes' },
  { id: 'notes', label: 'Notes' },
  { id: 'attendance', label: 'Absences & Présences' },
  { id: 'finance', label: 'Comptabilité & Paiements' },
  { id: 'documents', label: 'Documents & Dossiers' },
  { id: 'communication', label: 'Communication' },
  { id: 'personnel', label: 'Personnel' },
  { id: 'settings', label: 'Paramètres généraux' },
  { id: 'roles.manage', label: 'Gestion des rôles' },
  { id: 'users.manage', label: 'Gestion des comptes' }
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
        alert(`Ce rôle est utilisé par ${count} utilisateur(s). Vous devez d'abord réattribuer ces utilisateurs.`)
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

  if (isLoading) return <div className="p-8 text-center text-gray-500">Chargement des rôles...</div>
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>

  if (showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{editingRole ? "Modifier le rôle" : "Nouveau rôle"}</CardTitle>
          <CardDescription>Configurez les accès pour ce profil d'utilisateur</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="roleName">Nom du rôle <span className="text-red-500">*</span></Label>
                <Input 
                  id="roleName" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={editingRole?.role.is_system}
                  placeholder="Ex: Secrétaire" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roleDesc">Description</Label>
                <Input 
                  id="roleDesc" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder="Ex: Gestion administrative des élèves" 
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-md font-medium border-b pb-2">Accès autorisés</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {AVAILABLE_MODULES.map(module => (
                  <label key={module.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded hover:bg-gray-50 border border-transparent hover:border-gray-100">
                    <input
                      type="checkbox"
                      className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={formData.permissions.includes(module.id)}
                      onChange={() => togglePermission(module.id)}
                    />
                    <span className="text-sm text-gray-700">{module.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={e => setFormData({...formData, isActive: e.target.checked})}
                  className="form-checkbox h-4 w-4 rounded border-gray-300"
                />
                <span className="text-sm font-medium">Rôle actif</span>
              </label>
              {!formData.isActive && (
                <p className="text-xs text-amber-600 ml-6">Les utilisateurs existants conserveront ce rôle, mais il ne pourra plus être attribué.</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Annuler</Button>
              <Button type="submit">{editingRole ? "Enregistrer" : "Créer le rôle"}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Rôles et accès</h2>
          <p className="text-sm text-gray-500">Gérez les profils d'accès pour les membres de votre personnel.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau rôle
        </Button>
      </div>

      <div className="bg-white border rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-700">Rôle</th>
              <th className="px-4 py-3 font-medium text-gray-700">Description</th>
              <th className="px-4 py-3 font-medium text-gray-700">Utilisateurs</th>
              <th className="px-4 py-3 font-medium text-gray-700">Statut</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  Aucun rôle n'a été créé pour le moment.
                </td>
              </tr>
            ) : (
              roles.map((item) => (
                <tr key={item.role.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 flex items-center gap-2">
                      {item.role.name}
                      {item.role.is_system && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase tracking-wider">Système</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.permissions.length} modules autorisés</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {item.role.description || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {usageCounts[item.role.id] !== undefined ? usageCounts[item.role.id] : "..."}
                  </td>
                  <td className="px-4 py-3">
                    {item.role.active ? (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Actif</span>
                    ) : (
                      <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full">Inactif</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenForm(item)}>
                        Modifier
                      </Button>
                      {!item.role.is_system && (
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
