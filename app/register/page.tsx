"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, User, Search } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { serviceParametres } from "@/services/parametres.service"
import type { DonneesEleve } from "@/types/models"

interface StudentData {
  id: string
  nom: string
  prenom: string
  dateNaissance: string
  lieuNaissance: string
  classe: string
  classeAncienne?: string
  nomParent: string
  contactParent: string
  adresse: string
  dateInscription: string
  typeInscription: "inscription" | "reinscription"
  fraisInscription: number
  fraisScolarite: number
  totalAPayer: number
  // Nouvelles propriétés pour paiement et options
  modePaiement: "mensuel" | "tranches"
  nombreTranches?: number
  moisPaiement?: string[]
  optionsSupplementaires: {
    tenueScolaire: boolean
    carteScolaire: boolean
    cooperative: boolean
    tenueEPS: boolean
    assurance: boolean
  }
  fraisOptionsSupplementaires: {
    tenueScolaire: number
    carteScolaire: number
    cooperative: number
    tenueEPS: number
    assurance: number
  }
}

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const inscriptionType = searchParams.get("type") as "inscription" | "reinscription"
  const studentId = searchParams.get("id")

  const [formData, setFormData] = useState({
    nom: "",
    prenom: "",
    dateNaissance: "",
    lieuNaissance: "",
    classe: "",
    classeAncienne: "",
    nomParent: "",
    contactParent: "",
    adresse: "",
    searchTerm: "",
    photo: "",
    // Nouvelles propriétés pour paiement et options
    modePaiement: "mensuel" as "mensuel" | "tranches",
    nombreTranches: 3,
    moisPaiement: [] as string[],
    optionsSupplementaires: {
      tenueScolaire: false,
      carteScolaire: false,
      cooperative: false,
      tenueEPS: false,
      assurance: false,
    },
  })

  const [existingStudent, setExistingStudent] = useState<DonneesEleve | null>(null)
  const [isRedoubling, setIsRedoubling] = useState(false)

  const classes = serviceParametres.obtenirTarification().map(t => t.classe)

  // Charger les données de l'élève si un ID est fourni
  useEffect(() => {
    if (studentId && inscriptionType === "reinscription") {
      const students = serviceEleves.obtenirTousLesEleves()
      const foundStudent = students.find((s: DonneesEleve) => s.id === studentId)
      if (foundStudent) {
        setExistingStudent(foundStudent)
        setFormData((prev) => ({
          ...prev,
          nom: foundStudent.nom,
          prenom: foundStudent.prenom,
          dateNaissance: foundStudent.dateNaissance,
          lieuNaissance: foundStudent.lieuNaissance || "",
          classe: foundStudent.classe,
          classeAncienne: foundStudent.classeAncienne || "",
          nomParent: foundStudent.nomParent || "",
          contactParent: foundStudent.contactParent || "",
          adresse: foundStudent.adresse || "",
          photo: foundStudent.photo || "",
          modePaiement: foundStudent.modePaiement || "mensuel",
          nombreTranches: foundStudent.nombreTranches || 3,
          moisPaiement: foundStudent.moisPaiement || [],
          optionsSupplementaires: foundStudent.optionsSupplementaires || {
            tenueScolaire: false,
            carteScolaire: false,
            cooperative: false,
            tenueEPS: false,
            assurance: false,
          },
        }))
      }
    }
  }, [studentId, inscriptionType])

  // Récupérer les paramètres de l'année académique
  const parametres = serviceParametres.obtenirParametres()
  const dateDebut = new Date(parametres.dateDebut)
  const dateFin = new Date(parametres.dateFin)
  const nombreMois = Math.ceil((dateFin.getTime() - dateDebut.getTime()) / (1000 * 60 * 60 * 24 * 30))

  // Prix par niveau (à récupérer des paramètres)
  const getPricing = (classe: string) => {
    const fraisClasse = serviceParametres.obtenirFraisClasse(classe)
    if (fraisClasse) {
      return {
        inscription: fraisClasse.fraisInscription,
        scolarite: fraisClasse.fraisScolarite
      }
    }
    return { inscription: 0, scolarite: 0 }
  }

  // Calculer les frais en fonction du mode de paiement
  const calculerFrais = () => {
    if (!formData.classe) return { fraisInscription: 0, fraisScolarite: 0, totalAPayer: 0, fraisParMois: 0, tranches: [] }

    const pricing = getPricing(formData.classe)
    const fraisInscription = inscriptionType === "reinscription" ? pricing.inscription * 0.5 : pricing.inscription

    // Calculer les frais des options supplémentaires
    const optionsPrix = serviceParametres.obtenirOptionsSupplementaires()
    const fraisOptions = Object.entries(formData.optionsSupplementaires)
      .filter(([_, selected]) => selected)
      .reduce((sum, [option]) => sum + optionsPrix[option as keyof typeof optionsPrix], 0)

    let fraisScolarite = 0
    let fraisParMois = 0
    let tranches: { numero: number; montant: number; mois: string[] }[] = []

    if (formData.modePaiement === "mensuel") {
      // Calcul mensuel basé sur les mois sélectionnés
      const nombreMoisPayes = formData.moisPaiement.length
      if (nombreMoisPayes > 0) {
        fraisParMois = Math.ceil((pricing.scolarite + fraisOptions) / nombreMois)
        fraisScolarite = fraisParMois * nombreMoisPayes
      }
    } else if (formData.modePaiement === "tranches") {
      // Calcul par tranches basé sur les tranches sélectionnées
      const tranchesSelectionnees = formData.moisPaiement.filter(m => m.startsWith("Tranche")).length
      if (tranchesSelectionnees > 0) {
        const nombreTranches = formData.nombreTranches || 3
        const montantParTranche = Math.ceil((pricing.scolarite + fraisOptions) / nombreTranches)
        fraisScolarite = montantParTranche * tranchesSelectionnees

        // Générer les tranches
        const moisParTranche = Math.ceil(nombreMois / nombreTranches)
        for (let i = 0; i < nombreTranches; i++) {
          const moisDebut = i * moisParTranche
          const moisFin = Math.min((i + 1) * moisParTranche, nombreMois)
          const moisTranche = ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"].slice(moisDebut, moisFin)

          tranches.push({
            numero: i + 1,
            montant: montantParTranche,
            mois: moisTranche
          })
        }
      }
    }

    const totalAPayer = fraisInscription + fraisScolarite

    return {
      fraisInscription,
      fraisScolarite,
      totalAPayer,
      fraisParMois,
      tranches
    }
  }

  const generateStudentId = () => {
    const year = new Date().getFullYear()
    const existingStudents = JSON.parse(localStorage.getItem("students") || "[]")
    const nextNumber = existingStudents.length + 1
    return `ELV-${year}-${nextNumber.toString().padStart(3, "0")}`
  }

  const searchExistingStudent = () => {
    if (!formData.searchTerm.trim()) {
      alert("Veuillez saisir un terme de recherche")
      return
    }

    const students = serviceEleves.obtenirTousLesEleves()
    console.log("Students found:", students.length, students)

    if (students.length === 0) {
      alert("Aucun élève trouvé dans la base de données. Veuillez d'abord inscrire des élèves.")
      return
    }

    const searchTerm = formData.searchTerm.toLowerCase().trim()
    const found = students.find(
      (s: DonneesEleve) => {
        const nom = s.nom?.toLowerCase() || ""
        const prenom = s.prenom?.toLowerCase() || ""
        const identifiant = s.identifiant?.toLowerCase() || ""

        return nom.includes(searchTerm) ||
               prenom.includes(searchTerm) ||
               identifiant.includes(searchTerm)
      }
    )

    if (found) {
      console.log("Student found:", found)
      setExistingStudent(found)
      setFormData((prev) => ({
        ...prev,
        nom: found.nom,
        prenom: found.prenom,
        dateNaissance: found.dateNaissance,
        lieuNaissance: found.lieuNaissance || "",
        classeAncienne: found.classe, // Classe actuelle devient classe ancienne
        nomParent: found.nomParent || "",
        contactParent: found.contactParent || "",
        adresse: found.adresse || "",
        classe: "", // Nouvelle classe à sélectionner
      }))
      setIsRedoubling(false) // Réinitialiser l'état de redoublement
    } else {
      alert(`Élève non trouvé avec le terme "${formData.searchTerm}".\n\nSuggestions :\n- Vérifiez l'orthographe\n- Essayez avec le nom complet\n- Utilisez l'identifiant de l'élève\n- Nombre d'élèves dans la base : ${students.length}`)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Réinitialiser l'état de redoublement si l'utilisateur change manuellement la classe
    if (field === "classe" && value !== formData.classeAncienne) {
      setIsRedoubling(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const pricing = getPricing(formData.classe)
    const fraisInscription = inscriptionType === "reinscription" ? pricing.inscription * 0.5 : pricing.inscription

    // Calculer les frais des options supplémentaires
    const optionsPrix = serviceParametres.obtenirOptionsSupplementaires()
    const fraisOptions = {
      tenueScolaire: formData.optionsSupplementaires.tenueScolaire ? optionsPrix.tenueScolaire : 0,
      carteScolaire: formData.optionsSupplementaires.carteScolaire ? optionsPrix.carteScolaire : 0,
      cooperative: formData.optionsSupplementaires.cooperative ? optionsPrix.cooperative : 0,
      tenueEPS: formData.optionsSupplementaires.tenueEPS ? optionsPrix.tenueEPS : 0,
      assurance: formData.optionsSupplementaires.assurance ? optionsPrix.assurance : 0,
    }

    const totalOptions = Object.values(fraisOptions).reduce((sum, prix) => sum + prix, 0)
    const totalAPayer = fraisInscription + pricing.scolarite + totalOptions

    // Use calculated fees for fraisScolarite and totalAPayer
    const fraisCalcules = calculerFrais()

    if (inscriptionType === "reinscription" && existingStudent) {
      // Vérifier si on vient de la modification (avec ID) ou d'une vraie réinscription
      const isModification = studentId !== null;

      if (isModification) {
        // Modification simple : ne changer que les infos élève et parent (pas la classe ni le paiement)
        const updatedStudent: DonneesEleve = {
          ...existingStudent,
          nom: formData.nom,
          prenom: formData.prenom,
          dateNaissance: formData.dateNaissance,
          lieuNaissance: formData.lieuNaissance,
          // Garder la classe existante
          classe: existingStudent.classe,
          classeAncienne: formData.classeAncienne,
          nomParent: formData.nomParent,
          contactParent: formData.contactParent,
          adresse: formData.adresse,
          photo: formData.photo,
          // Garder toutes les informations de paiement existantes
          fraisInscription: existingStudent.fraisInscription,
          fraisScolarite: existingStudent.fraisScolarite,
          totalAPayer: existingStudent.totalAPayer,
          modePaiement: existingStudent.modePaiement,
          nombreTranches: existingStudent.nombreTranches,
          moisPaiement: existingStudent.moisPaiement,
          optionsSupplementaires: existingStudent.optionsSupplementaires,
          fraisOptionsSupplementaires: existingStudent.fraisOptionsSupplementaires,
        }

        serviceEleves.modifierEleve(updatedStudent)
        router.push(`/students`) // Retour à la liste des élèves
      } else {
        // Vraie réinscription : mettre à jour la classe et recalculer les frais
        const updatedStudent: DonneesEleve = {
          ...existingStudent,
          nom: formData.nom,
          prenom: formData.prenom,
          dateNaissance: formData.dateNaissance,
          lieuNaissance: formData.lieuNaissance,
          classe: formData.classe, // Nouvelle classe sélectionnée
          classeAncienne: formData.classeAncienne, // Classe précédente
          nomParent: formData.nomParent,
          contactParent: formData.contactParent,
          adresse: formData.adresse,
          typeInscription: inscriptionType,
          fraisInscription: fraisCalcules.fraisInscription,
          fraisScolarite: fraisCalcules.fraisScolarite,
          totalAPayer: fraisCalcules.totalAPayer,
          identifiant: existingStudent.identifiant,
          motDePasse: existingStudent.motDePasse,
          informationsContact: existingStudent.informationsContact,
          statut: existingStudent.statut,
          dateInscription: existingStudent.dateInscription,
          photo: existingStudent.photo,
          // Nouvelles propriétés pour paiement
          modePaiement: formData.modePaiement,
          nombreTranches: formData.modePaiement === "tranches" ? formData.nombreTranches : undefined,
          moisPaiement: formData.modePaiement === "mensuel" ? formData.moisPaiement : undefined,
          optionsSupplementaires: formData.optionsSupplementaires,
          fraisOptionsSupplementaires: fraisOptions,
        }

        serviceEleves.modifierEleve(updatedStudent)
        router.push(`/receipt?id=${existingStudent.id}`)
      }
    } else {
      // Nouveau élève pour inscription
      const newStudent = serviceEleves.ajouterEleve({
        nom: formData.nom,
        prenom: formData.prenom,
        dateNaissance: formData.dateNaissance,
        lieuNaissance: formData.lieuNaissance,
        classe: formData.classe,
        totalAPayer: fraisCalcules.totalAPayer,
        informationsContact: {
          telephone: "",
          email: "",
          adresse: formData.adresse,
        },
        photo: "",
        fraisScolarite: fraisCalcules.fraisScolarite,
        fraisInscription: fraisCalcules.fraisInscription,
        adresse: formData.adresse,
        contactParent: formData.contactParent,
        nomParent: formData.nomParent,
        classeAncienne: formData.classeAncienne,
        typeInscription: inscriptionType,
        statut: "actif",
        dateInscription: new Date().toISOString(),
        // Nouvelles propriétés
        modePaiement: formData.modePaiement,
        nombreTranches: formData.modePaiement === "tranches" ? formData.nombreTranches : undefined,
        moisPaiement: formData.modePaiement === "mensuel" ? formData.moisPaiement : undefined,
        optionsSupplementaires: formData.optionsSupplementaires,
        fraisOptionsSupplementaires: fraisOptions,
      })

      router.push(`/receipt?id=${newStudent.id}`)
    }
  }

  const currentPricing = formData.classe ? getPricing(formData.classe) : null
  const optionsPrix = serviceParametres.obtenirOptionsSupplementaires()
  const fraisCalcules = calculerFrais()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {studentId ? "Modification élève" : inscriptionType === "inscription" ? "Nouvelle inscription" : "Réinscription"}
            </h1>
            <p className="text-gray-600">
              {studentId ? "Modifier les informations de l'élève" : inscriptionType === "inscription" ? "Inscrire un nouvel élève" : "Réinscrire un élève existant"}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Formulaire */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Informations de l'élève
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Recherche pour réinscription */}
                {inscriptionType === "reinscription" && !existingStudent && !studentId && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <Label className="text-base font-medium mb-2 block">Rechercher l'élève existant</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nom, prénom ou ID de l'élève..."
                        value={formData.searchTerm}
                        onChange={(e) => handleInputChange("searchTerm", e.target.value)}
                      />
                      <Button onClick={searchExistingStudent}>
                        <Search className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Informations personnelles */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => handleInputChange("nom", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="prenom">Prénom *</Label>
                      <Input
                        id="prenom"
                        value={formData.prenom}
                        onChange={(e) => handleInputChange("prenom", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateNaissance">Date de naissance *</Label>
                      <Input
                        id="dateNaissance"
                        type="date"
                        value={formData.dateNaissance}
                        onChange={(e) => handleInputChange("dateNaissance", e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lieuNaissance">Lieu de naissance *</Label>
                      <Input
                        id="lieuNaissance"
                        value={formData.lieuNaissance}
                        onChange={(e) => handleInputChange("lieuNaissance", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Photo de l'élève */}
                  <div className="space-y-2">
                    <Label htmlFor="photo">Photo de l'élève</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="photo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            const reader = new FileReader()
                            reader.onload = (e) => {
                              handleInputChange("photo", e.target?.result as string)
                            }
                            reader.readAsDataURL(file)
                          }
                        }}
                        className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
                      {formData.photo && (
                        <div className="relative">
                          <img
                            src={formData.photo}
                            alt="Photo de l'élève"
                            className="w-16 h-16 object-cover rounded-lg border-2 border-blue-200"
                          />
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Classes pour réinscription */}
                  {inscriptionType === "reinscription" && existingStudent && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium text-gray-900">Progression scolaire</h3>

                      {/* Classe de l'année dernière - Affichée seulement */}
                      <div className="space-y-2">
                        <Label>Classe de l'année dernière</Label>
                        <div className="p-3 bg-gray-50 rounded-md border text-gray-700 font-medium">
                          {formData.classeAncienne}
                        </div>
                      </div>

                      {/* Nouvelle classe */}
                      <div className="space-y-2">
                        <Label htmlFor="nouvelleClasse">Nouvelle classe *</Label>
                        <Select
                          value={formData.classe}
                          onValueChange={(value) => handleInputChange("classe", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionnez la nouvelle classe ou utilisez le bouton redoubler" />
                          </SelectTrigger>
                          <SelectContent>
                            {classes.map((classe) => (
                              <SelectItem key={classe} value={classe}>
                                {classe}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {isRedoubling && (
                          <p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                            ✅ Redoublement sélectionné pour la classe {formData.classeAncienne}
                          </p>
                        )}
                      </div>

                      {/* Bouton Redoubler */}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={isRedoubling ? "default" : "outline"}
                          onClick={() => {
                            handleInputChange("classe", formData.classeAncienne)
                            setIsRedoubling(true)
                          }}
                          className="flex-1"
                        >
                          🔄 Redoubler ({formData.classeAncienne})
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Classe - Masquée en mode modification */}
                  {!studentId && (
                    <div className="space-y-2">
                      <Label htmlFor="classe">Classe {inscriptionType === "reinscription" ? "actuelle" : ""} *</Label>
                      <Select value={formData.classe} onValueChange={(value) => handleInputChange("classe", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez la classe" />
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
                  )}

                  {/* Affichage de la classe actuelle en mode modification */}
                  {studentId && (
                    <div className="space-y-2">
                      <Label>Classe actuelle</Label>
                      <div className="p-3 bg-gray-50 rounded-md border text-gray-700 font-medium">
                        {formData.classe}
                      </div>
                    </div>
                  )}

                  {/* Informations parent */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium text-gray-900">Informations parent/tuteur</h3>

                    {/* Pour réinscription - Afficher en lecture seule */}
                    {inscriptionType === "reinscription" && existingStudent ? (
                      <>
                        <div className="space-y-2">
                          <Label>Nom du parent/tuteur</Label>
                          <div className="p-3 bg-gray-50 rounded-md border text-gray-700 font-medium">
                            {formData.nomParent}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Contact parent/tuteur</Label>
                          <div className="p-3 bg-gray-50 rounded-md border text-gray-700 font-medium">
                            {formData.contactParent}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Adresse complète</Label>
                          <div className="p-3 bg-gray-50 rounded-md border text-gray-700 font-medium">
                            {formData.adresse}
                          </div>
                        </div>
                      </>
                    ) : (
                      /* Pour nouvelle inscription - Champs modifiables */
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="nomParent">Nom du parent/tuteur *</Label>
                          <Input
                            id="nomParent"
                            value={formData.nomParent}
                            onChange={(e) => handleInputChange("nomParent", e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="contactParent">Contact parent/tuteur *</Label>
                          <Input
                            id="contactParent"
                            type="tel"
                            value={formData.contactParent}
                            onChange={(e) => handleInputChange("contactParent", e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="adresse">Adresse complète *</Label>
                          <Textarea
                            id="adresse"
                            value={formData.adresse}
                            onChange={(e) => handleInputChange("adresse", e.target.value)}
                            required
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Mode de paiement - Masqué en mode modification */}
                  {!studentId && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium text-gray-900">Mode de paiement</h3>

                    <div className="space-y-2">
                      <Label>Type de paiement *</Label>
                      <Select
                        value={formData.modePaiement}
                        onValueChange={(value: "mensuel" | "tranches") => handleInputChange("modePaiement", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionnez le mode de paiement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensuel">Paiement mensuel</SelectItem>
                          <SelectItem value="tranches">Paiement en tranches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.modePaiement === "tranches" && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="nombreTranches">Nombre de tranches *</Label>
                          <Select
                            value={formData.nombreTranches?.toString()}
                            onValueChange={(value) => handleInputChange("nombreTranches", Number.parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionnez le nombre de tranches" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 tranches</SelectItem>
                              <SelectItem value="3">3 tranches</SelectItem>
                              <SelectItem value="4">4 tranches</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sélection des tranches à payer */}
                        {formData.nombreTranches && (
                          <div className="space-y-2">
                            <Label>Tranches à payer *</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {Array.from({ length: formData.nombreTranches }, (_, i) => i + 1).map((tranche) => (
                                <div key={tranche} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={`tranche-${tranche}`}
                                    checked={formData.moisPaiement.includes(`Tranche ${tranche}`)}
                                    onChange={(e) => {
                                      const trancheLabel = `Tranche ${tranche}`
                                      const newTranches = e.target.checked
                                        ? [...formData.moisPaiement, trancheLabel]
                                        : formData.moisPaiement.filter(t => t !== trancheLabel)
                                      handleInputChange("moisPaiement", newTranches)
                                    }}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`tranche-${tranche}`} className="text-sm">
                                    {tranche}ère tranche
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {formData.modePaiement === "mensuel" && (
                      <div className="space-y-2">
                        <Label>Mois de paiement *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"].map((mois) => (
                            <div key={mois} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={mois}
                                checked={formData.moisPaiement.includes(mois)}
                                onChange={(e) => {
                                  const newMois = e.target.checked
                                    ? [...formData.moisPaiement, mois]
                                    : formData.moisPaiement.filter(m => m !== mois)
                                  handleInputChange("moisPaiement", newMois)
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={mois} className="text-sm">{mois}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    </div>
                  )}

                  {/* Options supplémentaires - Masquées en mode modification */}
                  {!studentId && (
                    <div className="space-y-4 pt-4 border-t">
                      <h3 className="text-lg font-medium text-gray-900">Options supplémentaires</h3>
                      <p className="text-sm text-gray-600">Cochez les options que vous souhaitez ajouter</p>

                      <div className="grid md:grid-cols-2 gap-4">
                        {[
                          { key: "tenueScolaire", label: "Tenue scolaire" },
                          { key: "carteScolaire", label: "Carte scolaire" },
                          { key: "cooperative", label: "Coopérative" },
                          { key: "tenueEPS", label: "Tenue EPS" },
                          { key: "assurance", label: "Assurance" },
                        ].map((option) => (
                          <div key={option.key} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={option.key}
                              checked={formData.optionsSupplementaires[option.key as keyof typeof formData.optionsSupplementaires]}
                              onChange={(e) => {
                                const newOptions = {
                                  ...formData.optionsSupplementaires,
                                  [option.key]: e.target.checked
                                }
                                handleInputChange("optionsSupplementaires", newOptions)
                              }}
                              className="rounded"
                            />
                            <Label htmlFor={option.key} className="text-sm">{option.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      (!studentId && !formData.classe) ||
                      (inscriptionType === "reinscription" && existingStudent && !formData.classe) ||
                      false
                    }
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {studentId ? "Modifier l'élève" : inscriptionType === "reinscription" ? "Finaliser la réinscription" : "Finaliser l'inscription"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Récapitulatif des frais - Masqué en mode modification */}
          {!studentId && (
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Récapitulatif des frais</CardTitle>
                  <CardDescription>
                    {inscriptionType === "inscription" ? "Nouvelle inscription" : "Réinscription"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                {currentPricing ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span>Frais d'inscription:</span>
                      <span className="font-medium">
                        {fraisCalcules.fraisInscription.toLocaleString()} FCFA
                      </span>
                    </div>

                    {fraisCalcules.fraisScolarite > 0 && (
                      <div className="flex justify-between">
                        <span>Frais de scolarité:</span>
                        <span className="font-medium">{fraisCalcules.fraisScolarite.toLocaleString()} FCFA</span>
                      </div>
                    )}

                    {/* Détail du paiement mensuel */}
                    {formData.modePaiement === "mensuel" && fraisCalcules.fraisParMois > 0 && (
                      <div className="text-sm text-gray-600 bg-blue-50 p-2 rounded">
                        <div>Frais par mois: {fraisCalcules.fraisParMois.toLocaleString()} FCFA</div>
                        <div>Mois sélectionnés: {formData.moisPaiement.length}</div>
                      </div>
                    )}

                    {/* Détail du paiement par tranches */}
                    {formData.modePaiement === "tranches" && fraisCalcules.tranches.length > 0 && (
                      <div className="text-sm text-gray-600 bg-green-50 p-2 rounded">
                        <div>Nombre de tranches: {formData.nombreTranches}</div>
                        <div>Tranches sélectionnées: {formData.moisPaiement.filter(m => m.startsWith("Tranche")).length}</div>
                        {fraisCalcules.tranches.map((tranche, index) => (
                          <div key={index} className="mt-1">
                            {tranche.numero}ère tranche: {tranche.montant.toLocaleString()} FCFA
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Options supplémentaires sélectionnées */}
                    {Object.entries(formData.optionsSupplementaires).some(([_, selected]) => selected) && (
                      <div className="border-t pt-2">
                        <h4 className="font-medium text-gray-900 mb-2">Options supplémentaires:</h4>
                        <div className="space-y-1">
                          {Object.entries(formData.optionsSupplementaires).map(([option, selected]) => {
                            if (!selected) return null
                            const optionLabels: { [key: string]: string } = {
                              tenueScolaire: "Tenue scolaire",
                              carteScolaire: "Carte scolaire",
                              cooperative: "Coopérative",
                              tenueEPS: "Tenue EPS",
                              assurance: "Assurance"
                            }
                            const prix = optionsPrix[option as keyof typeof optionsPrix]
                            return (
                              <div key={option} className="flex justify-between text-sm">
                                <span>{optionLabels[option]}:</span>
                                <span>{prix.toLocaleString()} FCFA</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="border-t pt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total à payer:</span>
                        <span className="text-blue-600">
                          {fraisCalcules.totalAPayer.toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>

                    {/* Mode de paiement */}
                    <div className="border-t pt-2">
                      <div className="text-sm text-gray-600">
                        <strong>Mode de paiement:</strong>{" "}
                        {formData.modePaiement === "mensuel"
                          ? `Mensuel (${formData.moisPaiement.length} mois sélectionnés)`
                          : `Par tranches (${formData.moisPaiement.filter(m => m.startsWith("Tranche")).length}/${formData.nombreTranches} tranches)`
                        }
                      </div>
                    </div>

                    {inscriptionType === "reinscription" && (
                      <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                        Réduction de 50% sur les frais d'inscription
                      </div>
                    )}

                    {fraisCalcules.totalAPayer === 0 && (
                      <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                        Aucun frais calculé - Veuillez sélectionner un mode de paiement et les périodes correspondantes
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">Sélectionnez une classe pour voir les frais</div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
