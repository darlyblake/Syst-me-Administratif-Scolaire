"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, User, Search, Loader2 } from "lucide-react"
import Link from "next/link"
import { serviceEleves } from "@/services/eleves.service"
import { serviceParametres } from "@/services/parametres.service"
import type { DonneesEleve } from "@/types/models"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

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
  optionsPersonnalisees?: string[]
  fraisOptionsSupplementaires: {
    tenueScolaire: number
    carteScolaire: number
    cooperative: number
    tenueEPS: number
    assurance: number
  }
}

// Schéma de validation Zod
const studentFormSchema = z.object({
  nom: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  prenom: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  dateNaissance: z.string().min(1, "La date de naissance est requise"),
  lieuNaissance: z.string().min(2, "Le lieu de naissance doit contenir au moins 2 caractères"),
  classe: z.string().min(1, "La classe est requise"),
  classeAncienne: z.string().optional(),
  nomParent: z.string().min(2, "Le nom du parent doit contenir au moins 2 caractères"),
  contactParent: z.string().min(8, "Le contact doit contenir au moins 8 caractères"),
  adresse: z.string().min(10, "L'adresse doit contenir au moins 10 caractères"),
  searchTerm: z.string().optional(),
  photo: z.string().optional(),
  modePaiement: z.enum(["mensuel", "tranches"]),
  nombreTranches: z.number().optional(),
  moisPaiement: z.array(z.string()).optional(),
  optionsSupplementaires: z.object({
    tenueScolaire: z.boolean(),
    carteScolaire: z.boolean(),
    cooperative: z.boolean(),
    tenueEPS: z.boolean(),
    assurance: z.boolean(),
  }),
  optionsPersonnalisees: z.array(z.string()).optional(),
})

