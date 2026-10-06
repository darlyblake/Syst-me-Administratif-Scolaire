"use client"

import { useMemo, useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, FileText, Download, Printer, Trash2, Search, Calendar } from "lucide-react"
import Link from "next/link"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"
import { serviceDocuments } from "@/services/documents.service"
import { serviceEleves } from "@/services/eleves.service"
import type { Document } from "@/services/documents.service"

const TYPES_DOCUMENTS = [
  { value: "certificat_scolarite", label: "Certificat de scolarité" },
  { value: "attestation_assurance", label: "Attestation d'assurance" },
  { value: "recu_paiement", label: "Reçu de paiement" },
  { value: "convocation", label: "Convocation" },
  { value: "fiche_inscription", label: "Fiche d'inscription" },
  { value: "dossier_transfert", label: "Dossier de transfert" },
  { value: "bulletin", label: "Bulletin scolaire" }
] as const

export default function DocumentsPage() {
  const { utilisateur } = useAuthentification()
  const establishmentId = (utilisateur as { etablissementId?: string } | null)?.etablissementId
  const { data: supabaseStudents } = useStudents(establishmentId ?? null)

  const mappedSupabaseStudents = useMemo(() => {
    return (supabaseStudents ?? []).map((student) => ({
      id: student.id,
      identifiant: student.id.slice(0, 8).toUpperCase(),
      motDePasse: "",
      nom: student.last_name || "",
      prenom: student.first_name || "",
      dateNaissance: student.date_of_birth || "",
      lieuNaissance: student.place_of_birth || "",
      sexe: student.gender || "",
      classe: "",
      classeAncienne: "",
      nomParent: "",
      contactParent: "",
      adresse: "",
      dateInscription: student.created_at || "",
      statut: "actif" as const,
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
    }))
  }, [supabaseStudents])

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()

  const [documents, setDocuments] = useState<Document[]>([])
  const [eleves, setEleves] = useState<any[]>([])
  const [showGenerateModal, setShowGenerateModal] = useState(false)
  const [selectedEleve, setSelectedEleve] = useState<string>("")
  const [selectedType, setSelectedType] = useState<Document["type"]>("certificat_scolarite")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("tous")
  const [montantPaiement, setMontantPaiement] = useState("")
  const [motifPaiement, setMotifPaiement] = useState("")
  const [typeConvocation, setTypeConvocation] = useState("")
  const [dateConvocation, setDateConvocation] = useState("")
  const [heureConvocation, setHeureConvocation] = useState("")

  useEffect(() => {
    setDocuments(serviceDocuments.obtenirTousLesDocuments())
    setEleves(allStudents)
  }, [allStudents])

  const handleGenererDocument = () => {
    if (!selectedEleve) {
      alert("Veuillez sélectionner un élève")
      return
    }

    const eleve = eleves.find(e => e.id === selectedEleve)
    if (!eleve) {
      alert("Élève non trouvé")
      return
    }

    try {
      switch (selectedType) {
        case "certificat_scolarite":
          serviceDocuments.genererCertificatScolarite(selectedEleve, eleve)
          break
        case "attestation_assurance":
          serviceDocuments.genererAttestationAssurance(selectedEleve, eleve)
          break
        case "recu_paiement":
          if (!montantPaiement || !motifPaiement) {
            alert("Veuillez remplir le montant et le motif du paiement")
            return
          }
          serviceDocuments.genererRecuPaiement(selectedEleve, eleve, parseInt(montantPaiement), motifPaiement)
          break
        case "convocation":
          if (!typeConvocation || !dateConvocation || !heureConvocation) {
            alert("Veuillez remplir le type, la date et l'heure de la convocation")
            return
          }
          serviceDocuments.genererConvocation(selectedEleve, eleve, typeConvocation, dateConvocation, heureConvocation)
          break
        default:
          alert("Type de document non implémenté")
          return
      }

      setDocuments(serviceDocuments.obtenirTousLesDocuments())
      setShowGenerateModal(false)
      setSelectedEleve("")
      setMontantPaiement("")
      setMotifPaiement("")
      setTypeConvocation("")
      setDateConvocation("")
      setHeureConvocation("")
    } catch (error) {
      alert("Erreur lors de la génération du document")
    }
  }

  const handleImprimer = (document: Document) => {
    serviceDocuments.mettreAJourStatut(document.id, "imprime")
    setDocuments(serviceDocuments.obtenirTousLesDocuments())
    
    const printWindow = window.open("", "_blank")
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Document</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <pre>${document.contenu}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleTelecharger = (doc: Document) => {
    const blob = new Blob([doc.contenu], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${doc.type}_${doc.eleveId}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSupprimer = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir supprimer ce document ?")) {
      serviceDocuments.supprimerDocument(id)
      setDocuments(serviceDocuments.obtenirTousLesDocuments())
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchSearch = !searchTerm || 
      doc.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchType = filterType === "tous" || doc.type === filterType
    
    return matchSearch && matchType
  })

  const getEleveNom = (eleveId: string) => {
    const eleve = eleves.find(e => e.id === eleveId)
    return eleve ? `${eleve.prenom} ${eleve.nom}` : "Élève inconnu"
  }

  const getTypeLabel = (type: Document["type"]) => {
    return TYPES_DOCUMENTS.find(t => t.value === type)?.label || type
  }

  const statistiques = serviceDocuments.obtenirStatistiques()

  return (
    <div className="w-full min-w-0 text-[#131b2e]">
      <header className="border-b border-[#c5c5d3]/60 pb-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#00236f]" />
              <h1 className="text-[23px] font-semibold leading-7 tracking-tight">Génération de documents</h1>
            </div>
            <p className="mt-0.5 text-[12px] leading-4 text-[#515f74]">
              Création, suivi et impression des documents administratifs scolaires
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowGenerateModal(true)}
            className="h-8 rounded border border-[#00236f] bg-[#1e3a8a] px-3 text-[11px] font-medium hover:bg-[#00236f]"
          >
            <FileText className="mr-1.5 h-3.5 w-3.5" /> Générer un document
          </Button>
        </div>
      </header>

      <section className="mt-3 grid grid-cols-1 border border-[#c5c5d3]/50 bg-white sm:grid-cols-3">
        {[
          { label: "Total documents", value: statistiques.total, tone: "text-[#00236f] bg-[#dce1ff]" },
          { label: "Documents imprimés", value: statistiques.parStatut.imprime || 0, tone: "text-[#166534] bg-[#dcfce7]" },
          { label: "Documents générés", value: statistiques.parStatut.genere || 0, tone: "text-[#7a5600] bg-[#fff7dc]" },
        ].map((item, index) => (
          <div key={item.label} className={`flex min-h-[70px] items-center justify-between border-b border-[#c5c5d3]/45 p-3 sm:border-b-0 ${index < 2 ? "sm:border-r" : ""}`}>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[.04em] text-[#515f74]">{item.label}</p>
              <p className="mt-1 text-[21px] font-semibold tabular-nums">{item.value}</p>
            </div>
            <span className={`flex h-8 w-8 items-center justify-center ${item.tone}`}>
              <FileText className="h-4 w-4" />
            </span>
          </div>
        ))}
      </section>

      <section className="mt-3 overflow-hidden border border-[#c5c5d3]/45 bg-white">
        <div className="grid grid-cols-1 gap-2 bg-[#f2f3ff] p-2 md:grid-cols-[1fr_260px_auto]">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#515f74]" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un document ou un identifiant…"
              className="h-8 w-full rounded border border-[#c5c5d3]/70 bg-white pl-8 pr-2.5 text-[12px] outline-none focus:border-[#00236f]"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="h-8 rounded border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]"
          >
            <option value="tous">Tous les types</option>
            {TYPES_DOCUMENTS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </select>
          <div className="flex items-center justify-end px-1 text-[11px] text-[#515f74]">
            {filteredDocuments.length} document(s)
          </div>
        </div>

        <div className="border-t border-[#c5c5d3]/45">
          {filteredDocuments.length === 0 ? (
            <div className="px-3 py-12 text-center">
              <FileText className="mx-auto h-8 w-8 text-[#515f74]" strokeWidth={1.5} />
              <p className="mt-2 text-[13px] font-semibold">Aucun document généré</p>
              <p className="mt-1 text-[11px] text-[#515f74]">Les documents créés depuis cet espace apparaîtront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#c5c5d3]/35">
              {filteredDocuments.map((document) => (
                <article key={document.id} className="p-3 hover:bg-[#f7f8ff]">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#c5c5d3]/60 bg-[#f2f3ff] text-[#264191]">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold">{getTypeLabel(document.type)}</p>
                        <p className="mt-0.5 truncate text-[11px] text-[#515f74]">Élève : {getEleveNom(document.eleveId)}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                          <span className="inline-flex items-center gap-1 bg-[#f2f3ff] px-2 py-1 text-[#515f74]">
                            <Calendar className="h-3 w-3" /> {new Date(document.dateGeneration).toLocaleDateString("fr-FR")}
                          </span>
                          <span className={`px-2 py-1 ${document.statut === "imprime" ? "bg-[#dcfce7] text-[#166534]" : document.statut === "envoye" ? "bg-[#dce1ff] text-[#264191]" : "bg-[#f2f3ff] text-[#515f74]"}`}>
                            {document.statut}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => handleImprimer(document)} className="h-8 rounded text-[11px]">
                        <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimer
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTelecharger(document)} className="h-8 rounded text-[11px]">
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Télécharger
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleSupprimer(document.id)} className="h-8 w-8 rounded p-0 text-[#ba1a1a]" aria-label="Supprimer">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#131b2e]/45 p-3" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg overflow-hidden border border-[#c5c5d3] bg-white shadow-[0_12px_40px_rgba(19,27,46,.18)]">
            <div className="flex items-start justify-between border-b border-[#c5c5d3]/60 bg-[#f2f3ff] px-4 py-3">
              <div>
                <h2 className="text-[15px] font-semibold">Générer un document</h2>
                <p className="mt-0.5 text-[11px] text-[#515f74]">Sélectionnez le bénéficiaire et le type de document.</p>
              </div>
              <button type="button" onClick={() => setShowGenerateModal(false)} className="text-[20px] leading-none text-[#515f74] hover:text-[#131b2e]" aria-label="Fermer">×</button>
            </div>

            <div className="max-h-[calc(100dvh-10rem)] space-y-4 overflow-y-auto p-4">
              <div>
                <label htmlFor="eleve" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Élève <span className="text-[#ba1a1a]">*</span></label>
                <select id="eleve" value={selectedEleve} onChange={(e) => setSelectedEleve(e.target.value)} className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]">
                  <option value="">Sélectionner un élève</option>
                  {eleves.map((eleve) => <option key={eleve.id} value={eleve.id}>{eleve.prenom} {eleve.nom}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="type" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Type de document <span className="text-[#ba1a1a]">*</span></label>
                <select id="type" value={selectedType} onChange={(e) => setSelectedType(e.target.value as Document["type"])} className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]">
                  {TYPES_DOCUMENTS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>

              {selectedType === "recu_paiement" && (
                <div className="grid gap-3 border-t border-[#c5c5d3]/45 pt-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="montant" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Montant (FCFA) <span className="text-[#ba1a1a]">*</span></label>
                    <input id="montant" type="number" value={montantPaiement} onChange={(e) => setMontantPaiement(e.target.value)} placeholder="50000" className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]" />
                  </div>
                  <div>
                    <label htmlFor="motif" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Motif <span className="text-[#ba1a1a]">*</span></label>
                    <input id="motif" value={motifPaiement} onChange={(e) => setMotifPaiement(e.target.value)} placeholder="Frais d'inscription" className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]" />
                  </div>
                </div>
              )}

              {selectedType === "convocation" && (
                <div className="space-y-3 border-t border-[#c5c5d3]/45 pt-3">
                  <div>
                    <label htmlFor="typeConvocation" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Type de convocation <span className="text-[#ba1a1a]">*</span></label>
                    <input id="typeConvocation" value={typeConvocation} onChange={(e) => setTypeConvocation(e.target.value)} placeholder="Réunion parents-professeurs" className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="dateConvocation" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Date <span className="text-[#ba1a1a]">*</span></label>
                      <input id="dateConvocation" type="date" value={dateConvocation} onChange={(e) => setDateConvocation(e.target.value)} className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]" />
                    </div>
                    <div>
                      <label htmlFor="heureConvocation" className="mb-1.5 block text-[11px] font-medium text-[#515f74]">Heure <span className="text-[#ba1a1a]">*</span></label>
                      <input id="heureConvocation" type="time" value={heureConvocation} onChange={(e) => setHeureConvocation(e.target.value)} className="h-9 w-full border border-[#c5c5d3]/70 bg-white px-2.5 text-[12px] outline-none focus:border-[#00236f]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-[#c5c5d3]/60 bg-[#f2f3ff] px-4 py-3">
              <Button type="button" variant="outline" onClick={() => setShowGenerateModal(false)} className="h-8 rounded px-3 text-[11px]">Annuler</Button>
              <Button type="button" onClick={handleGenererDocument} className="h-8 rounded bg-[#1e3a8a] px-3 text-[11px] hover:bg-[#00236f]">Générer le document</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
