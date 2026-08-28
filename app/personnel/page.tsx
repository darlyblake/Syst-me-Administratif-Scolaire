"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Search, Trash2, Users, X } from "lucide-react"
import { servicePersonnel } from "@/services/personnel.service"
import type { DonneesPersonnel, FiltresPersonnel, StatistiquesPersonnel, StatutPersonnel, TypeContrat, ModeRemuneration } from "@/types/personnel"
import { ProtectionRoute } from "@/components/protection-route"

interface FormDataPersonnel {
  nom: string
  prenom: string
  poste: string
  typeContrat: TypeContrat
  modeRemuneration: ModeRemuneration
  salaireFixe: string
  tauxHoraire: string
  heuresPrevues: string
  telephone: string
  statut: StatutPersonnel
}

const FORMULAIRE_INITIAL: FormDataPersonnel = {
  nom: "",
  prenom: "",
  poste: "",
  typeContrat: "cdi",
  modeRemuneration: "fixe",
  salaireFixe: "",
  tauxHoraire: "",
  heuresPrevues: "",
  telephone: "",
  statut: "actif",
}

const FILTRES_INITIAUX: FiltresPersonnel = {
  recherche: "",
  poste: "",
  statut: "",
}

const libellesStatut: Record<StatutPersonnel, string> = {
  actif: "Actif",
  inactif: "Inactif",
  conge: "En congé",
  suspendu: "Suspendu",
}

const libellesContrat: Record<TypeContrat, string> = {
  cdi: "CDI",
  cdd: "CDD",
  vacataire: "Vacataire",
  consultant: "Consultant",
}

