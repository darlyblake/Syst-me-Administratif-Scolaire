"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Printer, Edit, Trash2, User, Phone, Mail, MapPin, Calendar, CreditCard, FileText, X } from "lucide-react"
import { printHtml } from "@/lib/print"
import type { DonneesEleve } from "@/types/models"

interface StudentDetailsModalProps {
  student: DonneesEleve
  onClose?: () => void
  onEdit?: (student: DonneesEleve) => void
  onDelete?: (id: string) => void
  onToggleStatus?: (student: DonneesEleve) => void
  onPrintReceipt?: (student: DonneesEleve) => void
}

export default function StudentDetailsModal({
  student,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onPrintReceipt,
}: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState("infos")

  if (!student) return null

  const handlePrintSchoolCard = () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Carte scolaire - ${student.prenom} ${student.nom}</title>
          <style>body{font-family:Inter,Arial,sans-serif;padding:20px}</style>
        </head>
        <body>
          <h2>Carte scolaire</h2>
          <div><strong>ID:</strong> ${student.id || student.identifiant}</div>
          <div><strong>Nom:</strong> ${student.nom}</div>
          <div><strong>Prénom:</strong> ${student.prenom}</div>
          <div><strong>Classe:</strong> ${student.classe}</div>
        </body>
      </html>
    `
    printHtml(html)
  }

  const handlePrintCertificate = () => {
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Attestation - ${student.prenom} ${student.nom}</title>
          <style>body{font-family:Inter,Arial,sans-serif;padding:24px}</style>
        </head>
        <body>
          <h1>Attestation de scolarité</h1>
          <p>Nous attestons que <strong>${student.prenom} ${student.nom}</strong> est inscrit(e) en classe <strong>${student.classe}</strong>.</p>
        </body>
      </html>
    `
    printHtml(html)
  }

  const getPaymentStatus = () => {
    if (!student.modePaiement) return { label: "Impayé", color: "bg-rouge-terre" }
    if (student.modePaiement === "mensuel") {
      if (student.moisPaiement && student.moisPaiement.length === 10) return { label: "À jour", color: "bg-jardin" }
      if (student.moisPaiement && student.moisPaiement.length > 0) return { label: "Acompte", color: "bg-soleil" }
      return { label: "Impayé", color: "bg-rouge-terre" }
    }
    if (student.modePaiement === "tranches") {
      const totalTranches = student.nombreTranches || 3
      if (student.moisPaiement && student.moisPaiement.length === totalTranches) return { label: "À jour", color: "bg-jardin" }
      if (student.moisPaiement && student.moisPaiement.length > 0) return { label: "Acompte", color: "bg-soleil" }
      return { label: "Impayé", color: "bg-rouge-terre" }
    }
    return { label: "Impayé", color: "bg-rouge-terre" }
  }

  const paymentStatus = getPaymentStatus()

  return (
    <div className="fixed inset-0 bg-encre/30 flex items-center justify-center z-50 p-4">
      <Card className="bg-papier shadow-soft max-w-2xl w-full max-h-[90vh] overflow-y-auto border-0">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-terre text-xl">{student.prenom} {student.nom}</CardTitle>
            <p className="text-sm text-pierre">{student.identifiant} • {student.classe}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onClose && onClose()}>
            <X className="h-5 w-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-creme p-1 rounded-2xl">
              <TabsTrigger value="infos" className="rounded-xl data-[state=active]:bg-papier">Infos</TabsTrigger>
              <TabsTrigger value="contact" className="rounded-xl data-[state=active]:bg-papier">Contact</TabsTrigger>
              <TabsTrigger value="paiement" className="rounded-xl data-[state=active]:bg-papier">Paiement</TabsTrigger>
              <TabsTrigger value="documents" className="rounded-xl data-[state=active]:bg-papier">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="infos" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Statut</label>
                  <Badge className={student.statut === "actif" ? "bg-jardin text-white rounded-full" : "bg-pierre text-white rounded-full"}>
                    {student.statut}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Date de naissance</label>
                  <p className="text-sm font-medium text-terre">{new Date(student.dateNaissance).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Lieu de naissance</label>
                  <p className="text-sm font-medium text-terre">{student.lieuNaissance || '-'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Sexe</label>
                  <p className="text-sm font-medium text-terre">{student.sexe || '-'}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Date d'inscription</label>
                  <p className="text-sm font-medium text-terre">{new Date(student.dateInscription).toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Type d'inscription</label>
                  <p className="text-sm font-medium text-terre">{student.typeInscription}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-pierre">Options supplémentaires</label>
                <div className="flex gap-2 flex-wrap">
                  {student.optionsSupplementaires.tenueScolaire && <Badge className="bg-terre text-white rounded-full">Tenue</Badge>}
                  {student.optionsSupplementaires.carteScolaire && <Badge className="bg-terre text-white rounded-full">Carte</Badge>}
                  {student.optionsSupplementaires.cooperative && <Badge className="bg-terre text-white rounded-full">Coopérative</Badge>}
                  {student.optionsSupplementaires.tenueEPS && <Badge className="bg-terre text-white rounded-full">EPS</Badge>}
                  {student.optionsSupplementaires.assurance && <Badge className="bg-terre text-white rounded-full">Assurance</Badge>}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-terre mt-0.5" />
                  <div>
                    <label className="text-sm text-pierre">Téléphone élève</label>
                    <p className="text-sm font-medium text-terre">{student.informationsContact.telephone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="h-5 w-5 text-terre mt-0.5" />
                  <div>
                    <label className="text-sm text-pierre">Email élève</label>
                    <p className="text-sm font-medium text-terre">{student.informationsContact.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-terre mt-0.5" />
                  <div>
                    <label className="text-sm text-pierre">Adresse</label>
                    <p className="text-sm font-medium text-terre">{student.adresse || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="h-5 w-5 text-terre mt-0.5" />
                  <div>
                    <label className="text-sm text-pierre">Nom du parent</label>
                    <p className="text-sm font-medium text-terre">{student.nomParent || '-'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-terre mt-0.5" />
                  <div>
                    <label className="text-sm text-pierre">Contact parent</label>
                    <p className="text-sm font-medium text-terre">{student.contactParent || '-'}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="paiement" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Mode de paiement</label>
                  <p className="text-sm font-medium text-terre">{student.modePaiement}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Statut paiement</label>
                  <Badge className={`${paymentStatus.color} text-white rounded-full`}>
                    {paymentStatus.label}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Total à payer</label>
                  <p className="text-sm font-medium text-terre">{student.totalAPayer.toLocaleString()} FCFA</p>
                </div>
                {student.modePaiement === "tranches" && (
                  <div className="space-y-2">
                    <label className="text-sm text-pierre">Nombre de tranches</label>
                    <p className="text-sm font-medium text-terre">{student.nombreTranches || 3}</p>
                  </div>
                )}
              </div>

              {student.moisPaiement && student.moisPaiement.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm text-pierre">Mois payés</label>
                  <div className="flex gap-2 flex-wrap">
                    {student.moisPaiement.map((mois, idx) => (
                      <Badge key={idx} className="bg-jardin text-white rounded-full">{mois}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => onPrintReceipt ? onPrintReceipt(student) : null}
                  className="rounded-xl justify-start"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Reçu d'inscription
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePrintSchoolCard}
                  className="rounded-xl justify-start"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Carte scolaire
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePrintCertificate}
                  className="rounded-xl justify-start"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Attestation de scolarité
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 mt-6 pt-4 border-t border-terre/10">
            <Button variant="outline" onClick={() => onEdit && onEdit(student)} className="flex-1 rounded-xl">
              <Edit className="h-4 w-4 mr-2" /> Modifier
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onToggleStatus && onToggleStatus(student)}
              className="flex-1 rounded-xl"
            >
              {student.statut === "actif" ? "Désactiver" : "Activer"}
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => onDelete && onDelete(student.id || '')}
              className="rounded-xl"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}