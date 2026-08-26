"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Printer, Edit, Trash2 } from "lucide-react"
import Link from "next/link"
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{student.prenom} {student.nom}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="text-sm text-gray-600">ID: {student.id || student.identifiant}</div>
            <div className="text-sm text-gray-600">Classe: {student.classe}</div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPrintReceipt ? onPrintReceipt(student) : null}>
              <Printer className="h-4 w-4 mr-2" />
              Reçu
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintSchoolCard}>
              <Printer className="h-4 w-4 mr-2" />
              Carte scolaire
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrintCertificate}>
              <Printer className="h-4 w-4 mr-2" />
              Attestation
            </Button>
          </div>

          <div className="flex gap-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit && onEdit(student)}>
              <Edit className="h-4 w-4 mr-2" /> Modifier
            </Button>
            <Button variant="destructive" size="sm" onClick={() => onDelete && onDelete(student.id || '')}>
              <Trash2 className="h-4 w-4 mr-2" /> Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}