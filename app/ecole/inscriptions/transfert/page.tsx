"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Upload, FileText } from "lucide-react"
import Link from "next/link"
import { genererCodeUnique, genererQRCode, validerCodeUnique } from "@/utils/codeGenerator"

export default function TransfertEleve() {
  const [codeTransfert, setCodeTransfert] = useState("")
  const [eleveData, setEleveData] = useState<any>(null)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [transfertValide, setTransfertValide] = useState(false)
  const [nouveauCode, setNouveauCode] = useState("")
  const [nouveauQrCode, setNouveauQrCode] = useState("")

  const handleImportParCode = () => {
    // Simulation de l'import via code
    // En production, cela ferait appel à une API pour récupérer les données
    if (!validerCodeUnique(codeTransfert)) {
      setValidationErrors(["Format de code invalide"])
      return
    }

    // Simulation de données d'un élève transféré
    const mockData = {
      nom: "DUPONT",
      prenom: "Jean",
      dateNaissance: "2015-05-15",
      lieuNaissance: "Paris",
      sexe: "M",
      classePrecedente: "CE1",
      nomParent: "DUPONT",
      prenomParent: "Marie",
      telephoneParent: "0123456789",
      emailParent: "marie.dupont@email.com",
      adresse: "123 Rue de l'École, Paris",
      ecoleOriginale: "École Primaire de Paris",
      codeTransfert: codeTransfert,
    }

    setEleveData(mockData)
    setValidationErrors([])
  }

  const handleImportFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Simulation de l'import de fichier
    // En production, cela parserait le fichier JSON/XML
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string)
        setEleveData(data)
        setValidationErrors([])
      } catch (error) {
        setValidationErrors(["Format de fichier invalide"])
      }
    }
    reader.readAsText(file)
  }

  const handleValiderTransfert = () => {
    // Valider les informations
    const errors: string[] = []
    
    if (!eleveData.nom) errors.push("Nom manquant")
    if (!eleveData.prenom) errors.push("Prénom manquant")
    if (!eleveData.dateNaissance) errors.push("Date de naissance manquante")
    if (!eleveData.classePrecedente) errors.push("Classe précédente manquante")
    if (!eleveData.nomParent) errors.push("Nom du parent manquant")
    if (!eleveData.telephoneParent) errors.push("Téléphone du parent manquant")

    if (errors.length > 0) {
      setValidationErrors(errors)
      return
    }

    // Générer nouveau code local
    const newCode = genererCodeUnique()
    setNouveauCode(newCode)
    
    const newQrUrl = genererQRCode(newCode)
    setNouveauQrCode(newQrUrl)
    
    setTransfertValide(true)
    setValidationErrors([])
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/tableau-bord">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Transfert d'Élève
            </h1>
            <p className="text-gray-600">Réception d'un élève venant d'une autre école</p>
          </div>
        </div>

        {!eleveData ? (
          <div className="space-y-6">
            {/* Import par code */}
            <Card>
              <CardHeader>
                <CardTitle>Import par Code de Transfert</CardTitle>
                <CardDescription>Entrez le code unique de l'élève transféré</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ex: ECO-12345-2024"
                    value={codeTransfert}
                    onChange={(e) => setCodeTransfert(e.target.value)}
                  />
                  <Button onClick={handleImportParCode}>
                    Importer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Import par fichier */}
            <Card>
              <CardHeader>
                <CardTitle>Import par Fichier</CardTitle>
                <CardDescription>Téléversez le fichier de transfert</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".json,.xml"
                    onChange={handleImportFichier}
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    Parcourir
                  </Button>
                </div>
                <p className="text-sm text-gray-600">
                  Formats acceptés: JSON, XML
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Données de l'élève */}
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'Élève Transféré</CardTitle>
                <CardDescription>Vérifiez et validez les informations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom:</Label>
                    <p className="font-semibold">{eleveData.nom}</p>
                  </div>
                  <div>
                    <Label>Prénom:</Label>
                    <p className="font-semibold">{eleveData.prenom}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de Naissance:</Label>
                    <p className="font-semibold">{eleveData.dateNaissance}</p>
                  </div>
                  <div>
                    <Label>Lieu de Naissance:</Label>
                    <p className="font-semibold">{eleveData.lieuNaissance}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Sexe:</Label>
                    <p className="font-semibold">{eleveData.sexe}</p>
                  </div>
                  <div>
                    <Label>Classe Précédente:</Label>
                    <p className="font-semibold">{eleveData.classePrecedente}</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-lg font-bold">École d'Origine:</Label>
                  <p className="font-semibold text-blue-600">{eleveData.ecoleOriginale}</p>
                </div>
                <div className="border-t pt-4">
                  <Label className="text-lg font-bold">Code de Transfert:</Label>
                  <p className="font-mono font-bold">{eleveData.codeTransfert}</p>
                </div>
              </CardContent>
            </Card>

            {/* Informations des parents */}
            <Card>
              <CardHeader>
                <CardTitle>Informations des Parents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom du Parent:</Label>
                    <p className="font-semibold">{eleveData.nomParent}</p>
                  </div>
                  <div>
                    <Label>Prénom du Parent:</Label>
                    <p className="font-semibold">{eleveData.prenomParent}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Téléphone:</Label>
                    <p className="font-semibold">{eleveData.telephoneParent}</p>
                  </div>
                  <div>
                    <Label>Email:</Label>
                    <p className="font-semibold">{eleveData.emailParent}</p>
                  </div>
                </div>
                <div>
                  <Label>Adresse:</Label>
                  <p className="font-semibold">{eleveData.adresse}</p>
                </div>
              </CardContent>
            </Card>

            {/* Erreurs de validation */}
            {validationErrors.length > 0 && (
              <Card className="border-red-500">
                <CardHeader>
                  <CardTitle className="text-red-600">Erreurs de Validation</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="list-disc list-inside space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index} className="text-red-600">{error}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Boutons d'action */}
            <div className="flex gap-4">
              <Button onClick={handleValiderTransfert} className="flex-1" size="lg">
                Valider le Transfert
              </Button>
              <Button variant="outline" size="lg" onClick={() => {
                setEleveData(null)
                setCodeTransfert("")
                setValidationErrors([])
              }}>
                Annuler
              </Button>
            </div>
          </div>
        )}

        {/* Affichage après validation */}
        {transfertValide && (
          <Card className="mt-6 border-green-500">
            <CardHeader>
              <CardTitle className="text-green-600">Transfert Validé avec Succès !</CardTitle>
              <CardDescription>L'élève a été intégré dans le système</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom complet:</Label>
                  <p className="font-semibold">{eleveData.prenom} {eleveData.nom}</p>
                </div>
                <div>
                  <Label>Nouveau code local:</Label>
                  <p className="font-mono font-bold text-blue-600">{nouveauCode}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-lg font-bold">Nouveau QR Code:</Label>
                <div className="flex items-center gap-4 mt-2">
                  {nouveauQrCode && (
                    <img src={nouveauQrCode} alt="QR Code" className="w-48 h-48 border" />
                  )}
                  <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(nouveauCode)}>
                    Copier le code
                  </Button>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button className="flex-1" asChild>
                  <Link href="/ecole/students">
                    Voir la liste des élèves
                  </Link>
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.location.reload()}>
                  Autre transfert
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
