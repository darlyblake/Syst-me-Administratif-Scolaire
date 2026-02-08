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
import { servicePaiements } from "@/services/paiements.service"
import { serviceFinances } from "@/services/finances.service"

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

  const moisDisponibles = ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"]
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

  // Calculer les frais en fonction du mode de paiement en utilisant le service centralisé
  const calculerFrais = () => {
    if (!formData.classe) return { 
      fraisInscription: 0, 
      fraisScolarite: 0, 
      totalAPayer: 0, 
      fraisParMois: 0, 
      tranches: [], 
      fraisOptions: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      } }

    // Utiliser le service centralisé pour tous les calculs de frais
    return serviceFinances.calculerFraisDetaille(
      {
        classe: formData.classe,
        typeInscription: inscriptionType,
        optionsSupplementaires: formData.optionsSupplementaires,
        optionsPersonnalisees: formData.optionsPersonnalisees,
      },
      formData.modePaiement,
      formData.moisPaiement || [],
      parametresPaiement.tranchesPaiement
    );
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
      // Utiliser la fonction de calcul centralisée
      const fraisCalcules = calculerFrais()

      if (inscriptionType === "reinscription" && existingStudent) {

        const isModification = studentId !== null;

        if (isModification) {
          const updatedStudent: DonneesEleve = {
            ...existingStudent,
            nom: data.nom,
            prenom: data.prenom,
            dateNaissance: data.dateNaissance,
            lieuNaissance: data.lieuNaissance,
            classe: data.classe, // La classe peut être modifiée
            classeAncienne: data.classeAncienne,
            nomParent: data.nomParent,
            contactParent: data.contactParent,
            adresse: data.adresse,
            photo: data.photo,
            totalAPayer: fraisCalcules.totalAPayer, // Recalculé
            modePaiement: data.modePaiement,
            nombreTranches: data.nombreTranches,
            moisPaiement: data.moisPaiement,
            optionsSupplementaires: data.optionsSupplementaires,
            fraisOptionsSupplementaires: fraisCalcules.fraisOptions,
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
            fraisOptionsSupplementaires: fraisCalcules.fraisOptions,
            optionsPersonnalisees: data.optionsPersonnalisees,
          }

          serviceEleves.modifierEleve(updatedStudent)

          // Créer les enregistrements de paiement réels pour réinscription
          if (fraisCalcules.fraisInscription > 0) {
            servicePaiements.ajouterPaiement({
              eleveId: existingStudent.id,
              montant: fraisCalcules.fraisInscription,
              typePaiement: 'inscription',
              datePaiement: new Date().toISOString(),
              methodePaiement: 'especes',
              description: `Frais d'inscription ${parametres.anneeAcademique}`,
            });
          }

          // Créer des paiements séparés pour chaque mois ou tranche
          if (data.modePaiement === "mensuel" && data.moisPaiement && data.moisPaiement.length > 0) {
            data.moisPaiement.forEach(mois => {
              servicePaiements.ajouterPaiement({
                eleveId: existingStudent.id,
                montant: fraisCalcules.fraisParMois,
                typePaiement: "scolarite",
                datePaiement: new Date().toISOString(),
                methodePaiement: 'especes',
                description: `Paiement scolarité ${mois} ${parametres.anneeAcademique}`,
                moisPaiement: [mois],
              });
            });
          } else if (data.modePaiement === "tranches" && fraisCalcules.tranches.length > 0) {
            fraisCalcules.tranches.forEach(tranche => {
              servicePaiements.ajouterPaiement({
                eleveId: existingStudent.id,
                montant: tranche.montant,
                typePaiement: "scolarite",
                datePaiement: new Date().toISOString(),
                methodePaiement: 'especes',
                description: `Paiement tranche ${tranche.numero} ${parametres.anneeAcademique}`,
                moisPaiement: [`Tranche ${tranche.numero}`],
              });
            });
          }

          // Créer des paiements pour les options sélectionnées lors de la réinscription
          Object.entries(fraisCalcules.fraisOptions).forEach(([key, prix]) => {
            if (prix > 0) {
              servicePaiements.ajouterPaiement({
                eleveId: existingStudent.id,
                montant: prix,
                typePaiement: 'autre',
                datePaiement: new Date().toISOString(),
                methodePaiement: 'especes',
                description: `Option: ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`,
                // moisPaiement n'est pas pertinent pour les options
                // On pourrait utiliser un autre champ si nécessaire
              });
            }
          });
          // (Ajouter ici la logique pour les options personnalisées si nécessaire)

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
          fraisOptionsSupplementaires: fraisCalcules.fraisOptions,
          optionsPersonnalisees: data.optionsPersonnalisees,
        })

        // Créer les enregistrements de paiement réels
        if (fraisCalcules.fraisInscription > 0) {
          servicePaiements.ajouterPaiement({
            eleveId: newStudent.id,
            montant: fraisCalcules.fraisInscription,
            typePaiement: 'inscription',
            datePaiement: new Date().toISOString(),
            methodePaiement: 'especes', // ou une méthode par défaut
            description: `Frais d'inscription ${parametres.anneeAcademique}`,
          });
        }

        // Créer des paiements séparés pour chaque mois ou tranche
        if (data.modePaiement === "mensuel" && data.moisPaiement && data.moisPaiement.length > 0) {
          data.moisPaiement.forEach(mois => {
            servicePaiements.ajouterPaiement({
              eleveId: newStudent.id,
              montant: fraisCalcules.fraisParMois,
              typePaiement: "scolarite",
              datePaiement: new Date().toISOString(),
              methodePaiement: 'especes',
              description: `Paiement scolarité ${mois} ${parametres.anneeAcademique}`,
              moisPaiement: [mois],
            });
          });
        } else if (data.modePaiement === "tranches" && fraisCalcules.tranches.length > 0) {
          fraisCalcules.tranches.forEach(tranche => {
            servicePaiements.ajouterPaiement({
              eleveId: newStudent.id,
              montant: tranche.montant,
              typePaiement: "scolarite",
              datePaiement: new Date().toISOString(),
              methodePaiement: 'especes',
              description: `Paiement tranche ${tranche.numero} ${parametres.anneeAcademique}`,
              moisPaiement: [`Tranche ${tranche.numero}`],
            });
          });
        }

        // Créer des paiements pour les options sélectionnées à l'inscription
        Object.entries(fraisCalcules.fraisOptions).forEach(([key, prix]) => {
          if (prix > 0) {
            servicePaiements.ajouterPaiement({
              eleveId: newStudent.id,
              montant: prix,
              typePaiement: 'autre',
              datePaiement: new Date().toISOString(),
              methodePaiement: 'especes',
              description: `Option: ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}`,
              // moisPaiement n'est pas pertinent pour les options
              // On pourrait utiliser un autre champ si nécessaire
            });
          }
        });
        // (Ajouter ici la logique pour les options personnalisées si nécessaire)


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
                          <SelectItem value="tranches">Paiement par tranches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Options de paiement conditionnelles */}
                    {formData.modePaiement === "tranches" && (
                      <div className="space-y-2">
                        <Label htmlFor="nombreTranches">Nombre de tranches</Label>
                        <Select
                          value={String(formData.nombreTranches)}
                          onValueChange={(value) => handleInputChange("nombreTranches", Number(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Nombre de tranches" />
                          </SelectTrigger>
                          <SelectContent>
                            {parametresPaiement.tranchesPaiement.map((tranche) => (
                              <SelectItem key={tranche.nombre} value={String(tranche.nombre)}>
                                {tranche.nombre} tranches
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {formData.modePaiement === "mensuel" && (
                      <div className="space-y-2">
                        <Label>Mois à payer</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {moisDisponibles.map((mois) => (
                            <div key={mois} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                              <input
                                type="checkbox"
                                id={`mois-${mois}`}
                                checked={formData.moisPaiement?.includes(mois)}
                                onChange={(e) => {
                                  const checked = e.target.checked
                                  const currentMois = formData.moisPaiement || []
                                  if (checked) {
                                    handleInputChange("moisPaiement", [...currentMois, mois])
                                  } else {
                                    handleInputChange("moisPaiement", currentMois.filter(m => m !== mois))
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Label htmlFor={`mois-${mois}`} className="text-sm font-medium text-gray-700">
                                {mois}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Options supplémentaires */}
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="text-lg font-medium text-gray-900">Options supplémentaires</h3>
                    <div className="grid grid-cols-2 gap-4">
                      {Object.entries(optionsPrix).map(([key, prix]) => (
                        <div key={key} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md border">
                          <input
                            type="checkbox"
                            id={`option-${key}`}
                            checked={formData.optionsSupplementaires[key as keyof typeof formData.optionsSupplementaires]}
                            onChange={(e) => {
                              handleInputChange("optionsSupplementaires", {
                                ...formData.optionsSupplementaires,
                                [key]: e.target.checked,
                              })
                            }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <Label htmlFor={`option-${key}`} className="text-sm font-medium text-gray-700 flex-1">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                          </Label>
                          <span className="text-sm font-semibold text-gray-800">{prix.toLocaleString()} FCFA</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bouton de soumission */}
                  <div className="pt-6 border-t">
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          {studentId ? "Mettre à jour" : "Enregistrer"}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Résumé des frais */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Résumé des frais</CardTitle>
                <CardDescription>Calcul en temps réel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!formData.classe ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>Sélectionnez une classe pour voir les frais.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Frais d'inscription:</span>
                      <span className="font-medium">
                        {fraisCalcules.fraisInscription.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Scolarité ({formData.modePaiement === 'mensuel' ? `${formData.moisPaiement?.length || 0} mois` : 'tranches'}):</span>
                      <span className="font-medium">
                        {fraisCalcules.fraisScolarite.toLocaleString()} FCFA
                      </span>
                    </div>

                    {Object.values(fraisCalcules.fraisOptions).some(prix => prix > 0) && (
                      <div className="border-t pt-3 mt-2">
                        <div className="text-sm font-medium mb-2">Options:</div>
                        {Object.entries(fraisCalcules.fraisOptions).map(([key, prix]) => {
                          if (prix > 0) {
                            return (
                              <div key={key} className="flex justify-between text-xs text-gray-600">
                                <span>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</span>
                                <span>{prix.toLocaleString()} FCFA</span>
                              </div>
                            )
                          }
                          return null
                        })}
                      </div>
                    )}

                    <div className="flex justify-between border-t-2 border-blue-200 pt-3 mt-3">
                      <span className="text-lg font-bold">Total à payer:</span>
                      <span className="font-bold text-lg text-blue-600">{fraisCalcules.totalAPayer.toLocaleString()} FCFA</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
