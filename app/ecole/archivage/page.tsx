"use client"

import { useMemo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Archive, Download, Search, Calendar, RotateCcw, X } from "lucide-react"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"
import { serviceArchivage } from "@/services/archivage.service"
import { serviceEleves } from "@/services/eleves.service"
import type { EleveArchive } from "@/services/archivage.service"

export default function ArchivagePage() {
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
      informationsContact: { telephone: student.phone || "", email: student.email || "", adresse: "" },
      modePaiement: "mensuel" as const,
      optionsSupplementaires: { tenueScolaire: false, carteScolaire: false, cooperative: false, tenueEPS: false, assurance: false },
      fraisOptionsSupplementaires: { tenueScolaire: 0, carteScolaire: 0, cooperative: 0, tenueEPS: 0, assurance: 0 },
      moisPaiement: [],
      optionsPersonnalisees: [],
    }))
  }, [supabaseStudents])

  const allStudents = mappedSupabaseStudents.length > 0 ? mappedSupabaseStudents : serviceEleves.obtenirTousLesEleves()
  const [archives, setArchives] = useState<EleveArchive[]>([])
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [selectedEleve, setSelectedEleve] = useState("")
  const [motifArchivage, setMotifArchivage] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterAnnee, setFilterAnnee] = useState("tous")
  const [elevesActifs, setElevesActifs] = useState<any[]>([])

  useEffect(() => {
    setArchives(serviceArchivage.obtenirTousLesArchives())
    setElevesActifs(allStudents.filter((e) => e.statut === "actif"))
  }, [allStudents])

  const handleArchiverEleve = () => {
    if (!selectedEleve || !motifArchivage) {
      alert("Veuillez sélectionner un élève et un motif d'archivage")
      return
    }
    const eleve = elevesActifs.find(e => e.id === selectedEleve)
    if (!eleve) {
      alert("Élève non trouvé")
      return
    }
    if (confirm(`Êtes-vous sûr de vouloir archiver ${eleve.prenom} ${eleve.nom} ?`)) {
      serviceArchivage.archiverEleve(eleve, motifArchivage)
      serviceEleves.mettreAJourStatut(selectedEleve, "archive")
      setArchives(serviceArchivage.obtenirTousLesArchives())
      setElevesActifs(allStudents.filter((e) => e.statut === "actif"))
      setShowArchiveModal(false)
      setSelectedEleve("")
      setMotifArchivage("")
    }
  }

  const handleDesarchiver = (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir désarchiver cet élève ?")) {
      serviceArchivage.desarchiverEleve(id)
      serviceEleves.mettreAJourStatut(id, "actif")
      setArchives(serviceArchivage.obtenirTousLesArchives())
      setElevesActifs(allStudents.filter((e) => e.statut === "actif"))
    }
  }

  const handleExporter = (id: string) => {
    const donnees = serviceArchivage.exporterDonneesEleve(id)
    if (donnees) {
      const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `archive-${id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const filteredArchives = archives.filter((archive) => {
    const query = searchTerm.toLowerCase()
    const matchSearch = !query || archive.nom.toLowerCase().includes(query) || archive.prenom.toLowerCase().includes(query)
    const matchAnnee = filterAnnee === "tous" || archive.anneeScolaire === filterAnnee
    return matchSearch && matchAnnee
  })

  const anneesDisponibles = Array.from(new Set(archives.map(a => a.anneeScolaire))).sort()
  const statistiques = serviceArchivage.obtenirStatistiques()

  return (
    <div className="min-h-screen bg-white text-[#131b2e]">
      <div className="mx-auto max-w-[1400px] px-5 py-6 md:px-8">
        <header className="border-b border-[#c5c5d3]/60 pb-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#64748b]">Scolarité / Dossiers élèves</p>
              <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Archivage des élèves</h1>
              <p className="mt-1 text-sm text-[#64748b]">Conservation et gestion administrative des dossiers des élèves ayant quitté l'établissement.</p>
            </div>
            <Button onClick={() => setShowArchiveModal(true)} className="h-10 rounded-md bg-[#1e3a8a] px-4 text-sm font-medium text-white hover:bg-[#172f70]">
              <Archive className="mr-2 h-4 w-4" />
              Archiver un élève
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 border-b border-[#c5c5d3]/60 py-5 md:grid-cols-3">
          <div className="border-l-2 border-[#1e3a8a] bg-[#f2f3ff] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Total archivés</p>
            <p className="mt-1 text-2xl font-semibold">{statistiques.total}</p>
          </div>
          <div className="border-l-2 border-[#64748b] bg-[#f7f8fa] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Années scolaires</p>
            <p className="mt-1 text-2xl font-semibold">{Object.keys(statistiques.parAnnee).length}</p>
          </div>
          <div className="border-l-2 border-[#16803c] bg-[#f0fdf4] px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-[#64748b]">Élèves actifs</p>
            <p className="mt-1 text-2xl font-semibold">{elevesActifs.length}</p>
          </div>
        </section>

        <section className="border-b border-[#c5c5d3]/60 py-5">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" />
              <Input
                placeholder="Rechercher par nom ou prénom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-10 rounded-md border-[#c5c5d3] bg-white pl-9 text-sm shadow-none focus-visible:ring-1 focus-visible:ring-[#1e3a8a]"
              />
            </div>
            <Select value={filterAnnee} onValueChange={setFilterAnnee}>
              <SelectTrigger className="h-10 w-full rounded-md border-[#c5c5d3] bg-white text-sm shadow-none lg:w-56">
                <SelectValue placeholder="Toutes les années" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les années</SelectItem>
                {anneesDisponibles.map((annee) => <SelectItem key={annee} value={annee}>{annee}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="mt-6 border border-[#c5c5d3]/60">
          <div className="flex items-center justify-between border-b border-[#c5c5d3]/60 bg-[#f7f8fa] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold">Dossiers archivés</h2>
              <p className="mt-0.5 text-xs text-[#64748b]">{filteredArchives.length} dossier(s) correspondant aux filtres</p>
            </div>
            <Archive className="h-4 w-4 text-[#64748b]" />
          </div>

          {filteredArchives.length === 0 ? (
            <div className="px-4 py-14 text-center">
              <Archive className="mx-auto h-8 w-8 text-[#94a3b8]" />
              <p className="mt-3 text-sm font-medium text-[#515f74]">Aucun élève archivé</p>
              <p className="mt-1 text-xs text-[#94a3b8]">Les dossiers archivés apparaîtront ici.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#e2e4ea]">
              {filteredArchives.map((archive) => (
                <div key={archive.id} className="flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-[#fafbfc] lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border border-[#c5c5d3]/60 bg-[#f2f3ff] text-[#1e3a8a]">
                        <Archive className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{archive.prenom} {archive.nom}</p>
                        <p className="mt-1 text-xs text-[#64748b]">Dernière classe : {archive.classeDerniere || "Non renseignée"}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="inline-flex items-center gap-1 border border-[#c5c5d3]/60 bg-white px-2 py-1 text-[#515f74]">
                            <Calendar className="h-3 w-3" />{archive.anneeScolaire}
                          </span>
                          <span className="border border-[#fecaca] bg-[#fff5f5] px-2 py-1 text-[#b42318]">{archive.motifArchivage}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                    <p className="text-xs text-[#64748b]">Archivé le {new Date(archive.dateArchivage).toLocaleDateString()}</p>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleExporter(archive.id)} className="h-9 rounded-md border-[#c5c5d3] bg-white text-xs shadow-none">
                        <Download className="mr-1.5 h-3.5 w-3.5" />Exporter
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDesarchiver(archive.id)} className="h-9 rounded-md border-[#c5c5d3] bg-white text-xs shadow-none">
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" />Désarchiver
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111827]/45 px-4">
          <div className="w-full max-w-lg border border-[#c5c5d3] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#c5c5d3]/60 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">Archiver un élève</h3>
                <p className="mt-0.5 text-xs text-[#64748b]">Déplacer le dossier vers les archives administratives.</p>
              </div>
              <button type="button" onClick={() => setShowArchiveModal(false)} className="p-1 text-[#64748b] hover:bg-[#f2f3f6] hover:text-[#131b2e]" aria-label="Fermer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-5 py-5">
              <div className="space-y-2">
                <Label htmlFor="eleve" className="text-xs font-medium text-[#515f74]">Élève <span className="text-[#b42318]">*</span></Label>
                <Select value={selectedEleve} onValueChange={setSelectedEleve}>
                  <SelectTrigger id="eleve" className="h-10 rounded-md border-[#c5c5d3] bg-white text-sm shadow-none">
                    <SelectValue placeholder="Sélectionner un élève" />
                  </SelectTrigger>
                  <SelectContent>
                    {elevesActifs.map((eleve) => <SelectItem key={eleve.id} value={eleve.id}>{eleve.prenom} {eleve.nom}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="motif" className="text-xs font-medium text-[#515f74]">Motif d'archivage <span className="text-[#b42318]">*</span></Label>
                <Select value={motifArchivage} onValueChange={setMotifArchivage}>
                  <SelectTrigger id="motif" className="h-10 rounded-md border-[#c5c5d3] bg-white text-sm shadow-none">
                    <SelectValue placeholder="Sélectionner le motif" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="diplome">Obtention du diplôme</SelectItem>
                    <SelectItem value="transfert">Transfert vers une autre école</SelectItem>
                    <SelectItem value="abandon">Abandon scolaire</SelectItem>
                    <SelectItem value="autre">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#c5c5d3]/60 bg-[#f7f8fa] px-5 py-4">
              <Button variant="outline" onClick={() => setShowArchiveModal(false)} className="h-9 rounded-md border-[#c5c5d3] bg-white px-4 text-sm shadow-none">Annuler</Button>
              <Button onClick={handleArchiverEleve} className="h-9 rounded-md bg-[#1e3a8a] px-4 text-sm text-white hover:bg-[#172f70]">Archiver</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
