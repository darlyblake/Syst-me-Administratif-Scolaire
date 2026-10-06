"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, Settings, Calendar, DollarSign, RotateCcw, Plus, Trash2, Edit, HelpCircle, Users, WalletCards } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"
import { useEstablishment } from "@/hooks/useEstablishment"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { serviceParametres } from "@/services/parametres.service"
import { updateEstablishment } from "@/lib/supabase/services/establishment.service"
import type { ParametresEcole } from "@/types/models"
import type { Establishment } from "@/lib/supabase/types"

import StructureAcademiquePage from "./structure/page"
import ScolariteSettingsPage from "./scolarite/page"
import AcademicYearsTab from "@/components/academic/AcademicYearsTab"
import RolesTab from "@/components/settings/RolesTab"
import { payrollService } from "@/lib/supabase/services/payroll.service"

interface EstablishmentFormData {
  nomEtablissement: string
  nomDirecteur: string
  nomLegal: string
  nomCourt: string
  typeEcole: string
  codeEtablissement: string
  slogan: string
  emailEtablissement: string
  telephoneEtablissement: string
  telephoneSecondaire: string
  siteWeb: string
  adresse: string
  adresse2: string
  codePostal: string
  ville: string
  province: string
  pays: string
  codePays: string
  deviseCode: string
  deviseNom: string
  deviseSymbole: string
  fuseauHoraire: string
  logoUrl: string
  cachetUrl: string
}

