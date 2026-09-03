"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Printer, Edit, Trash2, User, Phone, Mail, MapPin, X } from "lucide-react"
import { printHtml } from "@/lib/print"
import type { DonneesEleve } from "@/types/models"

interface StudentDetailsModalProps { student: DonneesEleve; onClose?: () => void; onEdit?: (student: DonneesEleve) => void; onDelete?: (id: string) => void; onToggleStatus?: (student: DonneesEleve) => void; onPrintReceipt?: (student: DonneesEleve) => void }

export default function StudentDetailsModal({ student, onClose, onEdit, onDelete, onToggleStatus, onPrintReceipt }: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("infos")
  if (!student) return null

  const handlePrintSchoolCard = () => printHtml(`<!doctype html><html><head><meta charset="utf-8"/><title>Carte scolaire - ${student.prenom} ${student.nom}</title><style>body{font-family:Inter,Arial,sans-serif;padding:20px}</style></head><body><h2>Carte scolaire</h2><div><strong>ID:</strong> ${student.id || student.identifiant}</div><div><strong>Nom:</strong> ${student.nom}</div><div><strong>Prénom:</strong> ${student.prenom}</div><div><strong>Classe:</strong> ${student.classe}</div></body></html>`)
  const handlePrintCertificate = () => printHtml(`<!doctype html><html><head><meta charset="utf-8"/><title>Attestation - ${student.prenom} ${student.nom}</title><style>body{font-family:Inter,Arial,sans-serif;padding:24px}</style></head><body><h1>Attestation de scolarité</h1><p>Nous attestons que <strong>${student.prenom} ${student.nom}</strong> est inscrit(e) en classe <strong>${student.classe}</strong>.</p></body></html>`)

  const getPaymentStatus = () => {
    if (!student.modePaiement) return { label: "Impayé", color: "bg-rouge-terre" }
    if (student.modePaiement === "mensuel") {
      if (student.moisPaiement?.length === 10) return { label: "À jour", color: "bg-jardin" }
      if ((student.moisPaiement?.length ?? 0) > 0) return { label: "Acompte", color: "bg-soleil" }
      return { label: "Impayé", color: "bg-rouge-terre" }
    }
    if (student.modePaiement === "tranches") {
      const totalTranches = student.nombreTranches || 3
      if (student.moisPaiement?.length === totalTranches) return { label: "À jour", color: "bg-jardin" }
      if ((student.moisPaiement?.length ?? 0) > 0) return { label: "Acompte", color: "bg-soleil" }
    }
    return { label: "Impayé", color: "bg-rouge-terre" }
  }
  const paymentStatus = getPaymentStatus()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-2 backdrop-blur-[2px] sm:p-4">
      <div className="fixed inset-0 bg-black/60" onClick={() => onClose?.()} />
      <Card className="relative z-50 my-2 flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl min-w-0 flex-col overflow-hidden border-0 bg-papier shadow-2xl sm:my-4 sm:max-h-[90vh]">
        <CardHeader className="shrink-0 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="truncate text-lg text-terre sm:text-xl">{student.prenom} {student.nom}</CardTitle>
              <p className="truncate text-sm text-pierre">{student.identifiant} • {student.classe}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onClose?.()} className="shrink-0" aria-label="Fermer"><X className="h-5 w-5" /></Button>
          </div>
        </CardHeader>
        <CardContent className="min-h-0 overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <TabsList className="grid min-w-[520px] grid-cols-4 bg-creme p-1 rounded-2xl">
                <TabsTrigger value="infos" className="rounded-xl data-[state=active]:bg-papier">Infos</TabsTrigger>
                <TabsTrigger value="contact" className="rounded-xl data-[state=active]:bg-papier">Contact</TabsTrigger>
                <TabsTrigger value="paiement" className="rounded-xl data-[state=active]:bg-papier">Paiement</TabsTrigger>
                <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-papier">Documents</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="infos" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm text-pierre">Statut</label><Badge className={student.statut === "actif" ? "rounded-full bg-jardin text-white" : "rounded-full bg-pierre text-white"}>{student.statut}</Badge></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Date de naissance</label><p className="text-sm font-medium text-terre">{new Date(student.dateNaissance).toLocaleDateString("fr-FR")}</p></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Lieu de naissance</label><p className="text-sm font-medium text-terre">{student.lieuNaissance || "-"}</p></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Sexe</label><p className="text-sm font-medium text-terre">{student.sexe || "-"}</p></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Date d'inscription</label><p className="text-sm font-medium text-terre">{new Date(student.dateInscription).toLocaleDateString("fr-FR")}</p></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Type d'inscription</label><p className="text-sm font-medium text-terre">{student.typeInscription}</p></div>
              </div>
              <div className="space-y-2"><label className="text-sm text-pierre">Options supplémentaires</label><div className="flex flex-wrap gap-2">{student.optionsSupplementaires.tenueScolaire && <Badge className="rounded-full bg-terre text-white">Tenue</Badge>}{student.optionsSupplementaires.carteScolaire && <Badge className="rounded-full bg-terre text-white">Carte</Badge>}{student.optionsSupplementaires.cooperative && <Badge className="rounded-full bg-terre text-white">Coopérative</Badge>}{student.optionsSupplementaires.tenueEPS && <Badge className="rounded-full bg-terre text-white">EPS</Badge>}{student.optionsSupplementaires.assurance && <Badge className="rounded-full bg-terre text-white">Assurance</Badge>}</div></div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {[{icon: Phone, label: "Téléphone élève", value: student.informationsContact.telephone},{icon: Mail, label: "Email élève", value: student.informationsContact.email},{icon: MapPin, label: "Adresse", value: student.adresse},{icon: User, label: "Nom du parent", value: student.nomParent},{icon: Phone, label: "Contact parent", value: student.contactParent}].map(({icon: Icon,label,value}) => <div key={label} className="flex min-w-0 items-start gap-3"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-terre"/><div className="min-w-0"><label className="text-sm text-pierre">{label}</label><p className="break-words text-sm font-medium text-terre">{value || "-"}</p></div></div>)}
              </div>
            </TabsContent>

            <TabsContent value="paiement" className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm text-pierre">Mode de paiement</label><p className="text-sm font-medium text-terre">{student.modePaiement}</p></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Statut paiement</label><Badge className={`${paymentStatus.color} rounded-full text-white`}>{paymentStatus.label}</Badge></div>
                <div className="space-y-2"><label className="text-sm text-pierre">Total à payer</label><p className="text-sm font-medium text-terre">{student.totalAPayer.toLocaleString()} FCFA</p></div>
                {student.modePaiement === "tranches" && <div className="space-y-2"><label className="text-sm text-pierre">Nombre de tranches</label><p className="text-sm font-medium text-terre">{student.nombreTranches || 3}</p></div>}
              </div>
              {student.moisPaiement?.length ? <div className="space-y-2"><label className="text-sm text-pierre">Mois payés</label><div className="flex flex-wrap gap-2">{student.moisPaiement.map((mois, idx) => <Badge key={idx} className="rounded-full bg-jardin text-white">{mois}</Badge>)}</div></div> : null}
            </TabsContent>

            <TabsContent value="documents" className="space-y-3">
              <Button variant="outline" onClick={() => onPrintReceipt?.(student)} className="w-full justify-start rounded-xl"><Printer className="mr-2 h-4 w-4 shrink-0"/>Reçu d'inscription</Button>
              <Button variant="outline" onClick={handlePrintSchoolCard} className="w-full justify-start rounded-xl"><Printer className="mr-2 h-4 w-4 shrink-0"/>Carte scolaire</Button>
              <Button variant="outline" onClick={handlePrintCertificate} className="w-full justify-start rounded-xl"><Printer className="mr-2 h-4 w-4 shrink-0"/>Attestation de scolarité</Button>
            </TabsContent>
          </Tabs>

          <div className="mt-6 grid grid-cols-1 gap-2 border-t border-terre/10 pt-4 sm:grid-cols-[1fr_1fr_auto]">
            <Button variant="outline" onClick={() => onEdit?.(student)} className="w-full rounded-xl"><Edit className="mr-2 h-4 w-4"/>Modifier</Button>
            <Button variant="outline" onClick={() => onToggleStatus?.(student)} className="w-full rounded-xl">{student.statut === "actif" ? "Désactiver" : "Activer"}</Button>
            <Button variant="destructive" onClick={() => onDelete?.(student.id || "")} className="w-full rounded-xl sm:w-auto" aria-label="Supprimer"><Trash2 className="h-4 w-4"/></Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
