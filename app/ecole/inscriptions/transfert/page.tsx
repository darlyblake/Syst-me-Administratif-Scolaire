"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowRightLeft,
  Upload,
  Download,
  Search,
  CheckCircle2,
  XCircle,
  FileText,
  User,
  School,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { serviceEleves } from "@/services/eleves.service"
import { serviceParametres } from "@/services/parametres.service"
import { serviceTransfert } from "@/services/transfert.service"
import type { DonneesEleve, DossierTransfert, TransfertEnAttente } from "@/types/models"

export default function TransfertPage() {
  const [tab, setTab] = useState<"envoyer" | "recevoir">("envoyer")
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedEleve, setSelectedEleve] = useState<DonneesEleve | null>(null)
  const [motif, setMotif] = useState("")
  const [dossierGenere, setDossierGenere] = useState<DossierTransfert | null>(null)

  // Réception
  const [codeOuFichier, setCodeOuFichier] = useState("")
  const [dossierRecu, setDossierRecu] = useState<DossierTransfert | null>(null)
  const [classeChoisie, setClasseChoisie] = useState("")
  const [motifRefus, setMotifRefus] = useState("")
  const [etapeReception, setEtapeReception] = useState<"saisie" | "examen" | "termine">("saisie")

  const [eleves, setEleves] = useState<DonneesEleve[]>([])
  const [transfertsEntrants, setTransfertsEntrants] = useState<TransfertEnAttente[]>([])
  const [transfertsSortants, setTransfertsSortants] = useState<TransfertEnAttente[]>([])

  const classes = serviceParametres.obtenirTarification?.()?.map((t: any) => t.classe) || []

  useEffect(() => {
    setEleves(serviceEleves.obtenirTousLesEleves().filter((e) => e.statut === "actif"))
    setTransfertsEntrants(serviceTransfert.obtenirTransfertsEntrants())
    setTransfertsSortants(serviceTransfert.obtenirTransfertsSortants())
  }, [])

  const elevesFiltres = eleves.filter(
    (e) =>
      !searchTerm ||
      e.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.identifiant?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ===== ENVOI =====
  const handleGenererTransfert = () => {
    if (!selectedEleve) return
    try {
      const { dossier } = serviceTransfert.envoyerTransfert(selectedEleve.id, motif || undefined)
      setDossierGenere(dossier)
      setEleves((prev) => prev.filter((e) => e.id !== selectedEleve.id))
      setTransfertsSortants(serviceTransfert.obtenirTransfertsSortants())
      toast.success("Dossier de transfert généré", {
        description: `Code : ${dossier.codeTransfert}`,
      })
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération")
    }
  }

  const telechargerDossier = () => {
    if (!dossierGenere) return
    const blob = new Blob([JSON.stringify(dossierGenere, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transfert_${dossierGenere.nom}_${dossierGenere.prenom}_${dossierGenere.codeTransfert}.json` 
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Fichier téléchargé")
  }

  // ===== RÉCEPTION =====
  const handleImporter = () => {
    try {
      let dossier: DossierTransfert

      // Si c'est un JSON collé
      if (codeOuFichier.trim().startsWith("{")) {
        dossier = JSON.parse(codeOuFichier)
      } else {
        // Pour l'instant on simule : en vrai on pourrait avoir un endpoint
        // Ici on cherche d'abord dans les transferts sortants locaux (démo mono-navigateur)
        const local = serviceTransfert.trouverParCode(codeOuFichier.trim())
        if (local) {
          dossier = local.dossier
        } else {
          toast.error("Code ou fichier invalide")
          return
        }
      }

      if (!dossier.codeTransfert || !dossier.nom || !dossier.prenom) {
        toast.error("Dossier incomplet")
        return
      }

      serviceTransfert.importerDossier(dossier)
      setDossierRecu(dossier)
      setEtapeReception("examen")
      setTransfertsEntrants(serviceTransfert.obtenirTransfertsEntrants())
      toast.success("Dossier chargé – vous pouvez l'examiner")
    } catch {
      toast.error("Impossible de lire le dossier")
    }
  }

  const handleImportFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const dossier = JSON.parse(ev.target?.result as string)
        setCodeOuFichier(JSON.stringify(dossier, null, 2))
        serviceTransfert.importerDossier(dossier)
        setDossierRecu(dossier)
        setEtapeReception("examen")
        toast.success("Fichier importé")
      } catch {
        toast.error("Fichier JSON invalide")
      }
    }
    reader.readAsText(file)
  }

  const handleAccepter = () => {
    if (!dossierRecu || !classeChoisie) {
      toast.error("Choisissez une classe")
      return
    }
    try {
      const eleve = serviceTransfert.accepterTransfert(dossierRecu.codeTransfert, classeChoisie)
      setEtapeReception("termine")
      toast.success("Élève accepté et inscrit", {
        description: `${eleve.prenom} ${eleve.nom} → ${classeChoisie}`,
      })
      setTransfertsEntrants(serviceTransfert.obtenirTransfertsEntrants())
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRefuser = () => {
    if (!dossierRecu) return
    try {
      serviceTransfert.refuserTransfert(dossierRecu.codeTransfert, motifRefus)
      setEtapeReception("termine")
      toast.info("Transfert refusé")
      setTransfertsEntrants(serviceTransfert.obtenirTransfertsEntrants())
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/inscriptions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
              Transfert d'élèves
            </h1>
            <p className="text-muted-foreground">
              Transférer un élève vers un autre établissement ou recevoir un élève
            </p>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="envoyer">Envoyer un élève</TabsTrigger>
            <TabsTrigger value="recevoir">Recevoir un élève</TabsTrigger>
          </TabsList>

          {/* ========== ONGLET ENVOYER ========== */}
          <TabsContent value="envoyer" className="space-y-6 mt-6">
            {!dossierGenere ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>1. Choisir l'élève à transférer</CardTitle>
                    <CardDescription>
                      Seuls les élèves actifs sont listés. Le dossier envoyé ne contient aucune information de paiement.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Rechercher un élève..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 border rounded-lg p-2">
                      {elevesFiltres.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">Aucun élève trouvé</p>
                      ) : (
                        elevesFiltres.map((eleve) => (
                          <div
                            key={eleve.id}
                            onClick={() => setSelectedEleve(eleve)}
                            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedEleve?.id === eleve.id
                                ? "border-primary bg-primary/5"
                                : "hover:bg-muted/50"
                            }`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="font-medium">
                                  {eleve.prenom} {eleve.nom}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {eleve.classe} · {eleve.identifiant}
                                </p>
                              </div>
                              {selectedEleve?.id === eleve.id && (
                                <CheckCircle2 className="h-5 w-5 text-primary" />
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {selectedEleve && (
                  <Card>
                    <CardHeader>
                      <CardTitle>2. Motif du transfert (optionnel)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        placeholder="Ex: Déménagement de la famille, rapprochement géographique..."
                        value={motif}
                        onChange={(e) => setMotif(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={handleGenererTransfert} size="lg" className="w-full">
                        Générer le dossier de transfert
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-400 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5" />
                    Dossier de transfert prêt
                  </CardTitle>
                  <CardDescription>
                    Donnez ce code ou ce fichier à l'établissement destinataire.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-background rounded-lg border font-mono text-lg text-center tracking-wider">
                    {dossierGenere.codeTransfert}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={telechargerDossier} className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger le fichier JSON
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(dossierGenere.codeTransfert)
                        toast.success("Code copié")
                      }}
                    >
                      Copier le code
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setDossierGenere(null)
                      setSelectedEleve(null)
                      setMotif("")
                    }}
                  >
                    Faire un autre transfert
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ========== ONGLET RECEVOIR ========== */}
          <TabsContent value="recevoir" className="space-y-6 mt-6">
            {etapeReception === "saisie" && (
              <Card>
                <CardHeader>
                  <CardTitle>Recevoir un élève</CardTitle>
                  <CardDescription>
                    Collez le code de transfert ou importez le fichier JSON reçu de l'autre établissement.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Code de transfert ou JSON</Label>
                    <Textarea
                      placeholder="TRF-48291-2026  ou  collez le contenu du fichier JSON"
                      value={codeOuFichier}
                      onChange={(e) => setCodeOuFichier(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">ou</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="file" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Importer un fichier JSON</p>
                        <p className="text-xs text-muted-foreground mt-1">.json uniquement</p>
                      </div>
                      <Input
                        id="file"
                        type="file"
                        accept=".json"
                        className="hidden"
                        onChange={handleImportFichier}
                      />
                    </Label>
                  </div>

                  <Button onClick={handleImporter} className="w-full" size="lg">
                    Charger le dossier
                  </Button>
                </CardContent>
              </Card>
            )}

            {etapeReception === "examen" && dossierRecu && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Examen du dossier
                  </CardTitle>
                  <CardDescription>
                    Vérifiez les informations avant d'accepter ou de refuser le transfert.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Identité */}
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <User className="h-4 w-4" /> Identité de l'élève
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nom complet</span>
                        <p className="font-medium">
                          {dossierRecu.prenom} {dossierRecu.nom}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Date de naissance</span>
                        <p className="font-medium">
                          {new Date(dossierRecu.dateNaissance).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lieu de naissance</span>
                        <p className="font-medium">{dossierRecu.lieuNaissance}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sexe</span>
                        <p className="font-medium">{dossierRecu.sexe === "M" ? "Masculin" : "Féminin"}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Classe précédente</span>
                        <p className="font-medium">{dossierRecu.classePrecedente}</p>
                      </div>
                    </div>
                  </div>

                  {/* École d'origine */}
                  <div>
                    <h3 className="font-semibold flex items-center gap-2 mb-3">
                      <School className="h-4 w-4" /> École d'origine
                    </h3>
                    <div className="text-sm space-y-1">
                      <p className="font-medium">{dossierRecu.ecoleOriginale.nom}</p>
                      {dossierRecu.ecoleOriginale.telephone && (
                        <p className="text-muted-foreground">{dossierRecu.ecoleOriginale.telephone}</p>
                      )}
                      {dossierRecu.motif && (
                        <p className="text-muted-foreground italic">Motif : {dossierRecu.motif}</p>
                      )}
                    </div>
                  </div>

                  {/* Parents */}
                  <div>
                    <h3 className="font-semibold mb-3">Responsable légal</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Nom</span>
                        <p className="font-medium">{dossierRecu.nomParent}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Téléphone</span>
                        <p className="font-medium">{dossierRecu.contactParent}</p>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Adresse</span>
                        <p className="font-medium">{dossierRecu.adresse}</p>
                      </div>
                    </div>
                  </div>

                  {/* Choix de la classe */}
                  <div className="pt-4 border-t">
                    <Label className="mb-2 block">Classe d'affectation *</Label>
                    <Select value={classeChoisie} onValueChange={setClasseChoisie}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir la classe" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((c: string) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button
                      onClick={handleAccepter}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      size="lg"
                      disabled={!classeChoisie}
                    >
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Accepter le transfert
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleRefuser}
                      className="flex-1"
                      size="lg"
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Refuser
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Motif de refus (si applicable)</Label>
                    <Input
                      placeholder="Optionnel"
                      value={motifRefus}
                      onChange={(e) => setMotifRefus(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {etapeReception === "termine" && (
              <div className="text-center py-12">
                <CheckCircle2 className="h-16 w-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Traitement terminé</h2>
                <p className="text-muted-foreground mb-6">
                  Vous pouvez retourner à la liste des inscriptions ou traiter un autre transfert.
                </p>
                <div className="flex justify-center gap-3">
                  <Button asChild>
                    <Link href="/ecole/inscriptions">Retour aux inscriptions</Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEtapeReception("saisie")
                      setDossierRecu(null)
                      setCodeOuFichier("")
                      setClasseChoisie("")
                      setMotifRefus("")
                    }}
                  >
                    Nouveau transfert
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
