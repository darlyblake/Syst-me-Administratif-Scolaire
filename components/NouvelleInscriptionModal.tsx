"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { X, ArrowRight, ArrowLeft, UserPlus, QrCode } from "lucide-react"
import { genererCodeUnique, genererQRCode } from "@/utils/codeGenerator"
import type { DonneesEleve } from "@/types/models"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import { useAcademicYears } from "@/hooks/useAcademicYears"
import { useTuitionPlans } from "@/hooks/useTuitionPlans"
import { useEnrollment } from "@/hooks/useEnrollment"

interface NouvelleInscriptionModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  typeInscription?: "inscription" | "reinscription"
  studentId?: string // Pour la réinscription
}

export default function NouvelleInscriptionModal({ isOpen, onClose, onSuccess, typeInscription = "inscription", studentId }: NouvelleInscriptionModalProps) {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: students } = useStudents(establishmentId, { search: "", pageSize: 50 })
  const { data: academicStructure } = useAcademicStructure(establishmentId)
  const { selectedYear } = useAcademicYears(establishmentId)
  const { data: tuitionPlans } = useTuitionPlans(selectedYear?.id ?? null)
  const { createStudentEnrollment, isSubmitting, error: submissionError } = useEnrollment(null)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 6

  const [formData, setFormData] = useState({
    // Étape 1: Informations de l'enfant
    nom: "",
    prenom: "",
    dateNaissance: "",
    lieuNaissance: "",
    sexe: "",
    classe: "",
    classeAncienne: "",
    nouvelleClasse: "",
    photo: null as File | null,
    
    // Étape 2: Informations des parents
    nomParent: "",
    prenomParent: "",
    telephoneParent: "",
    emailParent: "",
    adresse: "",
    
    // Étape 3: Association avec frère/sœur
    searchSibling: "",
    selectedSibling: null as DonneesEleve | null,
    lienParente: "",
    
    // Étape 4: Mode de paiement
    modePaiement: "mensuel" as "mensuel" | "tranches",
    nombreTranches: 3,
    moisPaiement: [] as string[],
    
    // Étape 5: Options supplémentaires
    optionsSupplementaires: {
      tenueScolaire: false,
      carteScolaire: false,
      cooperative: false,
      tenueEPS: false,
      assurance: false,
    },
    
    // Étape 6: Documents
    acteNaissance: null as File | null,
    certificatMedical: null as File | null,
    autresDocuments: [] as File[],
  })

  const [financialSummary, setFinancialSummary] = useState<Record<string, unknown> | null>(null)
  const [codeUnique, setCodeUnique] = useState("")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [inscriptionValidee, setInscriptionValidee] = useState(false)
  const [studentIdentifiant, setStudentIdentifiant] = useState("")

  const [siblingSuggestions, setSiblingSuggestions] = useState<DonneesEleve[]>([])

  const classes = academicStructure.flatMap((cycle) =>
    (cycle.grade_levels ?? []).flatMap((level) =>
      (level.school_classes ?? []).map((schoolClass) => ({
        id: schoolClass.id,
        name: schoolClass.name,
        gradeLevelId: level.id,
      }))
    )
  )
  const selectedClassId = typeInscription === "reinscription" ? formData.nouvelleClasse : formData.classe
  const selectedClass = classes.find((schoolClass) => schoolClass.id === selectedClassId)
  const selectedPlan = tuitionPlans.find((plan) => plan.grade_level_id === selectedClass?.gradeLevelId && plan.is_active !== false)
  const niveaux = classes
  const moisDisponibles = ["Septembre", "Octobre", "Novembre", "Décembre", "Janvier", "Février", "Mars", "Avril", "Mai", "Juin"]

  // Charger les données de l'élève existant pour la réinscription
  useEffect(() => {
    if (typeInscription === "reinscription" && studentId) {
      const existingStudent = students.find(s => s.id === studentId)
      if (existingStudent) {
        setFormData(prev => ({
          ...prev,
          nom: existingStudent.nom,
          prenom: existingStudent.prenom,
          dateNaissance: existingStudent.dateNaissance,
          lieuNaissance: existingStudent.lieuNaissance || "",
          sexe: existingStudent.sexe || "",
          classeAncienne: existingStudent.classe,
          nouvelleClasse: existingStudent.classe,
          nomParent: existingStudent.nomParent || "",
          prenomParent: "",
          telephoneParent: existingStudent.contactParent || "",
          emailParent: existingStudent.informationsContact?.email || "",
          adresse: existingStudent.adresse || "",
          optionsSupplementaires: existingStudent.optionsSupplementaires || prev.optionsSupplementaires,
        }))
      }
    }
  }, [typeInscription, studentId])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleOptionChange = (option: string, checked: boolean) => {
    const newOptions = { ...formData.optionsSupplementaires, [option]: checked }
    setFormData(prev => ({
      ...prev,
      optionsSupplementaires: newOptions
    }))
  }

  const handleMoisPaiementChange = (mois: string, checked: boolean) => {
    setFormData(prev => {
      const newMois = checked
        ? [...prev.moisPaiement, mois]
        : prev.moisPaiement.filter(m => m !== mois)
      return { ...prev, moisPaiement: newMois }
    })
  }

  const handleSiblingSearch = (term: string) => {
    setFormData(prev => ({ ...prev, searchSibling: term }))
    if (term.length < 2) {
      setSiblingSuggestions([])
      return
    }

    const searchTerm = term.toLowerCase()
    const suggestions = students.filter(student =>
      student.last_name.toLowerCase().includes(searchTerm) ||
      student.first_name.toLowerCase().includes(searchTerm) ||
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm)
    ).slice(0, 5)

    setSiblingSuggestions(suggestions.map((student) => ({
      id: student.id,
      nom: student.last_name,
      prenom: student.first_name,
      identifiant: student.student_number || student.id.slice(0, 8).toUpperCase(),
    } as DonneesEleve)))
  }

  const handleSelectSibling = (sibling: DonneesEleve) => {
    setFormData(prev => ({
      ...prev,
      selectedSibling: sibling,
      searchSibling: `${sibling.prenom} ${sibling.nom}`,
    }))
    setSiblingSuggestions([])
  }

  const handleRemoveSibling = () => {
    setFormData(prev => ({
      ...prev,
      selectedSibling: null,
      searchSibling: "",
      lienParente: "",
    }))
  }

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (typeInscription === "reinscription") {
          return !!(formData.nom && formData.prenom && formData.dateNaissance && formData.lieuNaissance && formData.nouvelleClasse)
        }
        return !!(formData.nom && formData.prenom && formData.dateNaissance && formData.lieuNaissance && formData.sexe && formData.classe)
      case 2:
        return !!(formData.nomParent && formData.telephoneParent && formData.adresse)
      case 3:
        return true // Optionnel
      case 4:
        return !!(formData.modePaiement && (formData.modePaiement === "mensuel" ? formData.moisPaiement.length > 0 : true))
      case 5:
        return true // Options sont optionnelles
      case 6:
        return true // Documents sont optionnels
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps))
    } else {
      toast.error("Champs obligatoires", {
        description: "Veuillez remplir tous les champs obligatoires de cette étape"
      })
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    // Validation finale
    if (!formData.nom || !formData.prenom || !formData.dateNaissance || !formData.classe || !formData.nomParent || !formData.telephoneParent || !formData.adresse) {
      toast.error("Champs obligatoires", {
        description: "Veuillez remplir tous les champs obligatoires"
      })
      return
    }

    if (!establishmentId || !selectedYear?.id || !selectedClass?.id || !selectedPlan) {
      toast.error("Sélection académique incomplète", { description: "Vérifiez l'année, la classe et le forfait sélectionnés." })
      return
    }

    const result = await createStudentEnrollment({
      establishmentId,
      studentId: typeInscription === "reinscription" ? studentId : null,
      academicYearId: selectedYear.id,
      classId: selectedClass.id,
      tuitionPlanId: selectedPlan.id,
      enrollmentDate: new Date().toISOString().slice(0, 10),
      firstName: formData.prenom,
      lastName: formData.nom,
      studentNumber: studentIdentifiant || genererCodeUnique(),
      birthDate: formData.dateNaissance,
      sex: formData.sexe,
      phone: formData.telephoneParent,
      email: formData.emailParent,
    })

    if (!result) {
      toast.error(submissionError || "Impossible d'enregistrer l'inscription.")
      return
    }

    const code = genererCodeUnique()
    setCodeUnique(code)
    setStudentIdentifiant(result.student_id)
    const qrUrl = genererQRCode(code)
    setQrCodeUrl(qrUrl)
    setFinancialSummary(result.financial_summary)
    setInscriptionValidee(true)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold">
              {typeInscription === "reinscription" ? "Réinscription" : "Nouvelle Inscription"}
            </h2>
            <p className="text-sm text-gray-600">Étape {currentStep} sur {totalSteps}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="px-6 pt-4">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600">
            <span>Enfant</span>
            <span>Parents</span>
            <span>Frère/Sœur</span>
            <span>Paiement</span>
            <span>Options</span>
            <span>Documents</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {inscriptionValidee ? (
            <div className="text-center space-y-6">
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="text-xl font-bold text-green-600 mb-4">Inscription Validée !</h3>
                <div className="mb-4">
                  <p className="font-semibold mb-2">Identifiant de l'élève:</p>
                  <p className="font-mono text-2xl text-blue-600">{codeUnique}</p>
                </div>
                {qrCodeUrl && (
                  <div className="flex justify-center">
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border" />
                  </div>
                )}
              </div>
              <div className="flex gap-4 justify-center">
                <Button onClick={onSuccess}>
                  Voir l'historique
                </Button>
                <Button variant="outline" onClick={() => window.open(`/receipt?id=${studentIdentifiant}`, '_blank')}>
                  <QrCode className="mr-2 h-4 w-4" />
                  Imprimer le reçu
                </Button>
                <Button variant="outline" onClick={() => {
                  setInscriptionValidee(false)
                  setCurrentStep(1)
                  setFormData({
                    nom: "",
                    prenom: "",
                    dateNaissance: "",
                    lieuNaissance: "",
                    sexe: "",
                    classe: "",
                    classeAncienne: "",
                    nouvelleClasse: "",
                    photo: null,
                    nomParent: "",
                    prenomParent: "",
                    telephoneParent: "",
                    emailParent: "",
                    adresse: "",
                    searchSibling: "",
                    selectedSibling: null,
                    lienParente: "",
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
                    acteNaissance: null,
                    certificatMedical: null,
                    autresDocuments: [],
                  })
                  setCodeUnique("")
                  setQrCodeUrl("")
                  setStudentIdentifiant("")
                }}>
                  Nouvelle inscription
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Étape 1: Informations de l'enfant */}
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations de l'Enfant</CardTitle>
                    <CardDescription>Données personnelles de l'élève</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom *</Label>
                        <Input value={formData.nom} onChange={(e) => handleInputChange("nom", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Prénom *</Label>
                        <Input value={formData.prenom} onChange={(e) => handleInputChange("prenom", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date de Naissance *</Label>
                        <Input type="date" value={formData.dateNaissance} onChange={(e) => handleInputChange("dateNaissance", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Lieu de Naissance *</Label>
                        <Input value={formData.lieuNaissance} onChange={(e) => handleInputChange("lieuNaissance", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sexe *</Label>
                        <Select value={formData.sexe} onValueChange={(value) => handleInputChange("sexe", value)} disabled={typeInscription === "reinscription"}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="M">Masculin</SelectItem>
                            <SelectItem value="F">Féminin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Niveau *</Label>
                        <Select value={formData.classe} onValueChange={(value) => handleInputChange("classe", value)} disabled={typeInscription === "reinscription"}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {niveaux.map((niveau) => (
                              <SelectItem key={niveau.id} value={niveau.id}>{niveau.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {typeInscription === "reinscription" && (
                      <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="space-y-2">
                          <Label>Ancien niveau</Label>
                          <Input value={formData.classeAncienne} disabled className="bg-gray-100" />
                        </div>
                        <div className="space-y-2">
                          <Label>Nouveau niveau *</Label>
                          <div className="flex gap-2">
                            <Select value={formData.nouvelleClasse} onValueChange={(value) => handleInputChange("nouvelleClasse", value)}>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Sélectionner" />
                              </SelectTrigger>
                              <SelectContent>
                                {niveaux.map((niveau) => (
                                  <SelectItem key={niveau.id} value={niveau.id}>{niveau.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleInputChange("nouvelleClasse", formData.classeAncienne)}
                              title="Redouble — garder le même niveau"
                            >
                              Redouble
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Photo de l'enfant</Label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleInputChange("photo", e.target.files?.[0])}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Étape 2: Informations des parents */}
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Informations des Parents</CardTitle>
                    <CardDescription>Coordonnées du responsable légal</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Nom du Parent *</Label>
                        <Input value={formData.nomParent} onChange={(e) => handleInputChange("nomParent", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Prénom du Parent</Label>
                        <Input value={formData.prenomParent} onChange={(e) => handleInputChange("prenomParent", e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Téléphone *</Label>
                        <Input type="tel" value={formData.telephoneParent} onChange={(e) => handleInputChange("telephoneParent", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input type="email" value={formData.emailParent} onChange={(e) => handleInputChange("emailParent", e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Adresse *</Label>
                      <Textarea value={formData.adresse} onChange={(e) => handleInputChange("adresse", e.target.value)} rows={3} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Étape 3: Association avec frère/sœur */}
              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Association avec un autre Élève</CardTitle>
                    <CardDescription>Optionnel - Si l'enfant a un frère ou une sœur déjà inscrit</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!formData.selectedSibling ? (
                      <div className="space-y-2">
                        <Label>Rechercher un frère/sœur</Label>
                        <div className="relative">
                          <Input
                            placeholder="Tapez le nom ou prénom..."
                            value={formData.searchSibling}
                            onChange={(e) => handleSiblingSearch(e.target.value)}
                          />
                          {siblingSuggestions.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                              {siblingSuggestions.map((sibling) => (
                                <div
                                  key={sibling.id}
                                  className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                  onClick={() => handleSelectSibling(sibling)}
                                >
                                  <p className="font-semibold">{sibling.prenom} {sibling.nom}</p>
                                  <p className="text-sm text-gray-600">Classe: {sibling.classe} | ID: {sibling.identifiant}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-lg">{formData.selectedSibling.prenom} {formData.selectedSibling.nom}</p>
                            <p className="text-sm text-gray-600">Classe: {formData.selectedSibling.classe}</p>
                            <p className="text-sm text-gray-600">ID: {formData.selectedSibling.identifiant}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={handleRemoveSibling}>
                            Supprimer
                          </Button>
                        </div>
                        <div className="space-y-2">
                          <Label>Lien de parenté</Label>
                          <Select value={formData.lienParente} onValueChange={(value) => handleInputChange("lienParente", value)}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le lien" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="frere">Frère</SelectItem>
                              <SelectItem value="soeur">Sœur</SelectItem>
                              <SelectItem value="jumeau">Jumeau/Jumelle</SelectItem>
                              <SelectItem value="demi_frere">Demi-frère</SelectItem>
                              <SelectItem value="demi_soeur">Demi-sœur</SelectItem>
                              <SelectItem value="cousin">Cousin/Cousine</SelectItem>
                              <SelectItem value="autre">Autre</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Étape 4: Mode de paiement */}
              {currentStep === 4 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Mode de Paiement</CardTitle>
                    <CardDescription>Configuration du paiement des frais de scolarité</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Mode de Paiement *</Label>
                      <Select value={formData.modePaiement} onValueChange={(value) => handleInputChange("modePaiement", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensuel">Paiement Mensuel</SelectItem>
                          <SelectItem value="tranches">Paiement par Tranches</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.modePaiement === "mensuel" && (
                      <div className="space-y-2">
                        <Label>Mois de Paiement *</Label>
                        <div className="grid grid-cols-2 gap-2">
                          {moisDisponibles.map((mois) => (
                            <div key={mois} className="flex items-center space-x-2">
                              <Checkbox
                                id={`mois-${mois}`}
                                checked={formData.moisPaiement.includes(mois)}
                                onCheckedChange={(checked) => handleMoisPaiementChange(mois, checked as boolean)}
                              />
                              <Label htmlFor={`mois-${mois}`} className="text-sm">{mois}</Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.modePaiement === "tranches" && (
                      <div className="space-y-2">
                        <Label>Nombre de Tranches</Label>
                        <Select value={formData.nombreTranches.toString()} onValueChange={(value) => handleInputChange("nombreTranches", parseInt(value))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 Tranches</SelectItem>
                            <SelectItem value="3">3 Tranches</SelectItem>
                            <SelectItem value="4">4 Tranches</SelectItem>
                            <SelectItem value="6">6 Tranches</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-4 pt-4 border-t">
                      <div className="rounded-2xl bg-creme p-4 border border-terre/10">
                        <p className="text-sm text-pierre">Scolarité</p>
                        <p className="text-2xl font-bold text-terre tabular">
                          {selectedPlan ? `${selectedPlan.annual_amount.toLocaleString("fr-FR")} FCFA` : "Sélectionnez une classe"}
                        </p>
                      </div>
                      <p className="text-sm text-pierre">Les échéances seront générées par le backend.</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Étape 5: Options supplémentaires */}
              {currentStep === 5 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Options Supplémentaires</CardTitle>
                    <CardDescription>Services et options additionnels</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="tenueScolaire"
                          checked={formData.optionsSupplementaires.tenueScolaire}
                          onCheckedChange={(checked) => handleOptionChange("tenueScolaire", checked as boolean)}
                        />
                        <Label htmlFor="tenueScolaire">Tenue Scolaire</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="carteScolaire"
                          checked={formData.optionsSupplementaires.carteScolaire}
                          onCheckedChange={(checked) => handleOptionChange("carteScolaire", checked as boolean)}
                        />
                        <Label htmlFor="carteScolaire">Carte Scolaire</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cooperative"
                          checked={formData.optionsSupplementaires.cooperative}
                          onCheckedChange={(checked) => handleOptionChange("cooperative", checked as boolean)}
                        />
                        <Label htmlFor="cooperative">Coopérative</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="tenueEPS"
                          checked={formData.optionsSupplementaires.tenueEPS}
                          onCheckedChange={(checked) => handleOptionChange("tenueEPS", checked as boolean)}
                        />
                        <Label htmlFor="tenueEPS">Tenue EPS</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="assurance"
                          checked={formData.optionsSupplementaires.assurance}
                          onCheckedChange={(checked) => handleOptionChange("assurance", checked as boolean)}
                        />
                        <Label htmlFor="assurance">Assurance</Label>
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="border-t pt-3 flex justify-between text-lg font-bold">
                        <span>Plan tarifaire sélectionné</span>
                        <span className="text-blue-600">{selectedPlan ? `${selectedPlan.annual_amount.toLocaleString()} FCFA` : "-"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Étape 6: Documents */}
              {currentStep === 6 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Documents</CardTitle>
                    <CardDescription>Documents optionnels (photo, acte de naissance, etc.)</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Acte de naissance</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleInputChange("acteNaissance", e.target.files?.[0])}
                      />
                      <p className="text-xs text-gray-500">Formats acceptés: PDF, JPG, PNG</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Certificat médical</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleInputChange("certificatMedical", e.target.files?.[0])}
                      />
                      <p className="text-xs text-gray-500">Formats acceptés: PDF, JPG, PNG</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Autres documents</Label>
                      <Input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || [])
                          setFormData(prev => ({ ...prev, autresDocuments: files }))
                        }}
                      />
                      <p className="text-xs text-gray-500">Formats acceptés: PDF, JPG, PNG, DOC, DOCX</p>
                      {formData.autresDocuments.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {formData.autresDocuments.map((file, index) => (
                            <div key={index} className="text-sm text-gray-600 flex items-center gap-2">
                              <span>• {file.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    autresDocuments: prev.autresDocuments.filter((_, i) => i !== index)
                                  }))
                                }}
                              >
                                ×
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation buttons */}
              <div className="flex justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Précédent
                </Button>
                {currentStep === totalSteps ? (
                  <Button onClick={handleSubmit}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Valider l'Inscription
                  </Button>
                ) : (
                  <Button onClick={handleNext}>
                    Suivant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
