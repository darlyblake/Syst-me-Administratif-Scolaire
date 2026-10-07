"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Send, Download, Copy, Check, X, Search, School } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { serviceTransfert } from "@/services/transfert.service"
import { getEstablishments } from "@/lib/supabase/services/establishment.service"
import { useUserContext } from "@/hooks/useUserContext"
import { useStudents } from "@/hooks/useStudents"
import { useAcademicStructure } from "@/hooks/useAcademicStructure"
import type { DonneesEleve, DossierTransfert } from "@/types/models"
import type { Establishment } from "@/lib/supabase/types"

export default function TransfertPage() {
  const { primaryEstablishment } = useUserContext()
  const establishmentId = primaryEstablishment?.id ?? null
  const { data: supabaseStudents } = useStudents(establishmentId)
  const { data: academicStructure } = useAcademicStructure(establishmentId)

  const [establishments, setEstablishments] = useState<Establishment[]>([])

  useEffect(() => {
    getEstablishments()
      .then(setEstablishments)
      .catch(console.error)
  }, [])

  const assignmentClasses = useMemo(() =>
    (academicStructure || []).flatMap((cycle) => (cycle.grade_levels ?? []).flatMap((level) => (level.school_classes ?? []).map((sc) => ({ id: sc.id, name: sc.name, gradeLevelId: level.id })))),
    [academicStructure]
  )

  const realGradeLevels = useMemo(() =>
    (academicStructure || []).flatMap((cycle) => (cycle.grade_levels ?? []).map((level) => ({ id: level.id, name: level.name }))),
    [academicStructure]
  )

  const mappedSupabaseStudents = useMemo(() => {
    return (supabaseStudents ?? []).map((student: any) => ({
      id: student.id,
      identifiant: student.student_number || student.id.slice(0, 8).toUpperCase(),
      motDePasse: "",
      nom: student.last_name || "",
      prenom: student.first_name || "",
      dateNaissance: student.date_of_birth || student.birth_date || "",
      lieuNaissance: student.place_of_birth || "",
      sexe: student.gender || student.sex || "",
      classe: assignmentClasses.find(c => c.id === student.class_id)?.name ?? "Non assigné",
      niveauActuel: realGradeLevels.find(l => l.id === student.grade_level_id)?.name ?? "Non assigné",
      classeAncienne: "",
      nomParent: "",
      contactParent: student.phone || "",
      adresse: "",
      dateInscription: student.created_at || "",
      statut: student.status === "active" ? "actif" : "inactif",
      totalAPayer: 0,
      typeInscription: "inscription" as const,
      informationsContact: {
        telephone: student.phone || "",
        email: student.email || "",
        adresse: "",
      },
      modePaiement: "mensuel" as const,
      optionsSupplementaires: {
        tenueScolaire: false,
        carteScolaire: false,
        cooperative: false,
        tenueEPS: false,
        assurance: false,
      },
      fraisOptionsSupplementaires: {
        tenueScolaire: 0,
        carteScolaire: 0,
        cooperative: 0,
        tenueEPS: 0,
        assurance: 0,
      },
      moisPaiement: [],
      optionsPersonnalisees: [],
    } as DonneesEleve & { niveauActuel?: string }))
  }, [supabaseStudents, assignmentClasses, realGradeLevels])

  const [tab, setTab] = useState<"envoyer" | "recevoir">("envoyer")
  const [refresh, setRefresh] = useState(0)

  // --- Envoyer ---
  const [eleveSearch, setEleveSearch] = useState("")
  const elevesActifs = useMemo(() => {
    let list = mappedSupabaseStudents.filter((e) => e.statut === "actif")
    if (eleveSearch.trim()) {
      const search = eleveSearch.toLowerCase()
      list = list.filter((e) => 
        e.nom.toLowerCase().includes(search) || 
        e.prenom.toLowerCase().includes(search) ||
        e.identifiant.toLowerCase().includes(search)
      )
    }
    return list
  }, [mappedSupabaseStudents, refresh, eleveSearch])

  const [eleveId, setEleveId] = useState("")
  const [ecoleDestination, setEcoleDestination] = useState("")
  const [niveauDestination, setNiveauDestination] = useState("")
  const [motif, setMotif] = useState("")
  const [dossierCree, setDossierCree] = useState<DossierTransfert | null>(null)

  const handleEnvoyer = () => {
    const eleve = mappedSupabaseStudents.find((e) => e.id === eleveId)
    if (!eleve) {
      toast.error("Choisissez un élève")
      return
    }
    if (!ecoleDestination.trim()) {
      toast.error("Indiquez l'école de destination")
      return
    }
    if (!niveauDestination.trim()) {
      toast.error("Indiquez le niveau de destination")
      return
    }
    if (!motif.trim()) {
      toast.error("Indiquez le motif")
      return
    }
    const d = serviceTransfert.creerDossier(
      eleve, 
      motif.trim(), 
      primaryEstablishment?.name || "Mon établissement",
      ecoleDestination.trim(),
      niveauDestination.trim()
    )
    setDossierCree(d)
    setRefresh((k) => k + 1)
    toast.success("Dossier de transfert créé (sans données de paiement)")
  }

  const downloadJSON = () => {
    if (!dossierCree) return
    const blob = new Blob([serviceTransfert.exporterJSON(dossierCree)], {
      type: "application/json",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transfert-${dossierCree.code}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // --- Recevoir ---
  const [code, setCode] = useState("")
  const [dossierRecu, setDossierRecu] = useState<DossierTransfert | null>(null)
  const [classeAccueil, setClasseAccueil] = useState("")
  const classes = useMemo(() => Array.from(new Set(mappedSupabaseStudents.map((student) => student.classe).filter(Boolean))), [mappedSupabaseStudents, refresh])

  const chargerParCode = () => {
    const d = serviceTransfert.trouverParCode(code.trim())
    if (!d) {
      toast.error("Aucun dossier en attente pour ce code")
      setDossierRecu(null)
      return
    }
    setDossierRecu(d)
    toast.message("Dossier chargé — examinez-le avant d'accepter")
  }

  const handleImportFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const d = serviceTransfert.importerDepuisJSON(String(reader.result))
      if (!d) {
        toast.error("Fichier invalide")
        return
      }
      setDossierRecu(d)
      setCode(d.code)
      toast.success("Dossier importé")
    }
    reader.readAsText(file)
  }

  const handleAccepter = () => {
    if (!dossierRecu || !classeAccueil) {
      toast.error("Choisissez la classe d'accueil")
      return
    }
    const eleve = serviceTransfert.accepter(dossierRecu.code, classeAccueil)
    if (!eleve) {
      toast.error("Impossible d'accepter ce dossier")
      return
    }
    toast.success(`${eleve.prenom} ${eleve.nom} intégré en ${classeAccueil}`)
    setDossierRecu(null)
    setCode("")
    setClasseAccueil("")
    setRefresh((k) => k + 1)
  }

  const handleRefuser = () => {
    if (!dossierRecu) return
    const motifRefus = window.prompt("Motif du refus ?") || "Non précisé"
    serviceTransfert.refuser(dossierRecu.code, motifRefus)
    toast.message("Transfert refusé")
    setDossierRecu(null)
    setCode("")
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("envoyer")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-medium ${
            tab === "envoyer" ? "bg-terre text-white" : "bg-creme text-pierre"
          }`}
        >
          Envoyer un élève
        </button>
        <button
          onClick={() => setTab("recevoir")}
          className={`px-5 py-2.5 rounded-2xl text-sm font-medium ${
            tab === "recevoir" ? "bg-terre text-white" : "bg-creme text-pierre"
          }`}
        >
          Recevoir un élève
        </button>
      </div>

      {tab === "envoyer" && (
        <div className="bg-papier rounded-3xl shadow-soft p-6 space-y-5">
          {!dossierCree ? (
            <>
              <div className="space-y-4">
                <div>
                  <Label>Rechercher un élève</Label>
                  <div className="relative mt-1.5">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Nom, prénom ou matricule..."
                      value={eleveSearch}
                      onChange={(e) => setEleveSearch(e.target.value)}
                      className="pl-9 h-10 rounded-2xl border border-terre/15 bg-creme/50"
                    />
                  </div>
                </div>

                <div>
                  <Label>Sélectionner l'élève à transférer</Label>
                  <select
                    className="w-full mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50 text-sm"
                    value={eleveId}
                    onChange={(e) => {
                      const id = e.target.value
                      setEleveId(id)
                      const student = elevesActifs.find((el) => el.id === id)
                      if (student && student.niveauActuel && student.niveauActuel !== "Non assigné") {
                        setNiveauDestination(student.niveauActuel)
                      } else {
                        setNiveauDestination("")
                      }
                    }}
                  >
                    <option value="">Sélectionner…</option>
                    {elevesActifs.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.prenom} {e.nom} ({e.identifiant}) — Niveau Actuel : {e.niveauActuel || e.classe}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <Label>École de destination</Label>
                    <div className="relative mt-1.5">
                      <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <select
                        value={ecoleDestination}
                        onChange={(e) => setEcoleDestination(e.target.value)}
                        className="w-full pl-9 h-10 rounded-2xl border border-terre/15 bg-creme/50"
                      >
                        <option value="">Sélectionner une école...</option>
                        {establishments
                          .filter((est) => est.id !== establishmentId)
                          .map((est) => (
                            <option key={est.id} value={est.name}>
                              {est.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <Label>Niveau demandé (Destination)</Label>
                    <select
                      value={niveauDestination}
                      onChange={(e) => setNiveauDestination(e.target.value)}
                      className="w-full h-10 mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                    >
                      <option value="">Sélectionner un niveau...</option>
                      {realGradeLevels.map((lvl) => (
                        <option key={lvl.id} value={lvl.name}>
                          {lvl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Motif du transfert</Label>
                <textarea
                  rows={3}
                  className="w-full mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50 resize-none"
                  placeholder="Ex. : déménagement de la famille"
                  value={motif}
                  onChange={(e) => setMotif(e.target.value)}
                />
              </div>
              <Button onClick={handleEnvoyer} className="w-full bg-terre hover:bg-terre-dark rounded-2xl">
                <Send className="h-4 w-4 mr-2" />
                Générer le dossier de transfert
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-jardin font-medium flex items-center gap-2">
                <Check className="h-5 w-5" /> Dossier prêt
              </p>
              <div className="rounded-2xl bg-creme p-4 border border-terre/10 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-pierre">Code</span>
                  <span className="font-mono font-bold">{dossierCree.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pierre">Élève</span>
                  <span className="font-medium">
                    {dossierCree.eleve.prenom} {dossierCree.eleve.nom}
                  </span>
                </div>
                {dossierCree.ecoleDestination && (
                  <div className="flex justify-between">
                    <span className="text-pierre">École destination</span>
                    <span>{dossierCree.ecoleDestination}</span>
                  </div>
                )}
                {dossierCree.niveauDestination && (
                  <div className="flex justify-between">
                    <span className="text-pierre">Niveau demandé</span>
                    <span>{dossierCree.niveauDestination}</span>
                  </div>
                )}
                <p className="text-xs text-pierre pt-2 border-t border-terre/10">
                  Identité, parents, niveau actuel — <strong>aucun paiement</strong> inclus.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() => {
                    navigator.clipboard.writeText(dossierCree.code)
                    toast.success("Code copié")
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copier le code
                </Button>
                <Button variant="outline" className="rounded-2xl" onClick={downloadJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Télécharger JSON
                </Button>
                <Button
                  className="rounded-2xl bg-terre"
                  onClick={() => {
                    setDossierCree(null)
                    setEleveId("")
                    setMotif("")
                  }}
                >
                  Autre transfert
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "recevoir" && (
        <div className="bg-papier rounded-3xl shadow-soft p-6 space-y-5">
          {!dossierRecu ? (
            <>
              <div className="flex gap-2">
                <Input
                  placeholder="Code de transfert (ex. ECO-12345-2026)"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="rounded-2xl"
                />
                <Button onClick={chargerParCode} className="bg-terre rounded-2xl shrink-0">
                  Charger
                </Button>
              </div>
              <div>
                <Label className="text-sm text-pierre">Ou importer un fichier JSON</Label>
                <Input type="file" accept=".json" onChange={handleImportFichier} className="mt-1.5" />
              </div>
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-creme p-5 border border-terre/10 space-y-3 text-sm">
                <h3 className="font-semibold text-encre">Examen du dossier</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-pierre">Nom</span>
                    <p className="font-medium">
                      {dossierRecu.eleve.prenom} {dossierRecu.eleve.nom}
                    </p>
                  </div>
                  <div>
                    <span className="text-pierre">Classe d'origine</span>
                    <p className="font-medium">{dossierRecu.eleve.classe}</p>
                  </div>
                  <div>
                    <span className="text-pierre">Parents</span>
                    <p className="font-medium">{dossierRecu.eleve.nomParent}</p>
                  </div>
                  <div>
                    <span className="text-pierre">Contact</span>
                    <p className="font-medium">{dossierRecu.eleve.contactParent}</p>
                  </div>
                  <div>
                    <span className="text-pierre">École d'origine</span>
                    <p className="font-medium">{dossierRecu.ecoleOrigine}</p>
                  </div>
                  <div>
                    <span className="text-pierre">Motif</span>
                    <p className="font-medium">{dossierRecu.motif}</p>
                  </div>
                </div>
                <p className="text-xs text-pierre pt-2 border-t border-terre/10">
                  Aucune information de paiement dans ce dossier.
                </p>
              </div>

              <div>
                <Label>Classe d'accueil</Label>
                <select
                  className="w-full mt-1.5 px-3 py-2.5 rounded-2xl border border-terre/15 bg-creme/50"
                  value={classeAccueil}
                  onChange={(e) => setClasseAccueil(e.target.value)}
                >
                  <option value="">Choisir…</option>
                  {classes.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleAccepter} className="bg-jardin hover:bg-jardin/90 text-white rounded-2xl">
                  <Check className="h-4 w-4 mr-2" />
                  Accepter et intégrer
                </Button>
                <Button variant="outline" onClick={handleRefuser} className="rounded-2xl text-rouge-terre border-rouge-terre/30">
                  <X className="h-4 w-4 mr-2" />
                  Refuser
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => {
                    setDossierRecu(null)
                    setCode("")
                  }}
                >
                  Annuler
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