export default function PersonnelPage() {
  const [personnel, setPersonnel] = useState<DonneesPersonnel[]>([])
  const [statistiques, setStatistiques] = useState<StatistiquesPersonnel | null>(null)
  const [loading, setLoading] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [filtres, setFiltres] = useState<FiltresPersonnel>(FILTRES_INITIAUX)
  const [modalOuverte, setModalOuverte] = useState(false)
  const [formData, setFormData] = useState<FormDataPersonnel>(FORMULAIRE_INITIAL)
  const [enregistrement, setEnregistrement] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null)

  const chargerDonnees = () => {
    try {
      setLoading(true)
      setErreur(null)
      const donnees = servicePersonnel.obtenirToutLePersonnel()
      setPersonnel(donnees)
      setStatistiques(servicePersonnel.genererStatistiques())
    } catch {
      setErreur("Impossible de charger les données du personnel.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    chargerDonnees()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timeout = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const postesUniques = useMemo(
    () => Array.from(new Set(personnel.map((membre) => membre.poste).filter(Boolean))).sort(),
    [personnel],
  )

  const personnelFiltre = useMemo(() => {
    const recherche = filtres.recherche.trim().toLowerCase()

    return personnel.filter((membre) => {
      const correspondRecherche = !recherche || [membre.nom, membre.prenom, membre.poste, membre.telephone]
        .some((valeur) => valeur?.toLowerCase().includes(recherche))
      const correspondPoste = !filtres.poste || membre.poste === filtres.poste
      const correspondStatut = !filtres.statut || membre.statut === filtres.statut
      return correspondRecherche && correspondPoste && correspondStatut
    })
  }, [personnel, filtres])

  const reinitialiserFormulaire = () => setFormData(FORMULAIRE_INITIAL)

  const ouvrirAjout = () => {
    reinitialiserFormulaire()
    setModalOuverte(true)
  }

  const fermerAjout = () => {
    if (enregistrement) return
    setModalOuverte(false)
    reinitialiserFormulaire()
  }

  const mettreAJourChamp = <K extends keyof FormDataPersonnel>(champ: K, valeur: FormDataPersonnel[K]) => {
    setFormData((precedent) => ({ ...precedent, [champ]: valeur }))
  }

  const soumettreFormulaire = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setEnregistrement(true)

    try {
      const donnees = {
        nom: formData.nom.trim(),
        prenom: formData.prenom.trim(),
        poste: formData.poste.trim(),
        typeContrat: formData.typeContrat,
        modeRemuneration: formData.modeRemuneration,
        salaireFixe: formData.modeRemuneration === "fixe" ? Number(formData.salaireFixe) : undefined,
        tauxHoraire: formData.modeRemuneration === "horaire" ? Number(formData.tauxHoraire) : undefined,
        heuresPrevues: formData.modeRemuneration === "horaire" ? Number(formData.heuresPrevues) : undefined,
        telephone: formData.telephone.trim(),
        statut: formData.statut,
        dateEmbauche: new Date().toISOString().split("T")[0],
      }

      if (!donnees.nom || !donnees.prenom || !donnees.poste || !donnees.telephone) {
        setToast({ message: "Veuillez renseigner tous les champs obligatoires.", type: "error" })
        return
      }

      if (donnees.modeRemuneration === "fixe" && (!Number.isFinite(donnees.salaireFixe) || (donnees.salaireFixe ?? 0) < 0)) {
        setToast({ message: "Le salaire fixe doit être un montant valide.", type: "error" })
        return
      }

      if (donnees.modeRemuneration === "horaire" && ((!Number.isFinite(donnees.tauxHoraire) || (donnees.tauxHoraire ?? 0) < 0) || (!Number.isFinite(donnees.heuresPrevues) || (donnees.heuresPrevues ?? 0) < 0))) {
        setToast({ message: "Le taux horaire et le nombre d'heures doivent être valides.", type: "error" })
        return
      }

      servicePersonnel.ajouterPersonnel(donnees)
      chargerDonnees()
      setModalOuverte(false)
      reinitialiserFormulaire()
      setToast({ message: "Membre du personnel ajouté.", type: "success" })
    } catch {
      setToast({ message: "Impossible d'ajouter ce membre du personnel.", type: "error" })
    } finally {
      setEnregistrement(false)
    }
  }

  const supprimerPersonnel = (id: string) => {
    const membre = personnel.find((item) => item.id === id)
    if (!membre) return

    const confirme = window.confirm(
      `Supprimer ${membre.prenom} ${membre.nom} ? Cette action supprimera cet enregistrement du stockage local.`,
    )
    if (!confirme) return

    try {
      if (!servicePersonnel.supprimerPersonnel(id)) {
        setToast({ message: "Le membre n'a pas pu être supprimé.", type: "error" })
        return
      }
      chargerDonnees()
      setToast({ message: "Membre du personnel supprimé.", type: "success" })
    } catch {
      setToast({ message: "Impossible de supprimer ce membre.", type: "error" })
    }
  }

  const formaterMontant = (membre: DonneesPersonnel) => {
    if (membre.modeRemuneration === "fixe" && membre.salaireFixe !== undefined) {
      return `${membre.salaireFixe.toLocaleString("fr-FR")} FCFA/mois`
    }
    if (membre.modeRemuneration === "horaire" && membre.tauxHoraire !== undefined) {
      return `${membre.tauxHoraire.toLocaleString("fr-FR")} FCFA/h`
    }
    return "—"
  }

  const aDesFiltres = Boolean(filtres.recherche || filtres.poste || filtres.statut)

  return (
    <ProtectionRoute>
      <main className="min-h-screen bg-background">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <header className="flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Administration</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">Personnel</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Gérez les membres du personnel administratif et technique de l'établissement.
              </p>
            </div>
            <Button onClick={ouvrirAjout} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un membre
            </Button>
          </header>

          {statistiques && (
            <section aria-label="Résumé du personnel" className="border-b py-4">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                <span><strong className="font-semibold">{statistiques.totalPersonnel}</strong> membre{statistiques.totalPersonnel > 1 ? "s" : ""}</span>
                <span className="text-muted-foreground"><strong className="font-semibold text-foreground">{statistiques.parStatut.actif}</strong> actif{statistiques.parStatut.actif > 1 ? "s" : ""}</span>
                <span className="text-muted-foreground"><strong className="font-semibold text-foreground">{statistiques.parTypeContrat.cdi}</strong> en CDI</span>
                <span className="text-muted-foreground"><strong className="font-semibold text-foreground">{statistiques.masseSalarialeTotale.toLocaleString("fr-FR")} FCFA</strong> de masse salariale estimée</span>
              </div>
            </section>
          )}

          <section className="py-5" aria-label="Recherche et filtres">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Rechercher dans le personnel"
                  placeholder="Rechercher par nom, poste ou téléphone"
                  value={filtres.recherche}
                  onChange={(event) => setFiltres((precedent) => ({ ...precedent, recherche: event.target.value }))}
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex">
                <Select
                  value={filtres.poste || "tous"}
                  onValueChange={(value) => setFiltres((precedent) => ({ ...precedent, poste: value === "tous" ? "" : value }))}
                >
                  <SelectTrigger className="w-full lg:w-52">
                    <SelectValue placeholder="Tous les postes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les postes</SelectItem>
                    {postesUniques.map((poste) => <SelectItem key={poste} value={poste}>{poste}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={filtres.statut || "tous"}
                  onValueChange={(value) => setFiltres((precedent) => ({ ...precedent, statut: value === "tous" ? "" : value as StatutPersonnel }))}
                >
                  <SelectTrigger className="w-full lg:w-44">
                    <SelectValue placeholder="Tous les statuts" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tous">Tous les statuts</SelectItem>
                    <SelectItem value="actif">Actif</SelectItem>
                    <SelectItem value="inactif">Inactif</SelectItem>
                    <SelectItem value="conge">En congé</SelectItem>
                    <SelectItem value="suspendu">Suspendu</SelectItem>
                  </SelectContent>
                </Select>
                {aDesFiltres && (
                  <Button variant="ghost" onClick={() => setFiltres(FILTRES_INITIAUX)} className="w-full sm:col-span-2 lg:w-auto">
                    <X className="mr-2 h-4 w-4" />
                    Réinitialiser
                  </Button>
                )}
              </div>
            </div>
          </section>

          <section className="overflow-hidden rounded-md border" aria-label="Liste du personnel">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold">Membres du personnel</h2>
                <p className="text-xs text-muted-foreground">
                  {loading ? "Chargement…" : `${personnelFiltre.length} résultat${personnelFiltre.length > 1 ? "s" : ""}`}
                </p>
              </div>
            </div>

            {erreur ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-destructive">{erreur}</p>
                <Button variant="outline" size="sm" onClick={chargerDonnees} className="mt-3">Réessayer</Button>
              </div>
            ) : loading ? (
              <div className="px-4 py-10 text-center text-sm text-muted-foreground" role="status">Chargement du personnel…</div>
            ) : personnelFiltre.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Users className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="mt-3 text-sm font-medium">{aDesFiltres ? "Aucun résultat" : "Aucun membre du personnel"}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {aDesFiltres ? "Modifiez vos critères de recherche." : "Commencez par ajouter le premier membre."}
                </p>
                <Button variant="outline" size="sm" onClick={aDesFiltres ? () => setFiltres(FILTRES_INITIAUX) : ouvrirAjout} className="mt-4">
                  {aDesFiltres ? "Effacer les filtres" : "Ajouter un membre"}
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <caption className="sr-only">Liste des membres du personnel</caption>
                  <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Nom et prénom</th>
                      <th scope="col" className="px-4 py-3 font-medium">Poste</th>
                      <th scope="col" className="px-4 py-3 font-medium">Contrat</th>
                      <th scope="col" className="px-4 py-3 font-medium">Rémunération</th>
                      <th scope="col" className="px-4 py-3 font-medium">Téléphone</th>
                      <th scope="col" className="px-4 py-3 font-medium">Statut</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {personnelFiltre.map((membre) => (
                      <tr key={membre.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{membre.prenom} {membre.nom}</td>
                        <td className="px-4 py-3 text-muted-foreground">{membre.poste}</td>
                        <td className="px-4 py-3"><Badge variant="outline">{libellesContrat[membre.typeContrat]}</Badge></td>
                        <td className="px-4 py-3">{formaterMontant(membre)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{membre.telephone || "—"}</td>
                        <td className="px-4 py-3"><Badge variant={membre.statut === "actif" ? "default" : "secondary"}>{libellesStatut[membre.statut]}</Badge></td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Supprimer ${membre.prenom} ${membre.nom}`}
                            title="Supprimer"
                            onClick={() => supprimerPersonnel(membre.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <Dialog open={modalOuverte} onOpenChange={(open) => open ? setModalOuverte(true) : fermerAjout()}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Ajouter un membre du personnel</DialogTitle>
              <DialogDescription>Renseignez les informations professionnelles nécessaires à la gestion du personnel.</DialogDescription>
            </DialogHeader>

            <form onSubmit={soumettreFormulaire} className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label htmlFor="nom">Nom *</Label><Input id="nom" value={formData.nom} onChange={(e) => mettreAJourChamp("nom", e.target.value)} required /></div>
                <div className="space-y-2"><Label htmlFor="prenom">Prénom *</Label><Input id="prenom" value={formData.prenom} onChange={(e) => mettreAJourChamp("prenom", e.target.value)} required /></div>
              </div>

              <div className="space-y-2"><Label htmlFor="poste">Poste / fonction *</Label><Input id="poste" value={formData.poste} onChange={(e) => mettreAJourChamp("poste", e.target.value)} placeholder="Ex. Secrétaire, comptable, surveillant" required /></div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Type de contrat *</Label><Select value={formData.typeContrat} onValueChange={(value) => mettreAJourChamp("typeContrat", value as TypeContrat)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cdi">CDI</SelectItem><SelectItem value="cdd">CDD</SelectItem><SelectItem value="vacataire">Vacataire</SelectItem><SelectItem value="consultant">Consultant</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Statut *</Label><Select value={formData.statut} onValueChange={(value) => mettreAJourChamp("statut", value as StatutPersonnel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="actif">Actif</SelectItem><SelectItem value="inactif">Inactif</SelectItem><SelectItem value="conge">En congé</SelectItem><SelectItem value="suspendu">Suspendu</SelectItem></SelectContent></Select></div>
              </div>

              <div className="space-y-2"><Label>Mode de rémunération *</Label><Select value={formData.modeRemuneration} onValueChange={(value) => mettreAJourChamp("modeRemuneration", value as ModeRemuneration)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixe">Salaire fixe mensuel</SelectItem><SelectItem value="horaire">Paiement horaire</SelectItem></SelectContent></Select></div>

              {formData.modeRemuneration === "fixe" ? (
                <div className="space-y-2"><Label htmlFor="salaireFixe">Salaire mensuel (FCFA) *</Label><Input id="salaireFixe" type="number" min="0" value={formData.salaireFixe} onChange={(e) => mettreAJourChamp("salaireFixe", e.target.value)} required /></div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="tauxHoraire">Taux horaire (FCFA) *</Label><Input id="tauxHoraire" type="number" min="0" value={formData.tauxHoraire} onChange={(e) => mettreAJourChamp("tauxHoraire", e.target.value)} required /></div>
                  <div className="space-y-2"><Label htmlFor="heuresPrevues">Heures prévues / mois *</Label><Input id="heuresPrevues" type="number" min="0" value={formData.heuresPrevues} onChange={(e) => mettreAJourChamp("heuresPrevues", e.target.value)} required /></div>
                </div>
              )}

              <div className="space-y-2"><Label htmlFor="telephone">Téléphone *</Label><Input id="telephone" type="tel" value={formData.telephone} onChange={(e) => mettreAJourChamp("telephone", e.target.value)} placeholder="Ex. 07 00 00 00 00" required /></div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={fermerAjout} disabled={enregistrement}>Annuler</Button>
                <Button type="submit" disabled={enregistrement}>{enregistrement ? "Enregistrement…" : "Ajouter le membre"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {toast && (
          <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border bg-background px-4 py-3 text-sm shadow-lg">
            <div className="flex items-center gap-3">
              <span>{toast.message}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label="Fermer" onClick={() => setToast(null)}><X className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </main>
    </ProtectionRoute>
  )
}