export default function SettingsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId ?? null

  // Tous les hooks AVANT tout early return (règles des hooks React)
  const { data: establishment, error: establishmentError } = useEstablishment(establishmentId)
  const { data: academicYears, error: academicYearsError } = useAcademicYears(establishmentId)
  const { error: structureError } = useAcademicStructure(establishmentId)

  // Early return si pas d'etablissementId (après tous les hooks)
  const noEstablishment = !establishmentId

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

  const [establishmentFormData, setEstablishmentFormData] = useState<EstablishmentFormData>({
    nomEtablissement: "",
    nomDirecteur: "",
    nomLegal: "",
    nomCourt: "",
    typeEcole: "",
    codeEtablissement: "",
    slogan: "",
    emailEtablissement: "",
    telephoneEtablissement: "",
    telephoneSecondaire: "",
    siteWeb: "",
    adresse: "",
    adresse2: "",
    codePostal: "",
    ville: "",
    province: "",
    pays: "",
    codePays: "",
    deviseCode: "",
    deviseNom: "",
    deviseSymbole: "",
    fuseauHoraire: "",
    logoUrl: "",
    cachetUrl: "",
  })

  // État initial pour détecter les modifications de l'établissement
  const [initialEstablishmentFormData, setInitialEstablishmentFormData] = useState<EstablishmentFormData | null>(null)

  // États pour les erreurs de validation
  const [erreursValidation, setErreursValidation] = useState<Record<string, string>>({})

  // État pour détecter les modifications non enregistrées
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [initialSettings, setInitialSettings] = useState<ParametresEcole | null>(null)

  const [payrollGenerationDay, setPayrollGenerationDay] = useState("5")
  const [payrollAutoGenerate, setPayrollAutoGenerate] = useState(true)
  const [payrollSaving, setPayrollSaving] = useState(false)
  const [payrollLoading, setPayrollLoading] = useState(false)
  const [payrollYearId, setPayrollYearId] = useState("")
  const [payrollPayableMonths, setPayrollPayableMonths] = useState<number[]>([])

  // Détecter les modifications non enregistrées
  useEffect(() => {
    const establishmentChanged = initialEstablishmentFormData
      ? JSON.stringify(establishmentFormData) !== JSON.stringify(initialEstablishmentFormData)
      : false
    const settingsChanged = initialSettings
      ? JSON.stringify(settings) !== JSON.stringify(initialSettings)
      : false

    setHasUnsavedChanges(establishmentChanged || settingsChanged)
  }, [establishmentFormData, initialEstablishmentFormData, settings, initialSettings])

  // Charger les données de l'établissement depuis Supabase
  useEffect(() => {
    if (establishment) {
      const formData: EstablishmentFormData = {
        nomEtablissement: establishment.name || "",
        nomDirecteur: establishment.director_name || "",
        nomLegal: establishment.legal_name || "",
        nomCourt: establishment.short_name || "",
        typeEcole: establishment.establishment_type || "",
        codeEtablissement: establishment.code || "",
        slogan: establishment.slogan || "",
        emailEtablissement: establishment.email || "",
        telephoneEtablissement: establishment.phone || "",
        telephoneSecondaire: establishment.alternate_phone || "",
        siteWeb: establishment.website || "",
        adresse: establishment.address_line1 || "",
        adresse2: establishment.address_line2 || "",
        codePostal: establishment.postal_code || "",
        ville: establishment.city || "",
        province: establishment.province || "",
        pays: establishment.country || "",
        codePays: establishment.country_code || "",
        deviseCode: establishment.currency_code || "",
        deviseNom: establishment.currency_name || "",
        deviseSymbole: establishment.currency_symbol || "",
        fuseauHoraire: establishment.timezone || "",
        logoUrl: establishment.logo_url || "",
        cachetUrl: establishment.seal_url || "",
      }
      setEstablishmentFormData(formData)
      // Initialiser l'état de référence pour détecter les changements
      setInitialEstablishmentFormData(formData)
    }
  }, [establishment])

  useEffect(() => {
    try {
      const parametresCharges = serviceParametres.obtenirParametres()

      // S'assurer que tous les champs sont définis
      const loadedSettings: ParametresEcole = {
        anneeAcademique: parametresCharges.anneeAcademique || "",
        dateDebut: parametresCharges.dateDebut || "",
        dateFin: parametresCharges.dateFin || "",
        nomEcole: parametresCharges.nomEcole || "",
        adresseEcole: parametresCharges.adresseEcole || "",
        telephoneEcole: parametresCharges.telephoneEcole || "",
        nomDirecteur: parametresCharges.nomDirecteur || "",
        logoUrl: parametresCharges.logoUrl || "",
        cachetUrl: parametresCharges.cachetUrl || "",
        modePaiement: parametresCharges.modePaiement || "les_deux",
      }

      setSettings(loadedSettings)

      // Sauvegarder l'état initial pour détecter les modifications
      setInitialSettings(loadedSettings)
    } catch (error) {
      console.error("Erreur lors du chargement des paramètres:", error)
    }
  }, [])

  const payrollMonthOptions = (year: any) => {
    if (!year?.start_date || !year?.end_date) return []
    const result: { month: number; year: number; label: string }[] = []
    const cursor = new Date(year.start_date + "T12:00:00")
    const end = new Date(year.end_date + "T12:00:00")
    const months = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"]
    while (cursor <= end) {
      result.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear(), label: months[cursor.getMonth()] + " " + cursor.getFullYear() })
      cursor.setMonth(cursor.getMonth() + 1)
    }
    return result
  }

  useEffect(() => {
    if (!establishmentId) return
    let cancelled = false
    setPayrollLoading(true)
    const year = academicYears?.find((y) => y.status === "active") ?? academicYears?.[0]
    Promise.all([
      payrollService.getSettings(establishmentId),
      year ? payrollService.getAcademicYearPayrollSettings(establishmentId, year.id) : Promise.resolve(null),
    ]).then(([data, yearSettings]) => {
      if (cancelled) return
      if (data?.generation_day) setPayrollGenerationDay(String(data.generation_day))
      setPayrollAutoGenerate(data?.auto_generate !== false)
      if (year) {
        setPayrollYearId(year.id)
        const options = payrollMonthOptions(year)
        const configured = Array.isArray(yearSettings?.payable_months) ? yearSettings.payable_months.map(Number) : options.map((m) => m.month)
        setPayrollPayableMonths(configured.filter((month: number) => options.some((m) => m.month === month)))
      }
    }).catch((error) => console.error("Erreur chargement paramètres paie:", error)).finally(() => {
      if (!cancelled) setPayrollLoading(false)
    })
    return () => { cancelled = true }
  }, [establishmentId, academicYears])

  const savePayrollSettings = async () => {
    if (!establishmentId) return
    const day = Number(payrollGenerationDay)
    if (day < 1 || day > 28) {
      alert("Le jour de génération doit être compris entre 1 et 28.")
      return
    }
    try {
      setPayrollSaving(true)
      await payrollService.saveSettings(establishmentId, day, payrollAutoGenerate)
      if (payrollYearId) await payrollService.saveAcademicYearPayrollSettings(establishmentId, payrollYearId, payrollPayableMonths)
      alert("Paramètres de paie enregistrés.")
    } catch (error) {
      alert("Erreur lors de l'enregistrement de la paie : " + (error as Error).message)
    } finally {
      setPayrollSaving(false)
    }
  }

  // Synchroniser tarificationTypesEcole avec academicStructure


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



  const saveSettings = async () => {
    if (!establishmentId) {
      alert("Impossible de sauvegarder : ID d'établissement manquant")
      return
    }

    try {
      // Payload vers Supabase — source unique : establishmentFormData
      const establishmentPayload = {
        name: establishmentFormData.nomEtablissement?.trim() || "",
        director_name: establishmentFormData.nomDirecteur?.trim() || null,
        legal_name: establishmentFormData.nomLegal?.trim() || null,
        short_name: establishmentFormData.nomCourt?.trim() || null,
        establishment_type: establishmentFormData.typeEcole?.trim() || null,
        code: establishmentFormData.codeEtablissement?.trim() || null,
        slogan: establishmentFormData.slogan?.trim() || null,
        email: establishmentFormData.emailEtablissement?.trim() || null,
        phone: establishmentFormData.telephoneEtablissement?.trim() || null,
        alternate_phone: establishmentFormData.telephoneSecondaire?.trim() || null,
        website: establishmentFormData.siteWeb?.trim() || null,
        address_line1: establishmentFormData.adresse?.trim() || null,
        address_line2: establishmentFormData.adresse2?.trim() || null,
        postal_code: establishmentFormData.codePostal?.trim() || null,
        city: establishmentFormData.ville?.trim() || null,
        province: establishmentFormData.province?.trim() || null,
        country: establishmentFormData.pays?.trim() || null,
        country_code: establishmentFormData.codePays?.trim() || null,
        currency_code: establishmentFormData.deviseCode?.trim() || "XAF",
        currency_name: establishmentFormData.deviseNom?.trim() || "Franc CFA",
        currency_symbol: establishmentFormData.deviseSymbole?.trim() || "FCFA",
        timezone: establishmentFormData.fuseauHoraire?.trim() || "Africa/Libreville",
        logo_url: establishmentFormData.logoUrl?.trim() || null,
        seal_url: establishmentFormData.cachetUrl?.trim() || null,
      }

      console.log("[Settings] Payload envoyé à Supabase:", JSON.stringify(establishmentPayload, null, 2))

      // Sauvegarder dans Supabase
      const updatedEstablishment = await updateEstablishment(establishmentId, establishmentPayload)
      console.log("[Settings] Réponse Supabase:", JSON.stringify(updatedEstablishment, null, 2))

      // Mettre à jour le formulaire avec les données confirmées par Supabase
      const confirmedFormData: EstablishmentFormData = {
        nomEtablissement: updatedEstablishment.name || "",
        nomDirecteur: updatedEstablishment.director_name || "",
        nomLegal: updatedEstablishment.legal_name || "",
        nomCourt: updatedEstablishment.short_name || "",
        typeEcole: updatedEstablishment.establishment_type || "",
        codeEtablissement: updatedEstablishment.code || "",
        slogan: updatedEstablishment.slogan || "",
        emailEtablissement: updatedEstablishment.email || "",
        telephoneEtablissement: updatedEstablishment.phone || "",
        telephoneSecondaire: updatedEstablishment.alternate_phone || "",
        siteWeb: updatedEstablishment.website || "",
        adresse: updatedEstablishment.address_line1 || "",
        adresse2: updatedEstablishment.address_line2 || "",
        codePostal: updatedEstablishment.postal_code || "",
        ville: updatedEstablishment.city || "",
        province: updatedEstablishment.province || "",
        pays: updatedEstablishment.country || "",
        codePays: updatedEstablishment.country_code || "",
        deviseCode: updatedEstablishment.currency_code || "",
        deviseNom: updatedEstablishment.currency_name || "",
        deviseSymbole: updatedEstablishment.currency_symbol || "",
        fuseauHoraire: updatedEstablishment.timezone || "",
        logoUrl: updatedEstablishment.logo_url || "",
        cachetUrl: updatedEstablishment.seal_url || "",
      }
      setEstablishmentFormData(confirmedFormData)
      setInitialEstablishmentFormData(confirmedFormData)

      // Sauvegarder les paramètres généraux dans localStorage
      serviceParametres.sauvegarderParametres(settings)

      // Mettre à jour l'état initial après sauvegarde
      setInitialSettings(settings)
      setHasUnsavedChanges(false)

      alert("Paramètres sauvegardés avec succès !")
    } catch (error) {
      alert("Erreur lors de la sauvegarde: " + (error as Error).message)
    }
  }

  const resetSettings = () => {
    if (confirm("Voulez-vous réinitialiser les paramètres généraux ?")) {
      try {
        serviceParametres.reinitialiserParametres()
        const parametresDefaut = serviceParametres.obtenirParametres()
        setSettings(parametresDefaut)
        setInitialSettings(parametresDefaut)
        setHasUnsavedChanges(false)
        alert("Paramètres réinitialisés avec succès !")
      } catch (error) {
        alert("Erreur lors de la réinitialisation: " + (error as Error).message)
      }
    }
  }

  if (noEstablishment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f8fc] px-4">
        <Card className="w-full max-w-md rounded-none border-[#d9dce5] shadow-none">
          <CardHeader>
            <CardTitle>Erreur de chargement</CardTitle>
            <CardDescription>Impossible de déterminer votre établissement.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[#36445a]">Veuillez vous reconnecter ou contacter l'administrateur.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-w-0 bg-[#f7f8fc] text-[#172033]">
      <div className="w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="border-b border-[#d7dae3] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[#6b7280]">
                Configuration <span className="px-1">/</span> Paramètres de l'établissement
              </div>
              <h1 className="text-[24px] font-semibold leading-8 tracking-tight text-[#172033]">
                Paramètres de l'Établissement
              </h1>
              <p className="mt-1 max-w-3xl text-[13px] leading-5 text-[#5d6677]">
                Configurez les informations administratives, l'année académique, la scolarité et la structure de votre établissement.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetSettings} disabled={!hasUnsavedChanges} className="h-9 rounded-md border-[#cfd3dc] bg-white text-[#36445a] shadow-none">
                <RotateCcw className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>
              <Button size="sm" onClick={saveSettings} disabled={!hasUnsavedChanges} className="h-9 rounded-md bg-[#173b8f] text-white shadow-none hover:bg-[#123176]">
                <Save className="mr-2 h-4 w-4" />
                Enregistrer
              </Button>
            </div>
          </div>
        </div>

        {hasUnsavedChanges && (
          <div className="mt-3 border-l-2 border-[#b7791f] bg-[#fffaf0] px-3 py-2 text-[12px] text-[#805b16]">
            Des modifications ne sont pas encore enregistrées.
          </div>
        )}

        {establishmentError && (
          <div className="mt-3 border border-[#ead7a2] bg-[#fffaf0] px-3 py-2 text-[12px] text-[#805b16]">
            Les paramètres d'établissement ne sont pas disponibles en temps réel, mais la configuration locale reste intacte.
          </div>
        )}

        {academicYearsError && (
          <div className="mt-3 border border-[#e5b7b7] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#9b2c2c]">
            Erreur de chargement des années académiques : {academicYearsError}
          </div>
        )}

        {structureError && (
          <div className="mt-3 border border-[#e5b7b7] bg-[#fff6f6] px-3 py-2 text-[12px] text-[#9b2c2c]">
            Erreur de chargement de la structure académique : {structureError}
          </div>
        )}

        <Tabs defaultValue="general" className="mt-5 space-y-5">
          <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b border-[#d7dae3] bg-transparent p-0">
            <TabsTrigger value="general" className="h-10 rounded-none border-b-2 border-transparent px-4 text-[12px] font-medium text-[#657084] shadow-none data-[state=active]:border-[#173b8f] data-[state=active]:bg-transparent data-[state=active]:text-[#173b8f]">
              Établissement & Coordonnées
            </TabsTrigger>
            <TabsTrigger value="academic" className="h-10 rounded-none border-b-2 border-transparent px-4 text-[12px] font-medium text-[#657084] shadow-none data-[state=active]:border-[#173b8f] data-[state=active]:bg-transparent data-[state=active]:text-[#173b8f]">
              Année académique & Périodes
            </TabsTrigger>
            <TabsTrigger value="scolarite" className="h-10 rounded-none border-b-2 border-transparent px-4 text-[12px] font-medium text-[#657084] shadow-none data-[state=active]:border-[#173b8f] data-[state=active]:bg-transparent data-[state=active]:text-[#173b8f]">
              Scolarité & Grille tarifaire
            </TabsTrigger>
            <TabsTrigger value="structure" className="h-10 rounded-none border-b-2 border-transparent px-4 text-[12px] font-medium text-[#657084] shadow-none data-[state=active]:border-[#173b8f] data-[state=active]:bg-transparent data-[state=active]:text-[#173b8f]">
              Structure académique
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-0">
            <div className="space-y-4">
              <section className="border border-[#d7dae3] bg-white shadow-none">
                <div className="flex items-start justify-between border-b border-[#e3e5ea] px-4 py-3">
                  <div>
                    <h2 className="text-[14px] font-semibold text-[#172033]">1. Identité Administrative & Juridique</h2>
                    <p className="mt-0.5 text-[11px] text-[#70798a]">Informations officielles utilisées sur les documents de l'établissement.</p>
                  </div>
                  <span className="text-[11px] text-[#6b7280]">Obligatoire</span>
                </div>
                <div className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2">
                  <div><Label htmlFor="nomEcole">Nom de l'établissement *</Label><Input id="nomEcole" value={establishmentFormData.nomEtablissement} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, nomEtablissement: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="nomLegal">Dénomination légale</Label><Input id="nomLegal" value={establishmentFormData.nomLegal} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, nomLegal: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="nomCourt">Nom court</Label><Input id="nomCourt" value={establishmentFormData.nomCourt} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, nomCourt: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="typeEcole">Type d'établissement</Label><Input id="typeEcole" value={establishmentFormData.typeEcole} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, typeEcole: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="codeEtablissement">Code établissement</Label><Input id="codeEtablissement" value={establishmentFormData.codeEtablissement} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, codeEtablissement: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="nomDirecteur">Responsable / Directeur</Label><Input id="nomDirecteur" value={establishmentFormData.nomDirecteur} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, nomDirecteur: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div className="md:col-span-2"><Label htmlFor="slogan">Slogan</Label><Input id="slogan" value={establishmentFormData.slogan} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, slogan: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                </div>
              </section>

              <section className="border border-[#d7dae3] bg-white shadow-none">
                <div className="border-b border-[#e3e5ea] px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-[#172033]">2. Coordonnées & Siège Géographique</h2>
                </div>
                <div className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2">
                  <div className="md:col-span-2"><Label htmlFor="adresseEcole">Adresse principale</Label><Input id="adresseEcole" value={establishmentFormData.adresse} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, adresse: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="adresse2">Adresse complémentaire</Label><Input id="adresse2" value={establishmentFormData.adresse2} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, adresse2: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="ville">Ville</Label><Input id="ville" value={establishmentFormData.ville} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, ville: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="province">Province</Label><Input id="province" value={establishmentFormData.province} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, province: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="pays">Pays</Label><Input id="pays" value={establishmentFormData.pays} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, pays: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="codePostal">Code postal</Label><Input id="codePostal" value={establishmentFormData.codePostal} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, codePostal: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="emailEtablissement">Email</Label><Input id="emailEtablissement" type="email" value={establishmentFormData.emailEtablissement} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, emailEtablissement: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="telephoneEcole">Téléphone principal</Label><Input id="telephoneEcole" value={establishmentFormData.telephoneEtablissement} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, telephoneEtablissement: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="telephoneSecondaire">Téléphone secondaire</Label><Input id="telephoneSecondaire" value={establishmentFormData.telephoneSecondaire} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, telephoneSecondaire: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="siteWeb">Site web</Label><Input id="siteWeb" value={establishmentFormData.siteWeb} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, siteWeb: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                </div>
              </section>

              <section className="border border-[#d7dae3] bg-white shadow-none">
                <div className="border-b border-[#e3e5ea] px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-[#172033]">3. Éléments d'Authenticité & Documents Officiels</h2>
                </div>
                <div className="grid gap-6 p-4 md:grid-cols-2">
                  <div className="space-y-3"><Label>Logo officiel</Label>{settings.logoUrl ? <div className="flex h-24 w-24 items-center justify-center border border-[#d7dae3] bg-[#f8f9fb] p-2"><img src={settings.logoUrl} alt="Logo officiel" className="max-h-full max-w-full object-contain" /></div> : <div className="flex h-24 w-24 items-center justify-center border border-dashed border-[#cfd3dc] text-[11px] text-[#7b8494]">Aucun logo</div>}<div className="flex gap-2"><Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleLogoUpload} className="rounded-md" />{settings.logoUrl && <Button variant="outline" size="icon" onClick={() => setSettings(prev => ({ ...prev, logoUrl: "" }))}><Trash2 className="h-4 w-4" /></Button>}</div>{erreursValidation.logo && <p className="text-xs text-red-600">{erreursValidation.logo}</p>}</div>
                  <div className="space-y-3"><Label>Cachet officiel</Label>{settings.cachetUrl ? <div className="flex h-24 w-24 items-center justify-center border border-[#d7dae3] bg-[#f8f9fb] p-2"><img src={settings.cachetUrl} alt="Cachet officiel" className="max-h-full max-w-full object-contain" /></div> : <div className="flex h-24 w-24 items-center justify-center border border-dashed border-[#cfd3dc] text-[11px] text-[#7b8494]">Aucun cachet</div>}<div className="flex gap-2"><Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleCachetUpload} className="rounded-md" />{settings.cachetUrl && <Button variant="outline" size="icon" onClick={() => setSettings(prev => ({ ...prev, cachetUrl: "" }))}><Trash2 className="h-4 w-4" /></Button>}</div>{erreursValidation.cachet && <p className="text-xs text-red-600">{erreursValidation.cachet}</p>}</div>
                </div>
              </section>

              <section className="border border-[#d7dae3] bg-white shadow-none">
                <div className="border-b border-[#e3e5ea] px-4 py-3">
                  <h2 className="text-[14px] font-semibold text-[#172033]">4. Exercice & Période en cours</h2>
                </div>
                <div className="grid gap-x-6 gap-y-4 p-4 md:grid-cols-2">
                  <div><Label htmlFor="anneeAcademique">Année académique</Label><Input id="anneeAcademique" value={settings.anneeAcademique} onChange={(e) => handleSettingsChange("anneeAcademique", e.target.value)} placeholder="2026-2027" className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="modePaiement">Mode de paiement autorisé</Label><Select value={settings.modePaiement} onValueChange={(value) => handleSettingsChange("modePaiement", value)}><SelectTrigger className="mt-1.5 rounded-md"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mensuel">Mensuel uniquement</SelectItem><SelectItem value="trimestriel">Par trimestre uniquement</SelectItem><SelectItem value="les_deux">Mensuel et trimestriel</SelectItem></SelectContent></Select></div>
                  <div><Label htmlFor="dateDebut">Date de début</Label><Input id="dateDebut" type="date" value={settings.dateDebut} onChange={(e) => handleSettingsChange("dateDebut", e.target.value)} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="dateFin">Date de fin</Label><Input id="dateFin" type="date" value={settings.dateFin} onChange={(e) => handleSettingsChange("dateFin", e.target.value)} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="deviseCode">Code devise</Label><Input id="deviseCode" value={establishmentFormData.deviseCode} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, deviseCode: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="deviseSymbole">Symbole devise</Label><Input id="deviseSymbole" value={establishmentFormData.deviseSymbole} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, deviseSymbole: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                  <div><Label htmlFor="fuseauHoraire">Fuseau horaire</Label><Input id="fuseauHoraire" value={establishmentFormData.fuseauHoraire} onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, fuseauHoraire: e.target.value }))} className="mt-1.5 rounded-md" /></div>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="academic" className="mt-0">
            <div className="border border-[#d7dae3] bg-white shadow-none">
              <div className="border-b border-[#e3e5ea] px-4 py-3">
                <h2 className="text-[14px] font-semibold text-[#172033]">Année Scolaire Active & Bascule d'Exercice</h2>
                <p className="mt-0.5 text-[11px] text-[#70798a]">Gérez les années académiques et leur période d'application.</p>
              </div>
              <div className="p-4"><AcademicYearsTab /></div>
            </div>
          </TabsContent>

          <TabsContent value="scolarite" className="mt-0">
            <div className="border border-[#d7dae3] bg-white shadow-none">
              <div className="border-b border-[#e3e5ea] px-4 py-3">
                <h2 className="text-[14px] font-semibold text-[#172033]">Scolarité & Grille tarifaire</h2>
                <p className="mt-0.5 text-[11px] text-[#70798a]">Configurez les frais, modes de paiement et échéances par niveau.</p>
              </div>
              <div className="p-0"><ScolariteSettingsPage /></div>
            </div>
          </TabsContent>

          <TabsContent value="structure" className="mt-0">
            <div className="border border-[#d7dae3] bg-white shadow-none">
              <div className="border-b border-[#e3e5ea] px-4 py-3">
                <h2 className="text-[14px] font-semibold text-[#172033]">Structure académique</h2>
                <p className="mt-0.5 text-[11px] text-[#70798a]">Configurez les cycles et niveaux de l'établissement.</p>
              </div>
              <div className="p-0"><StructureAcademiquePage /></div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
