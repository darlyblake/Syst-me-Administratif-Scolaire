import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera } from "lucide-react"

interface StudentFormProps {
  student: any
  onSubmit: (student: any) => void
  onCancel: () => void
  isEdit?: boolean
  classes: string[]
}

export default function StudentForm({ student, onSubmit, onCancel, isEdit = false, classes }: StudentFormProps) {
  const [formData, setFormData] = useState(student)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const photoDataUrl = e.target?.result as string
      setFormData({ ...formData, photo: photoDataUrl })
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>{isEdit ? "Modifier l'élève" : "Ajouter un nouvel élève"}</CardTitle>
        <CardDescription>
          {isEdit ? "Modifiez les informations de l'élève" : "Les identifiants de connexion seront générés automatiquement"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-gray-200 mb-2 overflow-hidden flex items-center justify-center">
                {formData.photo ? (
                  <img src={formData.photo} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <label className="block text-sm font-medium mb-1">Photo de profil</label>
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="w-auto"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nom *</label>
              <Input
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                placeholder="Nom de famille"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Prénom *</label>
              <Input
                value={formData.prenom}
                onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                placeholder="Prénom"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de naissance</label>
              <Input
                type="date"
                value={formData.dateNaissance}
                onChange={(e) => setFormData({ ...formData, dateNaissance: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Classe *</label>
              <Select
                value={formData.classe}
                onValueChange={(value) => setFormData({ ...formData, classe: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une classe" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((classe) => (
                    <SelectItem key={classe} value={classe}>
                      {classe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Téléphone</label>
              <Input
                value={formData.telephone || ""}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                placeholder="Numéro de téléphone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <Input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Adresse email"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Adresse</label>
              <Input
                value={formData.adresse || ""}
                onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                placeholder="Adresse complète"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Montant à payer (FCFA)</label>
              <Input
                type="number"
                value={formData.totalAPayer}
                onChange={(e) => setFormData({ ...formData, totalAPayer: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            {isEdit && (
              <div>
                <label className="block text-sm font-medium mb-1">Statut</label>
                <Select
                  value={formData.statut}
                  onValueChange={(value: "actif" | "inactif") => setFormData({ ...formData, statut: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button type="submit">{isEdit ? "Enregistrer" : "Ajouter l'élève"}</Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Annuler
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}