type StudentFormData = z.infer<typeof studentFormSchema>

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()
  const inscriptionType = searchParams.get("type") as "inscription" | "reinscription"
  const studentId = searchParams.get("id")

  const [existingStudent, setExistingStudent] = useState<DonneesEleve | null>(null)
  const [isRedoubling, setIsRedoubling] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<StudentFormData>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
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
      modePaiement: "mensuel",
      nombreTranches: 3,
      moisPaiement: [],
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      optionsPersonnalisees: [],
    },
  })

  const { register, setValue, watch, formState: { errors } } = form
  const formData = watch()

  const classes = serviceParametres.obtenirTarification().map(t => t.classe)

  // Charger les données de l'élève si un ID est fourni
  useEffect(() => {
    if (studentId && inscriptionType === "reinscription") {
      const students = serviceEleves.obtenirTousLesEleves()
      const foundStudent = students.find((s: DonneesEleve) => s.id === studentId)
      if (foundStudent) {
        setExistingStudent(foundStudent)
        setValue("nom", foundStudent.nom)
        setValue("prenom", foundStudent.prenom)
        setValue("dateNaissance", foundStudent.dateNaissance)
        setValue("lieuNaissance", foundStudent.lieuNaissance || "")
        setValue("classe", foundStudent.classe)
        setValue("classeAncienne", foundStudent.classeAncienne || "")
        setValue("nomParent", foundStudent.nomParent || "")
        setValue("contactParent", foundStudent.contactParent || "")
        setValue("adresse", foundStudent.adresse || "")
        setValue("photo", foundStudent.photo || "")
        setValue("modePaiement", foundStudent.modePaiement || "mensuel")
        setValue("nombreTranches", foundStudent.nombreTranches || 3)
        setValue("moisPaiement", foundStudent.moisPaiement || [])
        setValue("optionsSupplementaires", foundStudent.optionsSupplementaires || {
          tenueScolaire: false,
          carteScolaire: false,
          cooperative: false,
          tenueEPS: false,
          assurance: false,
        })
        setValue("optionsPersonnalisees", foundStudent.optionsPersonnalisees || [])
      }
    }
  }, [studentId, inscriptionType])

  // Récupérer les paramètres de l'année académique
  const parametres = serviceParametres.obtenirParametres()
  const dateDebut = new Date(parametres.dateDebut)
  const dateFin = new Date(parametres.dateFin)

  const genererMoisPeriode = () => {
    const mois: string[] = []
    let current = new Date(dateDebut.getFullYear(), dateDebut.getMonth(), 1)
    while (current <= dateFin) {
      const nomMois = current.toLocaleDateString('fr-FR', { month: 'long' }).charAt(0).toUpperCase() + current.toLocaleDateString('fr-FR', { month: 'long' }).slice(1)
      if (!mois.includes(nomMois)) {
        mois.push(nomMois)
      }
      current.setMonth(current.getMonth() + 1)
    }
    return mois
  }

  const moisDisponibles = genererMoisPeriode()
  const nombreMois = moisDisponibles.length

  // Réinitialiser les mois de paiement quand on change de mode
  useEffect(() => {
    if (formData.modePaiement !== "mensuel") {
      setValue("moisPaiement", [])
    }
  }, [formData.modePaiement])

  // Récupérer les paramètres de paiement
  const parametresPaiement = serviceParametres.obtenirParametresPaiement()

  // Prix par niveau (à récupérer des paramètres)
  const getPricing = (classe: string) => {
    const fraisClasse = serviceParametres.obtenirFraisClasse(classe)
    if (fraisClasse) {
      return {
        inscription: fraisClasse.fraisInscription,
        scolarite: fraisClasse.fraisScolariteAnnuelle
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
    const optionsPersonnalisees = serviceParametres.obtenirOptionsSupplementairesPersonnalisees()
    const fraisOptions = Object.entries(formData.optionsSupplementaires)
      .filter(([_, selected]) => selected)
      .reduce((sum, [option]) => sum + optionsPrix[option as keyof typeof optionsPrix], 0) +
      (formData.optionsPersonnalisees || []).reduce((sum, optionId) => {
        const option = optionsPersonnalisees.find(opt => opt.id === optionId)
        return sum + (option ? option.prix : 0)
      }, 0)

    let fraisScolarite = 0
    let fraisParMois = 0
    let tranches: { numero: number; montant: number; dateDebut: string; dateFin: string; pourcentage: number }[] = []

    if (formData.modePaiement === "mensuel") {
      // Calcul mensuel basé sur les mois sélectionnés
      const nombreMoisPayes = formData.moisPaiement?.length || 0
      if (nombreMoisPayes > 0) {
        fraisParMois = Math.ceil((pricing.scolarite + fraisOptions) / nombreMois)
        fraisScolarite = fraisParMois * nombreMoisPayes
      }
    } else if (formData.modePaiement === "tranches") {
      // Utiliser les tranches configurées dans les paramètres
      const tranchesSelectionnees = formData.moisPaiement?.filter(m => m.startsWith("Tranche")).length || 0
      if (tranchesSelectionnees > 0 && parametresPaiement.tranchesPaiement.length > 0) {
        const totalPourcentages = parametresPaiement.tranchesPaiement.reduce((sum, tranche) => sum + tranche.pourcentage, 0)
        const montantTotal = pricing.scolarite + fraisOptions

        fraisScolarite = 0
        tranches = []

        // Calculer le montant pour chaque tranche sélectionnée
        parametresPaiement.tranchesPaiement.forEach((trancheConfig, index) => {
          if (formData.moisPaiement?.includes(`Tranche ${trancheConfig.numero}`)) {
            const montantTranche = Math.ceil((montantTotal * trancheConfig.pourcentage) / 100)
            fraisScolarite += montantTranche

            tranches.push({
              numero: trancheConfig.numero,
              montant: montantTranche,
              dateDebut: trancheConfig.dateDebut,
              dateFin: trancheConfig.dateFin,
              pourcentage: trancheConfig.pourcentage
            })
          }
        })
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

  const searchExistingStudent = async () => {
    if (!formData.searchTerm?.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un terme de recherche",
        variant: "destructive",
      })
      return
    }

    setIsSearching(true)
    try {
      const students = serviceEleves.obtenirTousLesEleves()
      console.log("Students found:", students.length, students)

      if (students.length === 0) {
        toast({
          title: "Aucun élève trouvé",
          description: "Veuillez d'abord inscrire des élèves dans la base de données.",
          variant: "destructive",
        })
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
        setValue("nom", found.nom)
        setValue("prenom", found.prenom)
        setValue("dateNaissance", found.dateNaissance)
        setValue("lieuNaissance", found.lieuNaissance || "")
        setValue("classeAncienne", found.classe) // Classe actuelle devient classe ancienne
        setValue("nomParent", found.nomParent || "")
        setValue("contactParent", found.contactParent || "")
        setValue("adresse", found.adresse || "")
        setValue("classe", "") // Nouvelle classe à sélectionner
        setIsRedoubling(false) // Réinitialiser l'état de redoublement

        toast({
          title: "Élève trouvé",
          description: `${found.nom} ${found.prenom} a été trouvé et chargé.`,
        })
      } else {
        toast({
          title: "Élève non trouvé",
          description: `Aucun élève trouvé avec le terme "${formData.searchTerm}".\n\nSuggestions :\n- Vérifiez l'orthographe\n- Essayez avec le nom complet\n- Utilisez l'identifiant de l'élève\n- Nombre d'élèves dans la base : ${students.length}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la recherche.",
        variant: "destructive",
      })
    } finally {
      setIsSearching(false)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setValue(field as keyof StudentFormData, value)

    // Réinitialiser l'état de redoublement si l'utilisateur change manuellement la classe
    if (field === "classe" && value !== formData.classeAncienne) {
      setIsRedoubling(false)
    }
  }

  const onSubmit = async (data: StudentFormData) => {
    setIsSubmitting(true)
    try {
      const pricing = getPricing(data.classe)
      const fraisInscription = inscriptionType === "reinscription" ? pricing.inscription * 0.5 : pricing.inscription

      // Calculer les frais des options supplémentaires
      const optionsPrix = serviceParametres.obtenirOptionsSupplementaires()
      const fraisOptions = {
        tenueScolaire: data.optionsSupplementaires.tenueScolaire ? optionsPrix.tenueScolaire : 0,
        carteScolaire: data.optionsSupplementaires.carteScolaire ? optionsPrix.carteScolaire : 0,
        cooperative: data.optionsSupplementaires.cooperative ? optionsPrix.cooperative : 0,
        tenueEPS: data.optionsSupplementaires.tenueEPS ? optionsPrix.tenueEPS : 0,
        assurance: data.optionsSupplementaires.assurance ? optionsPrix.assurance : 0,
      }

      const totalOptions = Object.values(fraisOptions).reduce((sum, prix) => sum + prix, 0)
      const totalAPayer = fraisInscription + pricing.scolarite + totalOptions

      // Use calculated fees for fraisScolarite and totalAPayer
      const fraisCalcules = calculerFrais()

      if (inscriptionType === "reinscription" && existingStudent) {
        // Vérifier si on vient de la modification (avec ID) ou d'une vraie réinscription
        const isModification = studentId !== null;

        if (isModification) {
          // Modification complète : mettre à jour toutes les infos, recalculer pour options et paiement
          const optionsPrix = serviceParametres.obtenirOptionsSupplementaires()
          const optionsPersonnalisees = serviceParametres.obtenirOptionsSupplementairesPersonnalisees()
          const fraisOptions = {
            tenueScolaire: data.optionsSupplementaires.tenueScolaire ? optionsPrix.tenueScolaire : 0,
            carteScolaire: data.optionsSupplementaires.carteScolaire ? optionsPrix.carteScolaire : 0,
            cooperative: data.optionsSupplementaires.cooperative ? optionsPrix.cooperative : 0,
            tenueEPS: data.optionsSupplementaires.tenueEPS ? optionsPrix.tenueEPS : 0,
            assurance: data.optionsSupplementaires.assurance ? optionsPrix.assurance : 0,
          }
          const standardOptionsTotal = Object.values(fraisOptions).reduce((sum, prix) => sum + prix, 0)
          const personalOptionsTotal = (data.optionsPersonnalisees || []).reduce((sum, optionId) => {
            const option = optionsPersonnalisees.find(opt => opt.id === optionId)
            return sum + (option ? option.prix : 0)
          }, 0)
          const newOptionsTotal = standardOptionsTotal + personalOptionsTotal
          const oldStandardOptionsTotal = Object.values(existingStudent.fraisOptionsSupplementaires || {}).reduce((sum, v) => sum + v, 0)
          const oldPersonalOptionsTotal = (existingStudent.optionsPersonnalisees || []).reduce((sum, optionId) => {
            const option = optionsPersonnalisees.find(opt => opt.id === optionId)
            return sum + (option ? option.prix : 0)
          }, 0)
          const oldOptionsTotal = oldStandardOptionsTotal + oldPersonalOptionsTotal
          const newTotalAPayer = existingStudent.totalAPayer - oldOptionsTotal + newOptionsTotal

          const updatedStudent: DonneesEleve = {
            ...existingStudent,
            nom: data.nom,
            prenom: data.prenom,
            dateNaissance: data.dateNaissance,
            lieuNaissance: data.lieuNaissance,
            classe: existingStudent.classe,
            classeAncienne: existingStudent.classeAncienne,
            nomParent: data.nomParent,
            contactParent: data.contactParent,
            adresse: data.adresse,
            photo: data.photo,
            fraisInscription: existingStudent.fraisInscription,
            fraisScolarite: existingStudent.fraisScolarite,
            totalAPayer: newTotalAPayer,
            modePaiement: data.modePaiement,
            nombreTranches: data.nombreTranches,
            moisPaiement: data.moisPaiement,
            optionsSupplementaires: data.optionsSupplementaires,
            fraisOptionsSupplementaires: fraisOptions,
            optionsPersonnalisees: data.optionsPersonnalisees,
          }

          serviceEleves.modifierEleve(updatedStudent)
          toast({
            title: "Modification réussie",
            description: "Les informations de l'élève ont été mises à jour avec les nouveaux paramètres.",
          })
          router.push(`/students`) // Retour à la liste des élèves
        } else {
          // Vraie réinscription : mettre à jour la classe et recalculer les frais
          const updatedStudent: DonneesEleve = {
            ...existingStudent,
            nom: data.nom,
            prenom: data.prenom,
            dateNaissance: data.dateNaissance,
            lieuNaissance: data.lieuNaissance,
            classe: data.classe, // Nouvelle classe sélectionnée
            classeAncienne: data.classeAncienne, // Classe précédente
            nomParent: data.nomParent,
            contactParent: data.contactParent,
            adresse: data.adresse,
            typeInscription: inscriptionType,
            fraisInscription: fraisCalcules.fraisInscription,
            fraisScolarite: fraisCalcules.fraisScolarite,
            totalAPayer: fraisCalcules.totalAPayer,
            identifiant: existingStudent.identifiant,
            motDePasse: existingStudent.motDePasse,
            informationsContact: existingStudent.informationsContact,
            statut: existingStudent.statut,
            dateInscription: new Date().toISOString(),
            photo: existingStudent.photo,
            // Nouvelles propriétés pour paiement
            modePaiement: data.modePaiement,
            nombreTranches: data.modePaiement === "tranches" ? data.nombreTranches : undefined,
            moisPaiement: data.modePaiement === "mensuel" ? data.moisPaiement : undefined,
            optionsSupplementaires: data.optionsSupplementaires,
            fraisOptionsSupplementaires: fraisOptions,
            optionsPersonnalisees: data.optionsPersonnalisees,
          }

          serviceEleves.modifierEleve(updatedStudent)
          toast({
            title: "Réinscription réussie",
            description: "L'élève a été réinscrit avec succès.",
          })
          router.push(`/receipt?id=${existingStudent.id}`)
        }
      } else {
        // Nouveau élève pour inscription
        const newStudent = serviceEleves.ajouterEleve({
          nom: data.nom,
          prenom: data.prenom,
          dateNaissance: data.dateNaissance,
          lieuNaissance: data.lieuNaissance,
          classe: data.classe,
          totalAPayer: fraisCalcules.totalAPayer,
          informationsContact: {
            telephone: "",
            email: "",
            adresse: data.adresse,
          },
          photo: "",
          fraisScolarite: fraisCalcules.fraisScolarite,
          fraisInscription: fraisCalcules.fraisInscription,
          adresse: data.adresse,
          contactParent: data.contactParent,
          nomParent: data.nomParent,
          classeAncienne: data.classeAncienne,
          typeInscription: inscriptionType,
          statut: "actif",
          dateInscription: new Date().toISOString(),
          // Nouvelles propriétés
          modePaiement: data.modePaiement,
          nombreTranches: data.modePaiement === "tranches" ? data.nombreTranches : undefined,
          moisPaiement: data.modePaiement === "mensuel" ? data.moisPaiement : undefined,
          optionsSupplementaires: data.optionsSupplementaires,
          fraisOptionsSupplementaires: fraisOptions,
          optionsPersonnalisees: data.optionsPersonnalisees,
        })

        toast({
          title: "Inscription réussie",
          description: "L'élève a été inscrit avec succès.",
        })
        router.push(`/receipt?id=${newStudent.id}`)
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de l'enregistrement.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentPricing = formData.classe ? getPricing(formData.classe) : null
  const optionsPrix = serviceParametres.obtenirOptionsSupplementaires()
  const optionsPersonnalisees = serviceParametres.obtenirOptionsSupplementairesPersonnalisees()
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

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    {inscriptionType === "reinscription" && existingStudent && !studentId ? (
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
                      /* Pour nouvelle inscription et modification - Champs modifiables */
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

                  {/* Mode de paiement */}
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
                        {parametresPaiement.tranchesPaiement.length > 0 && (
                          <div className="space-y-2">
                            <Label>Tranches à payer *</Label>
                            <div className="space-y-2">
                              {parametresPaiement.tranchesPaiement.map((tranche) => (
                                <div key={tranche.numero} className="flex items-center space-x-2 p-3 border rounded-lg">
                                  <input
                                    type="checkbox"
                                    id={`tranche-${tranche.numero}`}
                                    checked={formData.moisPaiement?.includes(`Tranche ${tranche.numero}`) || false}
                                    onChange={(e) => {
                                      const trancheLabel = `Tranche ${tranche.numero}`
                                      const currentMois = formData.moisPaiement || []
                                      const newTranches = e.target.checked
                                        ? [...currentMois, trancheLabel]
                                        : currentMois.filter(t => t !== trancheLabel)
                                      handleInputChange("moisPaiement", newTranches)
                                    }}
                                    className="rounded"
                                  />
                                  <div className="flex-1">
                                    <Label htmlFor={`tranche-${tranche.numero}`} className="text-sm font-medium">
                                      {tranche.numero}ère tranche - {tranche.nom}
                                    </Label>
                                    <div className="text-xs text-gray-600">
                                      Du {tranche.dateDebut ? new Date(tranche.dateDebut).toLocaleDateString('fr-FR') : 'N/A'} au {tranche.dateFin ? new Date(tranche.dateFin).toLocaleDateString('fr-FR') : 'N/A'} ({tranche.pourcentage}%)
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {parametresPaiement.tranchesPaiement.length === 0 && (
                          <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded">
                            ⚠️ Aucune tranche configurée. Veuillez d'abord configurer les tranches de paiement dans les paramètres du système.
                          </div>
                        )}
                      </div>
                    )}

                    {formData.modePaiement === "mensuel" && (
                      <div className="space-y-2">
                        <Label>Mois de paiement *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {moisDisponibles.map((mois) => (
                            <div key={mois} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={mois}
                                checked={formData.moisPaiement?.includes(mois) || false}
                                onChange={(e) => {
                                  const currentMois = formData.moisPaiement || []
                                  const newMois = e.target.checked
                                    ? [...currentMois, mois]
                                    : currentMois.filter(m => m !== mois)
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

                  {/* Options supplémentaires */}
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

                    {/* Options personnalisées */}
                    {optionsPersonnalisees.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Options personnalisées</h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {optionsPersonnalisees.map((option) => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`custom-${option.id}`}
                                checked={formData.optionsPersonnalisees?.includes(option.id) || false}
                                onChange={(e) => {
                                  const newOptions = e.target.checked
                                    ? [...(formData.optionsPersonnalisees || []), option.id]
                                    : (formData.optionsPersonnalisees || []).filter(id => id !== option.id)
                                  setValue("optionsPersonnalisees", newOptions)
                                }}
                                className="rounded"
                              />
                              <Label htmlFor={`custom-${option.id}`} className="text-sm">
                                {option.nom} ({option.prix.toLocaleString()} FCFA)
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

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

          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Récapitulatif des frais</CardTitle>
                <CardDescription>
                  {studentId ? "Modification" : inscriptionType === "inscription" ? "Nouvelle inscription" : "Réinscription"}
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
                      <div>Mois sélectionnés: {formData.moisPaiement?.length || 0}</div>
                    </div>
                  )}

                  {/* Détail du paiement par tranches */}
                  {formData.modePaiement === "tranches" && fraisCalcules.tranches.length > 0 && (
                    <div className="text-sm text-gray-600 bg-green-50 p-2 rounded">
                      <div>Nombre de tranches: {formData.nombreTranches}</div>
                      <div>Tranches sélectionnées: {formData.moisPaiement?.filter(m => m.startsWith("Tranche")).length || 0}</div>
                      {fraisCalcules.tranches.map((tranche, index) => (
                        <div key={index} className="mt-1">
                          {tranche.numero}ère tranche ({tranche.pourcentage}%): {tranche.montant.toLocaleString()} FCFA
                          {tranche.dateDebut && tranche.dateFin && (
                            <div className="text-xs text-gray-500 ml-4">
                              Du {new Date(tranche.dateDebut).toLocaleDateString('fr-FR')} au {new Date(tranche.dateFin).toLocaleDateString('fr-FR')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Options supplémentaires sélectionnées */}
                  {(Object.entries(formData.optionsSupplementaires).some(([_, selected]) => selected) ||
                    (formData.optionsPersonnalisees && formData.optionsPersonnalisees.length > 0)) && (
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
                        {/* Options personnalisées sélectionnées */}
                        {formData.optionsPersonnalisees?.map((optionId) => {
                          const option = optionsPersonnalisees.find(opt => opt.id === optionId)
                          if (!option) return null
                          return (
                            <div key={option.id} className="flex justify-between text-sm">
                              <span>{option.nom}:</span>
                              <span>{option.prix.toLocaleString()} FCFA</span>
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
                        ? `Mensuel (${formData.moisPaiement?.length || 0} mois sélectionnés)`
                        : `Par tranches (${formData.moisPaiement?.filter(m => m.startsWith("Tranche")).length || 0}/${parametresPaiement.tranchesPaiement.length} tranches configurées)`
                      }
                    </div>
                  </div>

                  {inscriptionType === "reinscription" && !studentId && (
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
      </div>
    </div>
  )
}
