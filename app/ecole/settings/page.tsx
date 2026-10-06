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
      <div className="flex items-center justify-center min-h-screen bg-[#f7f8fc]">
        <Card className="max-w-md">
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
    <div className="min-h-screen min-w-0 max-w-full overflow-x-hidden bg-[#f7f8fc]">
      <div className="mx-auto max-w-7xl min-w-0 px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Link>
            </Button>
            <div>
              <h1 className="text-xl sm:text-[23px] font-semibold text-[#131b2e] flex items-center gap-2">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                Paramètres du Système
              </h1>
              <p className="text-sm sm:text-base text-[#36445a]">Configuration de l'établissement et des tarifs</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={resetSettings} className="flex-1 sm:flex-none">
              <RotateCcw className="h-4 w-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={saveSettings} disabled={!hasUnsavedChanges} className="flex-1 sm:flex-none">
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

        {academicYearsError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Erreur de chargement des années académiques : {academicYearsError}
          </div>
        )}

        {structureError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Erreur de chargement de la structure académique : {structureError}
          </div>
        )}



        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="flex h-auto w-full max-w-full flex-wrap justify-start gap-1 overflow-x-auto p-1">
            <TabsTrigger value="general" className="whitespace-nowrap">Général</TabsTrigger>
            <TabsTrigger value="academic" className="whitespace-nowrap">Année scolaire</TabsTrigger>
            <TabsTrigger value="structure" className="whitespace-nowrap">Structure académique</TabsTrigger>
            <TabsTrigger value="scolarite" className="whitespace-nowrap">Scolarité</TabsTrigger>
            <TabsTrigger value="roles" className="whitespace-nowrap">Rôles et accès</TabsTrigger>
            <TabsTrigger value="payroll" className="whitespace-nowrap">Paie du personnel</TabsTrigger>
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
                      value={establishmentFormData.nomEtablissement}
                      onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, nomEtablissement: e.target.value }))}
                      className={establishmentFormData.nomEtablissement ? "" : "border-red-300"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nomDirecteur" className="flex items-center gap-1">
                      Nom du directeur
                      <HelpCircle className="h-3 w-3 text-gray-400" />
                    </Label>
                    <Input
                      id="nomDirecteur"
                      value={establishmentFormData.nomDirecteur}
                      onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, nomDirecteur: e.target.value }))}
                      placeholder="Ex : M. Jean Dupont"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresseEcole" className="flex items-center gap-1">
                    Adresse complète
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Input
                    id="adresseEcole"
                    value={establishmentFormData.adresse}
                    onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, adresse: e.target.value }))}
                    placeholder="Ex : Quartier Batterie IV, Libreville"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephoneEcole" className="flex items-center gap-1">
                    Téléphone
                    <HelpCircle className="h-3 w-3 text-gray-400" />
                  </Label>
                  <Input
                    id="telephoneEcole"
                    value={establishmentFormData.telephoneEtablissement}
                    onChange={(e) => setEstablishmentFormData(prev => ({ ...prev, telephoneEtablissement: e.target.value }))}
                    placeholder="Ex : +241 01 23 45 67"
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
                  <p className="text-sm text-[#36445a] mb-4">
                    Le logo et le cachet seront utilisés sur les documents officiels (bulletins, certificats, attestations).
                  </p>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <Label className="font-medium">Logo officiel</Label>
                      <div className="space-y-2">
                        {settings.logoUrl && (
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-[#f7f8fc]">
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
                          <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-[#f7f8fc]">
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
            <AcademicYearsTab />
          </TabsContent>

          <TabsContent value="structure">
            <StructureAcademiquePage />
          </TabsContent>

          <TabsContent value="scolarite">
            <ScolariteSettingsPage />
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>

          <TabsContent value="payroll">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><WalletCards className="h-5 w-5" /> Paie du personnel</CardTitle>
                <CardDescription>Définissez quand les états de salaire sont préparés et utilisez ensuite la navigation mensuelle dans Finance → Paie.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-md border bg-[#f7f8fc] p-4 text-sm text-[#36445a]">
                  <p className="font-medium text-[#131b2e]">Fonctionnement</p>
                  <p className="mt-1">Chaque état correspond à un mois de salaire. La navigation dans Finance permet de passer au mois précédent ou suivant sans perdre l'historique des périodes déjà générées.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="payroll-generation-day">Jour de génération automatique</Label>
                    <Input id="payroll-generation-day" type="number" min={1} max={28} value={payrollGenerationDay} onChange={(e) => setPayrollGenerationDay(e.target.value)} disabled={payrollLoading} />
                    <p className="text-xs text-[#515f74]">Exemple : le 5 prépare l'état du mois précédent.</p>
                  </div>
                  <div className="flex items-start gap-3 rounded-md border p-4">
                    <input id="payroll-auto-generate" type="checkbox" checked={payrollAutoGenerate} onChange={(e) => setPayrollAutoGenerate(e.target.checked)} className="mt-1 h-4 w-4" />
                    <div>
                      <Label htmlFor="payroll-auto-generate" className="cursor-pointer">Générer automatiquement les états</Label>
                      <p className="text-xs text-[#515f74] mt-1">Le système prépare l'état mensuel au jour défini.</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 rounded-md border p-4">
                  <div>
                    <Label>Année académique concernée</Label>
                    <Select value={payrollYearId} onValueChange={(value) => {
                      const year = academicYears?.find((y) => y.id === value)
                      setPayrollYearId(value)
                      setPayrollPayableMonths(year ? payrollMonthOptions(year).map((m) => m.month) : [])
                      if (year) {
                        payrollService.getAcademicYearPayrollSettings(establishmentId!, value).then((data) => {
                          if (Array.isArray(data?.payable_months)) setPayrollPayableMonths(data.payable_months.map(Number))
                        }).catch(() => {})
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner une année" /></SelectTrigger>
                      <SelectContent>
                        {(academicYears ?? []).map((year) => <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Mois payables dans cet établissement</Label>
                    <p className="text-xs text-[#515f74] mb-3">Seuls les mois compris dans la période de cette année académique peuvent être sélectionnés.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(academicYears?.find((y) => y.id === payrollYearId) ? payrollMonthOptions(academicYears.find((y) => y.id === payrollYearId)!) : []).map((item) => (
                        <label key={item.year + "-" + item.month} className="flex items-center gap-2 rounded border px-3 py-2 text-sm cursor-pointer">
                          <input type="checkbox" checked={payrollPayableMonths.includes(item.month)} onChange={(e) => setPayrollPayableMonths((prev) => e.target.checked ? [...new Set([...prev, item.month])] : prev.filter((m) => m !== item.month))} />
                          {item.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={savePayrollSettings} disabled={payrollSaving || payrollLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {payrollSaving ? "Enregistrement..." : "Enregistrer la configuration"}
                  </Button>
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
                          className="w-16 h-16 border-2 border-[#c5c5d3]/60 rounded-full object-contain"
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
                <div className="p-4 bg-[#eef3ff] rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Aperçu</h3>
                  <p className="text-sm text-[#1e3a8a]">Les changements d'apparence seront appliqués après sauvegarde et redémarrage de l'application.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
