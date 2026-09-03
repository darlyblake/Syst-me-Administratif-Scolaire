"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ArrowLeft, Save, Settings, Calendar, DollarSign, RotateCcw, CreditCard, Plus, Trash2, Edit, Check, X, HelpCircle, Copy } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"
import { useEstablishment } from "@/hooks/useEstablishment"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import { serviceParametres } from "@/services/parametres.service"
import type { ParametresEcole, TarificationClasse, OptionsSupplementaires, OptionSupplementaire, TarificationTypeEcole, TarificationNiveau } from "@/services/parametres.service"

interface TranchePaiement {
  numero: number
  nom: string
  dateDebut: string
  dateFin: string
  pourcentage: number
}

interface ParametresPaiement {
  datePaiementMensuel: number
  tranchesPaiement: TranchePaiement[]
}

interface PlanTranche {
  id: string
  label: string
  pourcentage: number
  echeance?: string
}

interface PlanPaiement {
  id: string
  nom: string
  type: "mensuel" | "tranches"
  nombreMensualites?: number
  jourPaiement?: number
  tranches?: PlanTranche[]
}

export default function SettingsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId

  if (!establishmentId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Erreur de chargement</CardTitle>
            <CardDescription>Impossible de déterminer votre établissement.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">Veuillez vous reconnecter ou contacter l'administrateur.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: establishment, error: establishmentError } = useEstablishment(establishmentId)
  const { data: academicYears, activeYear } = useAcademicYears(establishmentId)
  const { data: academicStructure, isLoading: isLoadingStructure } = useAcademicStructure(establishmentId)
  const { data: tuitionPlans, isLoading: isLoadingPlans, refresh: refreshPlans } = useTuitionPlans(activeYear?.id || null)

  const [settings, setSettings] = useState<ParametresEcole>({
    anneeAcademique: "",
    dateDebut: "",
    dateFin: "",
    nomEcole: "",
    adresseEcole: "",
    telephoneEcole: "",
    nomDirecteur: "",
    logoUrl: "",
    cachetUrl: "",
    modePaiement: "les_deux",
  })

  const [pricing, setPricing] = useState<TarificationClasse[]>([])
  const [fraisInscriptionEtablissement, setFraisInscriptionEtablissement] = useState(0)
  const [fraisReinscriptionEtablissement, setFraisReinscriptionEtablissement] = useState(0)
  const [tarificationTypesEcole, setTarificationTypesEcole] = useState<TarificationTypeEcole[]>([])
  const [typesEcoleActifs, setTypesEcoleActifs] = useState<string[]>(["Primaire", "Collège", "Lycée", "Université", "Centre Professionnel"])
  const [optionsSupplementaires, setOptionsSupplementaires] = useState<OptionsSupplementaires>({
    tenueScolaire: 0,
    carteScolaire: 0,
    cooperative: 0,
    tenueEPS: 0,
    assurance: 0,
  })

  // État pour les paramètres de paiement
  const [parametresPaiement, setParametresPaiement] = useState<ParametresPaiement>({
    datePaiementMensuel: 5,
    tranchesPaiement: [],
  })

  const [nouvelleClasse, setNouvelleClasse] = useState("")
  const [fraisInscriptionNouvelle, setFraisInscriptionNouvelle] = useState(0)
  const [fraisScolariteAnnuelleNouvelle, setFraisScolariteAnnuelleNouvelle] = useState(0)

  // État pour les nouveaux niveaux par type d'école
  const [nouveauxNiveaux, setNouveauxNiveaux] = useState<Record<string, { nom: string; fraisScolariteAnnuelle: number }>>({})

  // État pour les options supplémentaires personnalisées
  const [optionsPersonnalisees, setOptionsPersonnalisees] = useState<OptionSupplementaire[]>([])
  const [nouvelleOptionNom, setNouvelleOptionNom] = useState("")
  const [nouvelleOptionPrix, setNouvelleOptionPrix] = useState(0)

  // États pour les erreurs de validation
  const [erreursValidation, setErreursValidation] = useState<Record<string, string>>({})

  // États pour l'édition inline des options personnalisées
  const [optionEnEdition, setOptionEnEdition] = useState<string | null>(null)
  const [optionEditionNom, setOptionEditionNom] = useState("")
  const [optionEditionPrix, setOptionEditionPrix] = useState(0)

  // États pour la gestion des plans de paiement
  const [plansPaiement, setPlansPaiement] = useState<PlanPaiement[]>([])
  const [planDialogOpen, setPlanDialogOpen] = useState(false)
  const [planEnEdition, setPlanEnEdition] = useState<PlanPaiement | null>(null)
  const [nouveauPlan, setNouveauPlan] = useState<Partial<PlanPaiement>>({
    nom: "",
    type: "mensuel",
    nombreMensualites: 10,
    jourPaiement: 5,
    tranches: []
  })

  // État pour détecter les modifications non enregistrées
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialSettings, setInitialSettings] = useState<ParametresEcole | null>(null)
  const [initialFraisInscription, setInitialFraisInscription] = useState(0)
  const [initialFraisReinscription, setInitialFraisReinscription] = useState(0)
  const [initialTarificationTypesEcole, setInitialTarificationTypesEcole] = useState<TarificationTypeEcole[]>([])
  const [initialOptions, setInitialOptions] = useState<OptionsSupplementaires | null>(null)
  const [initialPlansPaiement, setInitialPlansPaiement] = useState<PlanPaiement[]>([])

  // Détecter les modifications non enregistrées
  useEffect(() => {
    if (!initialSettings) return

    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings)
    const fraisInscriptionChanged = fraisInscriptionEtablissement !== initialFraisInscription
    const fraisReinscriptionChanged = fraisReinscriptionEtablissement !== initialFraisReinscription
    const tarificationChanged = JSON.stringify(tarificationTypesEcole) !== JSON.stringify(initialTarificationTypesEcole)
    const optionsChanged = initialOptions && JSON.stringify(optionsSupplementaires) !== JSON.stringify(initialOptions)
    const plansChanged = JSON.stringify(plansPaiement) !== JSON.stringify(initialPlansPaiement)

    const hasChanges = settingsChanged || fraisInscriptionChanged || fraisReinscriptionChanged || tarificationChanged || optionsChanged || plansChanged
    setHasUnsavedChanges(hasChanges)
  }, [settings, fraisInscriptionEtablissement, fraisReinscriptionEtablissement, tarificationTypesEcole, optionsSupplementaires, plansPaiement, initialSettings, initialFraisInscription, initialFraisReinscription, initialTarificationTypesEcole, initialOptions, initialPlansPaiement])

  useEffect(() => {
    try {
      const parametresCharges = serviceParametres.obtenirParametres()
      const tarificationChargee = serviceParametres.obtenirTarification()
      const fraisInscriptionGlobalCharge = serviceParametres.obtenirFraisInscriptionEtablissement()
      const fraisReinscriptionGlobalCharge = serviceParametres.obtenirFraisReinscriptionEtablissement()

      const tarificationTypesEcoleChargee = serviceParametres.obtenirTarificationParTypeEcole()
      const optionsChargees = serviceParametres.obtenirOptionsSupplementaires()

      // S'assurer que tous les champs sont définis
      const loadedSettings = {
        anneeAcademique: parametresCharges.anneeAcademique || activeYear?.name || academicYears[0]?.name || "",
        dateDebut: parametresCharges.dateDebut || activeYear?.start_date || "",
        dateFin: parametresCharges.dateFin || activeYear?.end_date || "",
        nomEcole: parametresCharges.nomEcole || establishment?.name || "",
        adresseEcole: parametresCharges.adresseEcole || "",
        telephoneEcole: parametresCharges.telephoneEcole || "",
        nomDirecteur: parametresCharges.nomDirecteur || "",
        logoUrl: parametresCharges.logoUrl || "",
        cachetUrl: parametresCharges.cachetUrl || "",
        modePaiement: parametresCharges.modePaiement || "les_deux",
      }

      setSettings(loadedSettings)

      setPricing(Array.isArray(tarificationChargee) ? tarificationChargee : [])
      setFraisInscriptionEtablissement(fraisInscriptionGlobalCharge)
      setFraisReinscriptionEtablissement(fraisReinscriptionGlobalCharge)
      setTarificationTypesEcole(Array.isArray(tarificationTypesEcoleChargee) ? tarificationTypesEcoleChargee : [])

      const loadedOptions = {
        tenueScolaire: optionsChargees.tenueScolaire || 0,
        carteScolaire: optionsChargees.carteScolaire || 0,
        cooperative: optionsChargees.cooperative || 0,
        tenueEPS: optionsChargees.tenueEPS || 0,
        assurance: optionsChargees.assurance || 0,
      }
      setOptionsSupplementaires(loadedOptions)

      // Charger les paramètres de paiement depuis le service
      const paiementCharges = serviceParametres.obtenirParametresPaiement()
      setParametresPaiement(paiementCharges)

      // Charger les options supplémentaires personnalisées
      const optionsPersonnaliseesChargees = serviceParametres.obtenirOptionsSupplementairesPersonnalisees()
      setOptionsPersonnalisees(optionsPersonnaliseesChargees)

      // Sauvegarder l'état initial pour détecter les modifications
      setInitialSettings(loadedSettings)
      setInitialFraisInscription(fraisInscriptionGlobalCharge)
      setInitialFraisReinscription(fraisReinscriptionGlobalCharge)
      setInitialTarificationTypesEcole(Array.isArray(tarificationTypesEcoleChargee) ? tarificationTypesEcoleChargee : [])
      setInitialOptions(loadedOptions)
      setInitialPlansPaiement([])
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error)
      // Garder les valeurs par défaut en cas d'erreur
    }
  }, [academicYears, activeYear, establishment])

  // Fonctions de validation
  const validerPrix = (prix: number, champ: string) => {
    if (prix < 0) {
      setErreursValidation(prev => ({ ...prev, [champ]: "Le prix ne peut pas être négatif" }))
      return false
    }
    setErreursValidation(prev => ({ ...prev, [champ]: "" }))
    return true
  }

  const validerPourcentage = (pourcentage: number, champ: string) => {
    if (pourcentage < 0 || pourcentage > 100) {
      setErreursValidation(prev => ({ ...prev, [champ]: "Le pourcentage doit être entre 0 et 100" }))
      return false
    }
    setErreursValidation(prev => ({ ...prev, [champ]: "" }))
    return true
  }

  const calculerTotalPourcentages = () => {
    return parametresPaiement.tranchesPaiement.reduce((sum, tranche) => sum + tranche.pourcentage, 0)
  }

  const handleSettingsChange = (field: keyof ParametresEcole, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErreursValidation(prev => ({ ...prev, logo: "Le fichier sélectionné doit être une image (PNG, JPG, JPEG ou WEBP)." }))
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setErreursValidation(prev => ({ ...prev, logo: "L'image ne doit pas dépasser 5 Mo." }))
      return
    }

    setErreursValidation(prev => ({ ...prev, logo: "" }))

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setSettings((prev) => ({ ...prev, logoUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handleCachetUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      setErreursValidation(prev => ({ ...prev, cachet: "Le fichier sélectionné doit être une image (PNG, JPG, JPEG ou WEBP)." }))
      return
    }

    const maxSize = 5 * 1024 * 1024
    if (file.size > maxSize) {
      setErreursValidation(prev => ({ ...prev, cachet: "L'image ne doit pas dépasser 5 Mo." }))
      return
    }

    setErreursValidation(prev => ({ ...prev, cachet: "" }))

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      setSettings((prev) => ({ ...prev, cachetUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  const handlePricingChange = (classe: string, field: "fraisInscription" | "fraisScolariteAnnuelle", value: number) => {
    if (validerPrix(value, `pricing-${classe}-${field}`)) {
      setPricing((prev) => prev.map((p) => (p.classe === classe ? { ...p, [field]: value } : p)))
    }
  }

  const handleTarificationTypeEcoleChange = (typeEcole: string, niveau: string, field: "fraisScolariteAnnuelle" | "planPaiementId", value: number | string) => {
    setTarificationTypesEcole(tarificationTypesEcole.map((type) => {
      if (type.typeEcole === typeEcole) {
        return {
          ...type,
          niveaux: type.niveaux.map((n) => {
            if (n.niveau === niveau) {
              return { ...n, [field]: value }
            }
            return n
          })
        }
      }
      return type
    }))
  }

  const handleTypeEcoleToggle = (typeEcole: string) => {
    setTypesEcoleActifs(prev => 
      prev.includes(typeEcole) 
        ? prev.filter(t => t !== typeEcole)
        : [...prev, typeEcole]
    )
  }

  const ajouterNiveau = (typeEcole: string) => {
    const nouveauNiveau = nouveauxNiveaux[typeEcole]
    if (!nouveauNiveau?.nom || nouveauNiveau.fraisScolariteAnnuelle <= 0) return

    setTarificationTypesEcole(tarificationTypesEcole.map((type) => {
      if (type.typeEcole === typeEcole) {
        return {
          ...type,
          niveaux: [
            ...type.niveaux,
            {
              niveau: nouveauNiveau.nom,
              fraisInscription: fraisInscriptionEtablissement,
              fraisScolariteAnnuelle: nouveauNiveau.fraisScolariteAnnuelle
            }
          ]
        }
      }
      return type
    }))

    setNouveauxNiveaux(prev => ({
      ...prev,
      [typeEcole]: { nom: "", fraisScolariteAnnuelle: 0 }
    }))
  }

  const supprimerNiveau = (typeEcole: string, niveau: string) => {
    setTarificationTypesEcole(tarificationTypesEcole.map((type) => {
      if (type.typeEcole === typeEcole) {
        return {
          ...type,
          niveaux: type.niveaux.filter((n) => n.niveau !== niveau)
        }
      }
      return type
    }))
  }

  const handleOptionsChange = (option: keyof OptionsSupplementaires, value: number) => {
    if (validerPrix(value, `options-${option}`)) {
      setOptionsSupplementaires((prev) => ({ ...prev, [option]: value }))
    }
  }

  const handleTrancheChange = (index: number, field: keyof TranchePaiement, value: string | number) => {
    if (field === 'pourcentage' && typeof value === 'number') {
      if (!validerPourcentage(value, `tranche-${index}-pourcentage`)) {
        return
      }
    }

    setParametresPaiement((prev) => ({
      ...prev,
      tranchesPaiement: prev.tranchesPaiement.map((tranche, i) =>
        i === index ? { ...tranche, [field]: value } : tranche
      )
    }))
  }

  const ajouterTranchePaiement = () => {
    const nouveauNumero = parametresPaiement.tranchesPaiement.length + 1
    const nouvelleTranche: TranchePaiement = {
      numero: nouveauNumero,
      nom: `${nouveauNumero}ème tranche`,
      dateDebut: "",
      dateFin: "",
      pourcentage: 0
    }
    setParametresPaiement((prev) => ({
      ...prev,
      tranchesPaiement: [...prev.tranchesPaiement, nouvelleTranche]
    }))
  }

  const supprimerTranchePaiement = (index: number) => {
    setParametresPaiement((prev) => ({
      ...prev,
      tranchesPaiement: prev.tranchesPaiement.filter((_, i) => i !== index)
    }))
  }

  const ajouterClasse = () => {
    if (nouvelleClasse.trim() && fraisScolariteAnnuelleNouvelle > 0) {
      const nouvelleClasseObj: TarificationClasse = {
        classe: nouvelleClasse.trim(),
        fraisInscription: fraisInscriptionEtablissement,
        fraisScolariteAnnuelle: fraisScolariteAnnuelleNouvelle,
      }
      setPricing((prev) => [...prev, nouvelleClasseObj])
      setNouvelleClasse("")
      setFraisScolariteAnnuelleNouvelle(0)
    }
  }

  const supprimerClasse = (classe: string) => {
    setPricing((prev) => prev.filter((p) => p.classe !== classe))
  }

  const ajouterOptionPersonnalisee = () => {
    if (nouvelleOptionNom.trim() && nouvelleOptionPrix > 0) {
      try {
        const nouvelleOption = serviceParametres.ajouterOptionSupplementaire(nouvelleOptionNom, nouvelleOptionPrix)
        setOptionsPersonnalisees((prev) => [...prev, nouvelleOption])
        setNouvelleOptionNom("")
        setNouvelleOptionPrix(0)
      } catch (error) {
        alert("Erreur lors de l'ajout de l'option: " + (error as Error).message)
      }
    }
  }

  const supprimerOptionPersonnalisee = (id: string) => {
    try {
      serviceParametres.supprimerOptionSupplementaire(id)
      setOptionsPersonnalisees((prev) => prev.filter((option) => option.id !== id))
    } catch (error) {
      alert("Erreur lors de la suppression de l'option: " + (error as Error).message)
    }
  }

  const mettreAJourOptionPersonnalisee = (id: string, nom: string, prix: number) => {
    try {
      serviceParametres.mettreAJourOptionSupplementaire(id, nom, prix)
      setOptionsPersonnalisees((prev) =>
        prev.map((option) =>
          option.id === id ? { ...option, nom: nom.trim(), prix } : option
        )
      )
    } catch (error) {
      alert("Erreur lors de la mise à jour de l'option: " + (error as Error).message)
    }
  }

  const commencerEditionOption = (option: OptionSupplementaire) => {
    setOptionEnEdition(option.id)
    setOptionEditionNom(option.nom)
    setOptionEditionPrix(option.prix)
  }

  const annulerEditionOption = () => {
    setOptionEnEdition(null)
    setOptionEditionNom("")
    setOptionEditionPrix(0)
  }

  const sauvegarderEditionOption = () => {
    if (optionEnEdition && optionEditionNom.trim() && optionEditionPrix >= 0) {
      mettreAJourOptionPersonnalisee(optionEnEdition, optionEditionNom, optionEditionPrix)
      setOptionEnEdition(null)
      setOptionEditionNom("")
      setOptionEditionPrix(0)
    }
  }

  // Fonctions pour la gestion des plans de paiement
  const calculerTotalTranches = (tranches: PlanTranche[]) => {
    return tranches.reduce((sum, t) => sum + t.pourcentage, 0)
  }

  const ajouterTranche = () => {
    if (!nouveauPlan.tranches) return
    const nouvelleTranche: PlanTranche = {
      id: `tranche-${Date.now()}`,
      label: `Tranche ${nouveauPlan.tranches.length + 1}`,
      pourcentage: 0,
      echeance: ""
    }
    setNouveauPlan(prev => ({
      ...prev,
      tranches: [...(prev.tranches || []), nouvelleTranche]
    }))
  }

  const modifierTranche = (id: string, field: keyof PlanTranche, value: string | number) => {
    setNouveauPlan(prev => ({
      ...prev,
      tranches: prev.tranches?.map(t => t.id === id ? { ...t, [field]: value } : t) || []
    }))
  }

  const supprimerTranche = (id: string) => {
    setNouveauPlan(prev => ({
      ...prev,
      tranches: prev.tranches?.filter(t => t.id !== id) || []
    }))
  }

  const dupliquerPlan = (plan: PlanPaiement) => {
    const planDuplique: PlanPaiement = {
      ...plan,
      id: `plan-${Date.now()}`,
      nom: `${plan.nom} (copie)`
    }
    setPlansPaiement(prev => [...prev, planDuplique])
  }

  const supprimerPlan = (id: string) => {
    setPlansPaiement(prev => prev.filter(p => p.id !== id))
  }

  const ouvrirDialogPlan = (plan?: PlanPaiement) => {
    if (plan) {
      setPlanEnEdition(plan)
      setNouveauPlan({ ...plan })
    } else {
      setPlanEnEdition(null)
      setNouveauPlan({
        nom: "",
        type: "mensuel",
        nombreMensualites: 10,
        jourPaiement: 5,
        tranches: []
      })
    }
    setPlanDialogOpen(true)
  }

  const fermerDialogPlan = () => {
    setPlanDialogOpen(false)
    setPlanEnEdition(null)
    setNouveauPlan({
      nom: "",
      type: "mensuel",
      nombreMensualites: 10,
      jourPaiement: 5,
      tranches: []
    })
  }

  const sauvegarderPlan = () => {
    if (!nouveauPlan.nom.trim()) {
      setErreursValidation(prev => ({ ...prev, planNom: "Le nom du plan est requis" }))
      return
    }

    if (nouveauPlan.type === "tranches" && nouveauPlan.tranches) {
      const total = calculerTotalTranches(nouveauPlan.tranches)
      if (total !== 100) {
        setErreursValidation(prev => ({ ...prev, planTranches: `Le total doit être 100% (actuel: ${total}%)` }))
        return
      }
    }

    setErreursValidation(prev => ({ ...prev, planNom: "", planTranches: "" }))

    const planFinal: PlanPaiement = {
      id: planEnEdition?.id || `plan-${Date.now()}`,
      nom: nouveauPlan.nom.trim(),
      type: nouveauPlan.type,
      nombreMensualites: nouveauPlan.nombreMensualites,
      jourPaiement: nouveauPlan.jourPaiement,
      tranches: nouveauPlan.tranches
    }

    if (planEnEdition) {
      setPlansPaiement(prev => prev.map(p => p.id === planEnEdition.id ? planFinal : p))
    } else {
      setPlansPaiement(prev => [...prev, planFinal])
    }

    fermerDialogPlan()
  }

  const saveSettings = () => {
    try {
      serviceParametres.sauvegarderParametres(settings)
      serviceParametres.sauvegarderFraisInscriptionEtablissement(fraisInscriptionEtablissement)
      serviceParametres.sauvegarderFraisReinscriptionEtablissement(fraisReinscriptionEtablissement)
      serviceParametres.sauvegarderTarification(pricing)
      serviceParametres.sauvegarderTarificationParTypeEcole(tarificationTypesEcole)
      serviceParametres.sauvegarderOptionsSupplementaires(optionsSupplementaires)

      // Sauvegarder les paramètres de paiement via le service
      serviceParametres.sauvegarderParametresPaiement(parametresPaiement)

      // Sauvegarder les options personnalisées
      serviceParametres.sauvegarderOptionsSupplementairesPersonnalisees(optionsPersonnalisees)

      // Mettre à jour l'état initial après sauvegarde
      setInitialSettings(settings)
      setInitialFraisInscription(fraisInscriptionEtablissement)
      setInitialFraisReinscription(fraisReinscriptionEtablissement)
      setInitialTarificationTypesEcole(tarificationTypesEcole)
      setInitialOptions(optionsSupplementaires)
      setInitialPlansPaiement(plansPaiement)
      setHasUnsavedChanges(false)

      alert("Paramètres sauvegardés avec succès !")
    } catch (error) {
      alert("Erreur lors de la sauvegarde: " + (error as Error).message)
    }
  }

  const resetSettings = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser tous les paramètres aux valeurs par défaut ?")) {
      try {
        serviceParametres.reinitialiserParametres()
        const parametresDefaut = serviceParametres.obtenirParametres()
        const tarificationDefaut = serviceParametres.obtenirTarification()
        setSettings(parametresDefaut)
        setPricing(tarificationDefaut)

        // Réinitialiser les paramètres de paiement via le service
        const paiementDefaut = serviceParametres.obtenirParametresPaiement()
        setParametresPaiement(paiementDefaut)

        // Réinitialiser l'état initial
        setInitialSettings(parametresDefaut)
        setInitialFraisInscription(0)
        setInitialFraisReinscription(0)
        setInitialTarificationTypesEcole([])
        setInitialOptions({
          tenueScolaire: 0,
          carteScolaire: 0,
          cooperative: 0,
          tenueEPS: 0,
          assurance: 0,
        })
        setInitialPlansPaiement([])
        setHasUnsavedChanges(false)

        alert("Paramètres réinitialisés avec succès !")
      } catch (error) {
        alert("Erreur lors de la réinitialisation: " + (error as Error).message)
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Settings className="h-6 w-6" />
                Paramètres du Système
              </h1>
              <p className="text-gray-600">Configuration de l'établissement et des tarifs</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetSettings}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={saveSettings} disabled={!hasUnsavedChanges}>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder
            </Button>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Vous avez des modifications non enregistrées. N'oubliez pas de sauvegarder avant de quitter.
          </div>
        )}

        {establishmentError ? (
          <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Les paramètres d'établissement ne sont pas disponibles en temps réel, mais la configuration locale reste intacte.
          </div>
        ) : null}

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:grid-cols-6 overflow-x-auto">
            <TabsTrigger value="general" className="whitespace-nowrap">Général</TabsTrigger>
            <TabsTrigger value="academic" className="whitespace-nowrap">Année académique</TabsTrigger>
            <TabsTrigger value="payments" className="whitespace-nowrap">Paiements</TabsTrigger>
            <TabsTrigger value="pricing" className="whitespace-nowrap">Tarification</TabsTrigger>
            <TabsTrigger value="options" className="whitespace-nowrap">Options</TabsTrigger>
            <TabsTrigger value="appearance" className="whitespace-nowrap">Apparence</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Informations de l'établissement</CardTitle>
                <CardDescription>Paramètres généraux de l'école</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomEcole" className="flex items-center gap-1">
                      Nom de l'établissement <span className="text-red-500">*</span>
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </Label>
                    <Input
                      id="nomEcole"
                      value={settings.nomEcole}
                      onChange={(e) => handleSettingsChange("nomEcole", e.target.value)}
                      className={settings.nomEcole ? "" : "border-red-300"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomDirecteur" className="flex items-center gap-1">
                      Nom du directeur <span className="text-red-500">*</span>
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </Label>
                    <Input
                      id="nomDirecteur"
                      value={settings.nomDirecteur}
                      onChange={(e) => handleSettingsChange("nomDirecteur", e.target.value)}
                      className={settings.nomDirecteur ? "" : "border-red-300"}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresseEcole" className="flex items-center gap-1">
                    Adresse complète <span className="text-red-500">*</span>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Input
                    id="adresseEcole"
                    value={settings.adresseEcole}
                    onChange={(e) => handleSettingsChange("adresseEcole", e.target.value)}
                    className={settings.adresseEcole ? "" : "border-red-300"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephoneEcole" className="flex items-center gap-1">
                    Téléphone
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Input
                    id="telephoneEcole"
                    value={settings.telephoneEcole}
                    onChange={(e) => handleSettingsChange("telephoneEcole", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modePaiement" className="flex items-center gap-1">
                    Mode de paiement autorisé <span className="text-red-500">*</span>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Select
                    value={settings.modePaiement}
                    onValueChange={(value) => handleSettingsChange("modePaiement", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensuel">Mensuel uniquement</SelectItem>
                      <SelectItem value="trimestriel">Par trimestre uniquement</SelectItem>
                      <SelectItem value="les_deux">Mensuel et trimestriel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="border-t pt-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">Identité visuelle de l'établissement</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Le logo et le cachet seront utilisés sur les documents officiels (bulletins, certificats, attestations).
                  </p>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <Label className="font-medium">Logo officiel</Label>
                      <div className="space-y-2">
                        {settings.logoUrl && (
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                            <img
                              src={settings.logoUrl}
                              alt="Logo officiel de l'établissement"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleLogoUpload}
                            className="flex-1"
                          />
                          {settings.logoUrl && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSettings(prev => ({ ...prev, logoUrl: "" }))}
                              aria-label="Supprimer le logo"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {erreursValidation.logo && (
                          <p className="text-xs text-red-500">{erreursValidation.logo}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="font-medium">Cachet officiel</Label>
                      <div className="space-y-2">
                        {settings.cachetUrl && (
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                            <img
                              src={settings.cachetUrl}
                              alt="Cachet officiel de l'établissement"
                              className="w-full h-full object-contain"
                            />
                          </div>
                        )}
                        <div className="flex gap-2">
                          <Input
                            type="file"
                            accept="image/png,image/jpeg,image/jpg,image/webp"
                            onChange={handleCachetUpload}
                            className="flex-1"
                          />
                          {settings.cachetUrl && (
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setSettings(prev => ({ ...prev, cachetUrl: "" }))}
                              aria-label="Supprimer le cachet"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {erreursValidation.cachet && (
                          <p className="text-xs text-red-500">{erreursValidation.cachet}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Année académique
                </CardTitle>
                <CardDescription>Configuration de l'année scolaire</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="anneeAcademique" className="flex items-center gap-1">
                    Année académique <span className="text-red-500">*</span>
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Input
                    id="anneeAcademique"
                    value={settings.anneeAcademique}
                    onChange={(e) => handleSettingsChange("anneeAcademique", e.target.value)}
                    placeholder="2024-2025"
                    className={settings.anneeAcademique ? "" : "border-red-300"}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dateDebut" className="flex items-center gap-1">
                      Date de début <span className="text-red-500">*</span>
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </Label>
                    <Input
                      id="dateDebut"
                      type="date"
                      value={settings.dateDebut}
                      onChange={(e) => handleSettingsChange("dateDebut", e.target.value)}
                      className={settings.dateDebut ? "" : "border-red-300"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateFin" className="flex items-center gap-1">
                      Date de fin <span className="text-red-500">*</span>
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </Label>
                    <Input
                      id="dateFin"
                      type="date"
                      value={settings.dateFin}
                      onChange={(e) => handleSettingsChange("dateFin", e.target.value)}
                      className={settings.dateFin ? "" : "border-red-300"}
                    />
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Informations calculées</h3>
                  <div className="text-sm text-blue-700 space-y-1">
                    <div>
                      Durée de l'année:{" "}
                      {settings.dateDebut && settings.dateFin ? Math.ceil(
                        (new Date(settings.dateFin).getTime() - new Date(settings.dateDebut).getTime()) /
                          (1000 * 60 * 60 * 24),
                      ) : 0}{" "}
                      jours
                    </div>
                    <div>
                      Nombre de mois:{" "}
                      {settings.dateDebut && settings.dateFin ? Math.ceil(
                        (new Date(settings.dateFin).getTime() - new Date(settings.dateDebut).getTime()) /
                          (1000 * 60 * 60 * 24 * 30),
                      ) : 0}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Plans de paiement
                    </CardTitle>
                    <CardDescription>Créez et gérez les plans de paiement pour les niveaux scolaires</CardDescription>
                  </div>
                  <Dialog open={planDialogOpen} onOpenChange={setPlanDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={() => ouvrirDialogPlan()}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nouveau plan
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>{planEnEdition ? "Modifier le plan" : "Créer un nouveau plan"}</DialogTitle>
                        <DialogDescription>
                          Configurez les modalités de paiement pour ce plan.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="planNom">Nom du plan <span className="text-red-500">*</span></Label>
                          <Input
                            id="planNom"
                            value={nouveauPlan.nom}
                            onChange={(e) => setNouveauPlan(prev => ({ ...prev, nom: e.target.value }))}
                            placeholder="Ex: Plan mensuel standard"
                          />
                          {erreursValidation.planNom && (
                            <p className="text-xs text-red-500">{erreursValidation.planNom}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="planType">Type de paiement</Label>
                          <Select
                            value={nouveauPlan.type}
                            onValueChange={(value: "mensuel" | "tranches") => setNouveauPlan(prev => ({ ...prev, type: value }))}
                          >
                            <SelectTrigger id="planType">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mensuel">Paiement mensuel</SelectItem>
                              <SelectItem value="tranches">Par tranches personnalisées</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {nouveauPlan.type === "mensuel" && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="nombreMensualites">Nombre de mensualités</Label>
                              <Input
                                id="nombreMensualites"
                                type="number"
                                min="1"
                                max="12"
                                value={nouveauPlan.nombreMensualites}
                                onChange={(e) => setNouveauPlan(prev => ({ ...prev, nombreMensualites: parseInt(e.target.value) || 10 }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="jourPaiement">Jour de paiement mensuel</Label>
                              <Select
                                value={nouveauPlan.jourPaiement?.toString()}
                                onValueChange={(value) => setNouveauPlan(prev => ({ ...prev, jourPaiement: parseInt(value) }))}
                              >
                                <SelectTrigger id="jourPaiement">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                                    <SelectItem key={day} value={day.toString()}>
                                      Le {day} de chaque mois
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        )}

                        {nouveauPlan.type === "tranches" && (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label>Tranches de paiement</Label>
                              <Button type="button" variant="outline" size="sm" onClick={ajouterTranche}>
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter une tranche
                              </Button>
                            </div>
                            {nouveauPlan.tranches && nouveauPlan.tranches.length > 0 ? (
                              <div className="space-y-3">
                                {nouveauPlan.tranches.map((tranche, index) => (
                                  <div key={tranche.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                                    <div className="col-span-1 text-center font-medium text-gray-500">
                                      {index + 1}
                                    </div>
                                    <div className="col-span-4 space-y-1">
                                      <Label className="text-xs">Libellé</Label>
                                      <Input
                                        value={tranche.label}
                                        onChange={(e) => modifierTranche(tranche.id, "label", e.target.value)}
                                        placeholder="Ex: Première tranche"
                                      />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                      <Label className="text-xs">Pourcentage (%)</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={tranche.pourcentage}
                                        onChange={(e) => modifierTranche(tranche.id, "pourcentage", parseInt(e.target.value) || 0)}
                                      />
                                    </div>
                                    <div className="col-span-3 space-y-1">
                                      <Label className="text-xs">Échéance</Label>
                                      <Input
                                        type="date"
                                        value={tranche.echeance}
                                        onChange={(e) => modifierTranche(tranche.id, "echeance", e.target.value)}
                                      />
                                    </div>
                                    <div className="col-span-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => supprimerTranche(tranche.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium">Total configuré:</span>
                                  <span className={calculerTotalTranches(nouveauPlan.tranches || []) === 100 ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                                    {calculerTotalTranches(nouveauPlan.tranches || [])}%
                                  </span>
                                </div>
                                {erreursValidation.planTranches && (
                                  <p className="text-xs text-red-500">{erreursValidation.planTranches}</p>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 text-center py-4">
                                Aucune tranche configurée. Cliquez sur "Ajouter une tranche" pour commencer.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={fermerDialogPlan}>
                          Annuler
                        </Button>
                        <Button onClick={sauvegarderPlan}>
                          {planEnEdition ? "Modifier" : "Créer"} le plan
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {plansPaiement.length === 0 ? (
                  <div className="text-center py-12">
                    <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun plan de paiement</h3>
                    <p className="text-gray-500 mb-4">Créez votre premier plan de paiement pour commencer.</p>
                    <Button onClick={() => ouvrirDialogPlan()}>
                      <Plus className="h-4 w-4 mr-2" />
                      Créer un plan
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plansPaiement.map((plan) => (
                      <div key={plan.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{plan.nom}</h4>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              plan.type === "mensuel" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"
                            }`}>
                              {plan.type === "mensuel" ? "Mensuel" : "Tranches"}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {plan.type === "mensuel" 
                              ? `${plan.nombreMensualites} mensualités, le ${plan.jourPaiement} de chaque mois`
                              : `${plan.tranches?.length || 0} tranches personnalisées`
                            }
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => dupliquerPlan(plan)}
                            title="Dupliquer"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => ouvrirDialogPlan(plan)}
                            title="Modifier"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => supprimerPlan(plan.id)}
                            title="Supprimer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Tarification
                </CardTitle>
                <CardDescription>Définissez les frais d'inscription et de réinscription pour l'établissement, et la scolarité par niveau</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Tarification globale de l'établissement */}
                  <div className="border rounded-lg p-4 bg-blue-50">
                    <h3 className="text-lg font-medium mb-4">Tarification générale de l'établissement</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <Label>Frais d'inscription (FCFA)</Label>
                        <Input
                          type="number"
                          value={fraisInscriptionEtablissement}
                          onChange={(e) => setFraisInscriptionEtablissement(Number(e.target.value))}
                          min="0"
                        />
                      </div>
                      <div>
                        <Label>Frais de réinscription (FCFA)</Label>
                        <Input
                          type="number"
                          value={fraisReinscriptionEtablissement}
                          onChange={(e) => setFraisReinscriptionEtablissement(Number(e.target.value))}
                          min="0"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Structure académique et tarification par niveau */}
                  {isLoadingStructure ? (
                    <div className="text-center py-8 text-gray-500">
                      Chargement de la structure académique...
                    </div>
                  ) : academicStructure && academicStructure.length > 0 ? (
                    academicStructure.map((cycle) => (
                      <div key={cycle.id} className="border rounded-lg p-4">
                        <h3 className="text-lg font-medium mb-4">{cycle.name}</h3>
                        <div className="space-y-3">
                          {cycle.grade_levels.map((level) => (
                            <div key={level.id} className="grid md:grid-cols-3 gap-4 p-3 border rounded-lg items-end bg-gray-50">
                              <div className="flex items-center">
                                <Label className="font-medium">{level.name}</Label>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Frais de scolarité annuelle (FCFA)</Label>
                                <Input
                                  type="number"
                                  value={tarificationTypesEcole
                                    .find(t => t.typeEcole === cycle.name)
                                    ?.niveaux.find(n => n.niveau === level.name)
                                    ?.fraisScolariteAnnuelle || ""
                                  }
                                  onChange={(e) =>
                                    handleTarificationTypeEcoleChange(
                                      cycle.name,
                                      level.name,
                                      "fraisScolariteAnnuelle",
                                      Number.parseInt(e.target.value) || 0,
                                    )
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm">Plan de paiement</Label>
                                <Select
                                  value={tarificationTypesEcole
                                    .find(t => t.typeEcole === cycle.name)
                                    ?.niveaux.find(n => n.niveau === level.name)
                                    ?.planPaiementId || ""}
                                  onValueChange={(value) =>
                                    handleTarificationTypeEcoleChange(
                                      cycle.name,
                                      level.name,
                                      "planPaiementId",
                                      value,
                                    )
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sélectionner un plan" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">Aucun plan</SelectItem>
                                    {plansPaiement.map((plan) => (
                                      <SelectItem key={plan.id} value={plan.id}>
                                        {plan.nom} ({plan.type === "mensuel" ? "Mensuel" : "Tranches"})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500 border rounded-lg p-4">
                      <p>Aucune structure académique configurée.</p>
                      <p className="text-sm mt-2">Veuillez configurer les cycles et niveaux dans la section Structure scolaire.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="options">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Options supplémentaires
                </CardTitle>
                <CardDescription>Définir les prix des options supplémentaires pour les élèves</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Options standards */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Options standards</h3>
                    <div className="grid md:grid-cols-2 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          Tenue scolaire <span className="text-red-500">*</span>
                          <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </Label>
                        <Input
                          type="number"
                          value={optionsSupplementaires.tenueScolaire === 0 ? "" : optionsSupplementaires.tenueScolaire}
                          onChange={(e) => handleOptionsChange("tenueScolaire", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={erreursValidation["options-tenueScolaire"] ? "border-red-500" : ""}
                        />
                        {erreursValidation["options-tenueScolaire"] && (
                          <p className="text-xs text-red-500 mt-1">{erreursValidation["options-tenueScolaire"]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          Carte scolaire <span className="text-red-500">*</span>
                          <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </Label>
                        <Input
                          type="number"
                          value={optionsSupplementaires.carteScolaire === 0 ? "" : optionsSupplementaires.carteScolaire}
                          onChange={(e) => handleOptionsChange("carteScolaire", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={erreursValidation["options-carteScolaire"] ? "border-red-500" : ""}
                        />
                        {erreursValidation["options-carteScolaire"] && (
                          <p className="text-xs text-red-500 mt-1">{erreursValidation["options-carteScolaire"]}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          Coopérative <span className="text-red-500">*</span>
                          <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </Label>
                        <Input
                          type="number"
                          value={optionsSupplementaires.cooperative === 0 ? "" : optionsSupplementaires.cooperative}
                          onChange={(e) => handleOptionsChange("cooperative", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={erreursValidation["options-cooperative"] ? "border-red-500" : ""}
                        />
                        {erreursValidation["options-cooperative"] && (
                          <p className="text-xs text-red-500 mt-1">{erreursValidation["options-cooperative"]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          Tenue EPS <span className="text-red-500">*</span>
                          <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </Label>
                        <Input
                          type="number"
                          value={optionsSupplementaires.tenueEPS === 0 ? "" : optionsSupplementaires.tenueEPS}
                          onChange={(e) => handleOptionsChange("tenueEPS", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={erreursValidation["options-tenueEPS"] ? "border-red-500" : ""}
                        />
                        {erreursValidation["options-tenueEPS"] && (
                          <p className="text-xs text-red-500 mt-1">{erreursValidation["options-tenueEPS"]}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-1">
                          Assurance <span className="text-red-500">*</span>
                          <HelpCircle className="h-3 w-3 text-gray-400 ml-1" />
                        </Label>
                        <Input
                          type="number"
                          value={optionsSupplementaires.assurance === 0 ? "" : optionsSupplementaires.assurance}
                          onChange={(e) => handleOptionsChange("assurance", parseInt(e.target.value) || 0)}
                          placeholder="0"
                          className={erreursValidation["options-assurance"] ? "border-red-500" : ""}
                        />
                        {erreursValidation["options-assurance"] && (
                          <p className="text-xs text-red-500 mt-1">{erreursValidation["options-assurance"]}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Options personnalisées */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">Options personnalisées</h3>
                      <Button onClick={ajouterOptionPersonnalisee} size="sm" disabled={!nouvelleOptionNom.trim() || nouvelleOptionPrix <= 0}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter une option
                      </Button>
                    </div>

                    {/* Formulaire d'ajout */}
                    <div className="grid md:grid-cols-3 gap-4 p-4 border rounded-lg items-end animate-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Nom de l'option <span className="text-red-500">*</span></Label>
                        <Input
                          value={nouvelleOptionNom}
                          onChange={(e) => setNouvelleOptionNom(e.target.value)}
                          placeholder="Ex: Transport scolaire"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Prix (FCFA) <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={nouvelleOptionPrix === 0 ? "" : nouvelleOptionPrix}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0
                            setNouvelleOptionPrix(value)
                            validerPrix(value, "nouvelle-option-prix")
                          }}
                          placeholder="0"
                          className={erreursValidation["nouvelle-option-prix"] ? "border-red-500" : ""}
                        />
                        {erreursValidation["nouvelle-option-prix"] && (
                          <p className="text-xs text-red-500 mt-1">{erreursValidation["nouvelle-option-prix"]}</p>
                        )}
                      </div>
                      <div className="space-y-2 pt-6">
                        <Button
                          onClick={ajouterOptionPersonnalisee}
                          disabled={!nouvelleOptionNom.trim() || nouvelleOptionPrix <= 0}
                          className="w-full"
                        >
                          Ajouter
                        </Button>
                      </div>
                    </div>

                    {/* Liste des options personnalisées */}
                    <div className="space-y-4">
                      {optionsPersonnalisees.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">Aucune option personnalisée ajoutée.</p>
                      ) : (
                        optionsPersonnalisees.map((option) => (
                          <div key={option.id} className="grid md:grid-cols-4 gap-4 p-4 border rounded-lg items-center animate-in slide-in-from-bottom-2 duration-300">
                            {optionEnEdition === option.id ? (
                              <>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Nom</Label>
                                  <Input
                                    value={optionEditionNom}
                                    onChange={(e) => setOptionEditionNom(e.target.value)}
                                    className={optionEditionNom.trim() ? "" : "border-red-300"}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-sm font-medium">Prix (FCFA)</Label>
                                  <Input
                                    type="number"
                                    value={optionEditionPrix === 0 ? "" : optionEditionPrix}
                                    onChange={(e) => {
                                      const value = parseInt(e.target.value) || 0
                                      setOptionEditionPrix(value)
                                      validerPrix(value, `option-${option.id}-prix`)
                                    }}
                                    className={erreursValidation[`option-${option.id}-prix`] ? "border-red-500" : ""}
                                  />
                                  {erreursValidation[`option-${option.id}-prix`] && (
                                    <p className="text-xs text-red-500 mt-1">{erreursValidation[`option-${option.id}-prix`]}</p>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={sauvegarderEditionOption}
                                    disabled={!optionEditionNom.trim() || optionEditionPrix < 0}
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Sauvegarder
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={annulerEditionOption}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Annuler
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="col-span-1 md:col-span-2">
                                  <Label className="font-medium">{option.nom}</Label>
                                </div>
                                <div className="col-span-1">
                                  <span className="text-sm font-medium">{option.prix.toLocaleString()} FCFA</span>
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => commencerEditionOption(option)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" />
                                    Éditer
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => supprimerOptionPersonnalisee(option.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Supprimer
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <h3 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Informations sur les options supplémentaires
                    </h3>
                    <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                      <li>Ces options sont facultatives et peuvent être sélectionnées lors de l'inscription de l'élève</li>
                      <li>Les prix s'ajoutent aux frais d'inscription et de scolarité de base</li>
                      <li>Les options standards sont prédéfinies, les personnalisées peuvent être ajoutées et modifiées</li>
                      <li>Toutes les modifications sont sauvegardées automatiquement lors de la sauvegarde générale</li>
                      <li>Les champs obligatoires sont marqués par un astérisque (*)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>Apparence</CardTitle>
                <CardDescription>Personnaliser l'apparence de l'application</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Couleur principale</Label>
                    <Input id="primaryColor" type="color" defaultValue="#3b82f6" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryColor">Couleur secondaire</Label>
                    <Input id="secondaryColor" type="color" defaultValue="#10b981" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoFile">Logo de l'école</Label>
                    <Input id="logoFile" type="file" accept="image/*" onChange={handleLogoUpload} />
                    {settings.logoUrl && (
                      <div className="mt-2">
                        <img
                          src={settings.logoUrl}
                          alt="Aperçu du logo"
                          className="w-16 h-16 border-2 border-gray-200 rounded-full object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="theme">Thème par défaut</Label>
                    <Select defaultValue="light">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Clair</SelectItem>
                        <SelectItem value="dark">Sombre</SelectItem>
                        <SelectItem value="system">Système</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Aperçu</h3>
                  <p className="text-sm text-blue-700">Les changements d'apparence seront appliqués après sauvegarde et redémarrage de l'application.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
