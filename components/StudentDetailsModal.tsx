"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer, Edit, Trash2, X } from "lucide-react"
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

type Tab = "infos" | "contact" | "documents"

export default function StudentDetailsModal({
  student,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onPrintReceipt,
}: StudentDetailsModalProps) {
  const [tab, setTab] = useState<Tab>("infos")
  if (!student) return null

  const isActive = student.statut === "actif"

  const dob = student.dateNaissance ? new Date(student.dateNaissance) : null
  const dobValid = dob && !isNaN(dob.getTime())
  const dobStr = dobValid ? dob!.toLocaleDateString("fr-FR") : "—"
  const age = dobValid ? Math.floor((Date.now() - dob!.getTime()) / (365.25 * 24 * 3600 * 1000)) : null

  const inscriptionDate = student.dateInscription ? new Date(student.dateInscription) : null
  const inscriptionStr =
    inscriptionDate && !isNaN(inscriptionDate.getTime())
      ? inscriptionDate.toLocaleDateString("fr-FR")
      : "—"

  const TABS: { key: Tab; label: string }[] = [
    { key: "infos", label: "Informations" },
    { key: "contact", label: "Contact" },
    { key: "documents", label: "Documents" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-50 ml-auto flex h-full w-full max-w-[420px] flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-sm font-semibold text-gray-900">
                  {student.nom} {student.prenom}
                </h2>
                <span
                  className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    isActive
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isActive ? "Actif" : "Inactif"}
                </span>
              </div>
              <p className="mt-0.5 font-mono text-[11px] text-gray-400">
                {student.identifiant || "Matricule non défini"}
              </p>
              {student.classe && (
                <p className="mt-0.5 text-[11px] text-gray-500">{student.classe}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="mt-0.5 shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-xs font-medium transition-colors ${
                tab === key
                  ? "border-b-2 border-[#1e3a8a] text-[#1e3a8a]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tab === "infos" && (
            <dl className="divide-y divide-gray-100">
              {[
                {
                  label: "Nom complet",
                  value: `${student.nom} ${student.prenom}`.trim() || "—",
                },
                {
                  label: "Date de naissance",
                  value: age !== null ? `${dobStr}  (${age} ans)` : dobStr,
                },
                {
                  label: "Lieu de naissance",
                  value: student.lieuNaissance || "—",
                },
                {
                  label: "Sexe",
                  value: student.sexe || "—",
                },
                {
                  label: "Classe",
                  value: student.classe || "—",
                },
                {
                  label: "Date d'inscription",
                  value: inscriptionStr,
                },
                {
                  label: "Type d'inscription",
                  value: student.typeInscription || "—",
                },
                {
                  label: "Statut",
                  value: isActive ? "Actif" : "Inactif",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 py-2.5">
                  <dt className="w-36 shrink-0 text-[11px] text-gray-500">{label}</dt>
                  <dd className="text-[11px] font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {tab === "contact" && (
            <dl className="divide-y divide-gray-100">
              {[
                {
                  label: "Téléphone",
                  value:
                    student.informationsContact?.telephone ||
                    student.contactParent ||
                    "—",
                },
                {
                  label: "Email",
                  value: student.informationsContact?.email || "—",
                },
                {
                  label: "Adresse",
                  value:
                    student.informationsContact?.adresse || student.adresse || "—",
                },
                {
                  label: "Nom du parent",
                  value: student.nomParent || "—",
                },
                {
                  label: "Contact parent",
                  value: student.contactParent || "—",
                },
              ].map(({ label, value }) => (
                <div key={label} className="flex gap-3 py-2.5">
                  <dt className="w-36 shrink-0 text-[11px] text-gray-500">{label}</dt>
                  <dd className="break-words text-[11px] font-medium text-gray-900">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {tab === "documents" && (
            <div className="space-y-1.5">
              {[
                {
                  label: "Reçu d'inscription",
                  onClick: () => onPrintReceipt?.(student),
                },
                {
                  label: "Carte scolaire",
                  onClick: () =>
                    printHtml(
                      `<!doctype html><html><head><meta charset="utf-8"/><title>Carte scolaire</title></head><body><h2>Carte scolaire</h2><p>${student.nom} ${student.prenom}</p><p>Classe : ${student.classe || "—"}</p><p>Matricule : ${student.identifiant || "—"}</p></body></html>`
                    ),
                },
                {
                  label: "Attestation de scolarité",
                  onClick: () =>
                    printHtml(
                      `<!doctype html><html><head><meta charset="utf-8"/><title>Attestation</title></head><body><h1>Attestation de scolarité</h1><p>Nous attestons que <strong>${student.prenom} ${student.nom}</strong> est inscrit(e) en classe <strong>${student.classe || "—"}</strong>.</p></body></html>`
                    ),
                },
              ].map(({ label, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="flex w-full items-center gap-2.5 rounded border border-gray-200 px-3 py-2.5 text-left text-[11px] text-gray-700 hover:bg-gray-50"
                >
                  <Printer className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex-1 text-[11px]"
              onClick={() => onEdit?.(student)}
            >
              <Edit className="mr-1.5 h-3 w-3" />
              Modifier
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              onClick={() => onToggleStatus?.(student)}
            >
              {isActive ? "Désactiver" : "Activer"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 shrink-0 border-red-200 p-0 text-red-600 hover:bg-red-50"
              onClick={() => onDelete?.(student.id || "")}
              aria-label="Supprimer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
