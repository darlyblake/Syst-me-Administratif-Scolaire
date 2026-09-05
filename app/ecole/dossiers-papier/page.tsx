"use client"

import { useMemo, useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"
import {
  ArrowLeft, FolderOpen, Search, Check, X, Archive, Package, Upload, Plus, Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuthentification } from "@/providers/authentification.provider"
import { useStudents } from "@/hooks/useStudents"
import { serviceEleves } from "@/services/eleves.service"
import { serviceDossiersPapier } from "@/services/dossiers-papier.service"
import type { DossierPapier, DonneesEleve } from "@/types/models"

export default function DossiersPapierPage() {
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

  const [refresh, setRefresh] = useState(0)
  const [search, setSearch] = useState("")
  const [filterStatut, setFilterStatut] = useState("")
  const [selected, setSelected] = useState<DossierPapier | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [uploadingPieceId, setUploadingPieceId] = useState<string | null>(null)
  const [showAddPiece, setShowAddPiece] = useState(false)
  const [newPieceName, setNewPieceName] = useState("")
  const [newPieceObligatoire, setNewPieceObligatoire] = useState(false)

  const eleves = useMemo(() => allStudents, [allStudents, refresh])
  const dossiers = useMemo(() => serviceDossiersPapier.obtenirTous(), [refresh])

  // Initialiser les dossiers au montage (côté client uniquement)
  useEffect(() => {
    setMounted(true)
  }, [])

  const handleInitializeAll = () => {
    setInitializing(true)
    const allEleves = serviceEleves.obtenirTousLesEleves()
    console.log(`Initialisation pour ${allEleves.length} élèves`)
    
    allEleves.forEach(eleve => {
      serviceDossiersPapier.creerPourEleve(eleve.id)
    })
    
    setRefresh(r => r + 1)
    setInitializing(false)
    toast.success(`${allEleves.length} dossiers créés/mis à jour`)
  }

  const elevesMap = useMemo(() => {
    const m = new Map<string, DonneesEleve>()
    eleves.forEach((e) => m.set(e.id, e))
    return m
  }, [eleves])

  const rows = useMemo(() => {
    return dossiers
      .map((d) => ({ dossier: d, eleve: elevesMap.get(d.eleveId) }))
      .filter((r) => r.eleve)
      .filter((r) => {
        const e = r.eleve!
        const q = search.toLowerCase()
        const matchQ =
          !q ||
          e.nom.toLowerCase().includes(q) ||
          e.prenom.toLowerCase().includes(q) ||
          e.identifiant?.toLowerCase().includes(q)
        const matchS = !filterStatut || r.dossier.statut === filterStatut
        return matchQ && matchS
      })
  }, [dossiers, elevesMap, search, filterStatut])

  const badge = (s: string) => {
    if (s === "complet") return "bg-jardin text-white"
    if (s === "incomplet") return "bg-soleil text-white"
    if (s === "emprunte") return "bg-ambre text-white"
    return "bg-pierre text-white"
  }

  const label = (s: string) =>
    ({ complet: "Complet", incomplet: "Incomplet", emprunte: "Emprunté", archive: "Archivé" }[s] || s)

  const reload = () => setRefresh((k) => k + 1)

  const togglePiece = (pieceId: string, presente: boolean) => {
    if (!selected) return
    serviceDossiersPapier.togglePiece(selected.id, pieceId, presente)
    const updated = serviceDossiersPapier.obtenirParId(selected.id)
    setSelected(updated)
    reload()
    toast.success(presente ? "Pièce marquée présente" : "Pièce marquée absente")
  }

  const handleUpload = (pieceId: string) => {
    if (!selected) return
    
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*,.pdf'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      
      setUploadingPieceId(pieceId)
      
      // Convertir le fichier en base64
      const reader = new FileReader()
      reader.onload = () => {
        const base64 = reader.result as string
        const success = serviceDossiersPapier.uploaderFichier(selected.id, pieceId, base64, file.name)
        
        if (success) {
          setSelected(serviceDossiersPapier.obtenirParId(selected.id))
          reload()
          toast.success(`Fichier ${file.name} uploadé`)
        } else {
          toast.error("Erreur lors de l'upload")
        }
        
        setUploadingPieceId(null)
      }
      reader.onerror = () => {
        toast.error("Erreur lors de la lecture du fichier")
        setUploadingPieceId(null)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  const handleDeleteFile = (pieceId: string) => {
    if (!selected) return
    if (!confirm("Supprimer ce fichier ?")) return
    
    const success = serviceDossiersPapier.supprimerFichier(selected.id, pieceId)
    if (success) {
      setSelected(serviceDossiersPapier.obtenirParId(selected.id))
      reload()
      toast.success("Fichier supprimé")
    } else {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleDeleteDossier = () => {
    if (!selected) return
    if (!confirm("Supprimer ce dossier papier définitivement ?")) return
    
    const success = serviceDossiersPapier.supprimerDossier(selected.id)
    if (success) {
      setSelected(null)
      reload()
      toast.success("Dossier supprimé")
    } else {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleAddPiece = () => {
    if (!selected || !newPieceName.trim()) return
    
    const success = serviceDossiersPapier.ajouterPiece(selected.id, newPieceName, newPieceObligatoire)
    if (success) {
      setSelected(serviceDossiersPapier.obtenirParId(selected.id))
      reload()
      setNewPieceName("")
      setNewPieceObligatoire(false)
      setShowAddPiece(false)
      toast.success("Pièce ajoutée")
    } else {
      toast.error("Erreur lors de l'ajout")
    }
  }

  const handleRemovePiece = (pieceId: string) => {
    if (!selected) return
    if (!confirm("Supprimer cette pièce du dossier ?")) return
    
    const success = serviceDossiersPapier.supprimerPiece(selected.id, pieceId)
    if (success) {
      setSelected(serviceDossiersPapier.obtenirParId(selected.id))
      reload()
      toast.success("Pièce supprimée")
    } else {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handleEmprunter = () => {
    if (!selected) return
    const qui = window.prompt("Emprunté par (nom) ?")
    if (!qui) return
    const motif = window.prompt("Motif ?") || "Consultation"
    const ok = serviceDossiersPapier.emprunter(selected.id, qui, motif)
    if (!ok) {
      toast.error("Dossier déjà emprunté ou introuvable")
      return
    }
    setSelected(serviceDossiersPapier.obtenirParId(selected.id))
    reload()
    toast.success("Dossier emprunté")
  }

  const handleRendre = () => {
    if (!selected) return
    serviceDossiersPapier.rendre(selected.id)
    setSelected(serviceDossiersPapier.obtenirParId(selected.id))
    reload()
    toast.success("Dossier rendu")
  }

  const handleArchiver = () => {
    if (!selected) return
    serviceDossiersPapier.archiver(selected.id)
    setSelected(serviceDossiersPapier.obtenirParId(selected.id))
    reload()
    toast.message("Dossier archivé")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-terre">Dossiers papier</h1>
        <Button 
          onClick={handleInitializeAll}
          disabled={initializing}
          className="rounded-xl bg-terre hover:bg-terre/90 text-white"
        >
          {initializing ? "Initialisation..." : "Initialiser tous les dossiers"}
        </Button>
      </div>
      
      {!mounted ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-pierre">Chargement...</p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-5 gap-6">
      {/* Liste */}
      <section className="lg:col-span-3 bg-papier rounded-3xl shadow-soft overflow-hidden">
          <div className="p-4 border-b border-terre/8 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pierre" />
              <Input
                placeholder="Nom, prénom, matricule…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 rounded-2xl border-terre/15 bg-creme/50"
              />
            </div>
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value)}
              className="px-3 py-2 rounded-xl border border-terre/15 bg-creme/50 text-sm"
            >
              <option value="">Tous les statuts</option>
              <option value="complet">Complet</option>
              <option value="incomplet">Incomplet</option>
              <option value="emprunte">Emprunté</option>
              <option value="archive">Archivé</option>
            </select>
          </div>

          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-papier">
                <tr className="text-left text-pierre border-b border-terre/8">
                  <th className="px-4 py-3 font-medium">Élève</th>
                  <th className="px-4 py-3 font-medium">Classe</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Manquantes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-terre/6">
                {rows.map(({ dossier, eleve }) => {
                  const manq = serviceDossiersPapier.piecesManquantes(dossier).length
                  return (
                    <tr
                      key={dossier.id}
                      onClick={() => setSelected(dossier)}
                      className={`cursor-pointer hover:bg-soleil-soft/40 transition ${
                        selected?.id === dossier.id ? "bg-terre-soft/50" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{eleve!.prenom} {eleve!.nom}</p>
                        <p className="text-xs text-pierre">{eleve!.identifiant}</p>
                      </td>
                      <td className="px-4 py-3 text-pierre">{eleve!.classe}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${badge(dossier.statut)}`}>
                          {label(dossier.statut)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular">
                        {manq > 0 ? (
                          <span className="text-soleil font-medium">{manq}</span>
                        ) : (
                          <span className="text-jardin">0</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <p className="text-center py-12 text-pierre">Aucun dossier papier</p>
            )}
          </div>
        </section>

      {/* Détail */}
      <section className="lg:col-span-2 bg-papier rounded-3xl shadow-soft p-5 min-h-[320px]">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-pierre text-sm">
            Sélectionnez un dossier
          </div>
        ) : (
          <div className="space-y-5">
            {(() => {
              const e = elevesMap.get(selected.eleveId)
              return (
                <>
                  <div>
                    <h2 className="font-semibold text-lg">
                      {e?.prenom} {e?.nom}
                    </h2>
                    <p className="text-sm text-pierre">
                      {e?.classe} · {e?.identifiant}
                    </p>
                    <span className={`inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium ${badge(selected.statut)}`}>
                      {label(selected.statut)}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">Pièces</p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowAddPiece(true)}
                        className="rounded-xl text-xs"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                    
                    {showAddPiece && (
                      <div className="mb-3 p-3 bg-creme rounded-xl space-y-2">
                        <Input
                          placeholder="Nom de la pièce"
                          value={newPieceName}
                          onChange={(e) => setNewPieceName(e.target.value)}
                          className="rounded-xl text-sm"
                        />
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={newPieceObligatoire}
                            onChange={(e) => setNewPieceObligatoire(e.target.checked)}
                          />
                          Pièce obligatoire
                        </label>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={handleAddPiece} className="rounded-xl">
                            Ajouter
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setShowAddPiece(false)} className="rounded-xl">
                            Annuler
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    <ul className="space-y-2">
                      {selected.pieces.map((p) => (
                        <li
                          key={p.id}
                          className={`flex items-center justify-between gap-2 text-sm rounded-xl px-3 py-2 ${
                            p.obligatoire && !p.presente 
                              ? "bg-rouge-soft/50 border border-rouge-terre/20" 
                              : "bg-creme/80"
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => togglePiece(p.id, !p.presente)}
                              className={`p-1.5 rounded-lg shrink-0 ${
                                p.presente ? "bg-jardin text-white" : "bg-rouge-terre text-white"
                              }`}
                            >
                              {p.presente ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                            </button>
                            <div className="min-w-0 flex-1">
                              <span className="block truncate">
                                {p.nom}
                                {p.obligatoire && (
                                  <span className="text-xs text-pierre ml-1">(oblig.)</span>
                                )}
                              </span>
                              {p.nomFichier && (
                                <span className="text-xs text-jardin block truncate">
                                  {p.nomFichier}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleRemovePiece(p.id)}
                              className="p-1.5 rounded-lg bg-pierre text-white hover:bg-pierre/90"
                              title="Supprimer la pièce"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                            {p.fichier ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteFile(p.id)}
                                className="p-1.5 rounded-lg bg-rouge-terre text-white hover:bg-rouge-terre/90"
                                title="Supprimer le fichier"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleUpload(p.id)}
                                disabled={uploadingPieceId === p.id}
                                className={`p-1.5 rounded-lg bg-terre text-white hover:bg-terre/90 ${
                                  uploadingPieceId === p.id ? "opacity-50" : ""
                                }`}
                                title="Téléverser un fichier"
                              >
                                {uploadingPieceId === p.id ? (
                                  <span className="h-4 w-4 animate-spin">⟳</span>
                                ) : (
                                  <Upload className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {serviceDossiersPapier.piecesManquantes(selected).length > 0 && (
                      <p className="mt-2 text-xs text-rouge-terre font-medium">
                        {serviceDossiersPapier.piecesManquantes(selected).length} pièce(s) obligatoire(s) manquante(s)
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium">Emplacement</label>
                    <Input
                      className="mt-1 rounded-2xl"
                      defaultValue={selected.emplacement || ""}
                      placeholder="Ex. Armoire A – Rangée 3"
                      onBlur={(ev) => {
                        serviceDossiersPapier.setEmplacement(selected.id, ev.target.value)
                        reload()
                      }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selected.statut !== "emprunte" && selected.statut !== "archive" && (
                      <Button size="sm" className="rounded-xl bg-ambre hover:bg-ambre/90 text-white" onClick={handleEmprunter}>
                        <Package className="h-4 w-4 mr-1" />
                        Emprunter
                      </Button>
                    )}
                    {selected.statut === "emprunte" && (
                      <Button size="sm" className="rounded-xl bg-jardin text-white" onClick={handleRendre}>
                        Rendre
                      </Button>
                    )}
                    {selected.statut !== "archive" && (
                      <Button size="sm" variant="outline" className="rounded-xl" onClick={handleArchiver}>
                        <Archive className="h-4 w-4 mr-1" />
                        Archiver
                      </Button>
                    )}
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="rounded-xl bg-rouge-terre text-white hover:bg-rouge-terre/90" 
                      onClick={handleDeleteDossier}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Supprimer
                    </Button>
                  </div>

                  {selected.emprunts.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">Historique emprunts</p>
                      <ul className="text-xs text-pierre space-y-1">
                        {selected.emprunts.slice().reverse().map((emp) => (
                          <li key={emp.id}>
                            {emp.empruntePar} — {emp.motif} —{" "}
                            {new Date(emp.dateSortie).toLocaleDateString("fr-FR")}
                            {emp.rendu ? " (rendu)" : " (en cours)"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
      </section>
      </div>
      )}
    </div>
  )
}
