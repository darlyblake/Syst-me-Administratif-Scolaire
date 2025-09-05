import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Edit, Trash2, Printer, Users } from "lucide-react"
import { SchoolCertificate } from "@/components/SchoolCertificate"
import { Settings } from "lucide-react"
import Link from "next/link"
import { StudentCard } from "@/components/student-card"


import type { DonneesEleve } from "@/types/models"

interface StudentDetailsModalProps {
  student: DonneesEleve
  onClose: () => void
  onEdit: () => void
  onDelete: (id: string) => void
  onToggleStatus: (student: DonneesEleve) => void
  onPrintReceipt: (student: DonneesEleve) => void
  onPrintSchoolCard: (student: DonneesEleve) => void
  onPrintCertificate: (student: DonneesEleve) => void
  extraContent?: React.ReactNode; 
}

export default function StudentDetailsModal({
  student,
  onClose,
  onEdit,
  onDelete,
  onToggleStatus,
  onPrintReceipt,
  onPrintSchoolCard,
  onPrintCertificate
}: StudentDetailsModalProps) {
  const [isChangingStatus, setIsChangingStatus] = useState(false)

  const handleToggleStatus = async () => {
    setIsChangingStatus(true)
    await onToggleStatus(student)
    setIsChangingStatus(false)
  }

  


const handlePrintCertificate = (student: DonneesEleve) => {
  const printWindow = window.open("", "_blank", "width=900,height=700");
  if (printWindow) {
    const certificateHTML = document.getElementById('certificate-print')?.innerHTML || '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attestation de Scolarité - ${student.prenom} ${student.nom}</title>

        <!-- Tailwind CSS -->
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.3.3/dist/tailwind.min.css" rel="stylesheet">

       <style>
          /* Reset et base */
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 20px;
            color: #2d3748;
            background: white;
            line-height: 1.6;
            font-size: 14px;
          }
          
          /* Container principal */
          .certificate-container {
            width: 21cm;
            min-height: 29.7cm;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            margin: 0 auto;
            padding: 40px;
            position: relative;
            overflow: hidden;
            border: 1px solid #e2e8f0;
          }
          
          /* Cadre décoratif */
          .gold-border {
            position: absolute;
            border: 2px solid #f59e0b;
            border-radius: 8px;
            pointer-events: none;
          }
          .gold-border-outer { inset: 20px; }
          .gold-border-inner { inset: 30px; }
          
          /* En-tête officielle */
          .official-header {
            background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
            color: white;
            text-align: center;
            padding: 30px;
            border-radius: 16px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
          }
          
          .official-header::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px);
            background-size: 20px 20px;
            transform: rotate(30deg);
          }
          
          .school-name {
            font-family: 'Playfair Display', serif;
            font-size: 24px;
            font-weight: 700;
            margin-bottom: 8px;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
          
          /* Informations de contact */
          .contact-info {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin: 20px 0;
            flex-wrap: wrap;
          }
          
          .contact-item {
            display: flex;
            align-items: center;
            background: #f1f5f9;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            color: #374151;
          }
          
          .contact-item svg {
            width: 14px;
            height: 14px;
            margin-right: 6px;
            color: #3b82f6;
          }
          
          /* Titre du document */
          .certificate-title {
            text-align: center;
            margin: 30px 0;
            position: relative;
          }
          
          .title-decoration {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 700;
            color: #1e40af;
            position: relative;
            display: inline-block;
            padding: 0 40px;
          }
          
          .title-decoration::before,
          .title-decoration::after {
            content: '✦';
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            color: #3b82f6;
            font-size: 20px;
          }
          
          .title-decoration::before { left: 0; }
          .title-decoration::after { right: 0; }
          
          /* Corps de l'attestation */
          .certificate-body {
            margin-bottom: 40px;
          }
          
          .intro-text {
            text-align: justify;
            margin-bottom: 25px;
            line-height: 1.8;
            color: #374151;
          }
          
          .student-info-card {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-left: 4px solid #3b82f6;
            padding: 25px;
            border-radius: 12px;
            margin: 0 0 25px 20px;
          }
          
          .info-item {
            margin-bottom: 15px;
            position: relative;
            padding-left: 20px;
          }
          
          .info-item::before {
            content: '•';
            position: absolute;
            left: 0;
            color: #3b82f6;
            font-weight: bold;
            font-size: 18px;
          }
          
          .info-label {
            font-size: 12px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
          }
          
          .info-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
          }
          
          .class-value {
            color: #2563eb;
            font-size: 18px;
          }
          
          .conclusion-text {
            text-align: justify;
            margin-top: 25px;
            line-height: 1.8;
            color: #374151;
          }
          
          /* Signature et date */
          .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 60px;
          }
          
          .seal-area {
            text-align: center;
          }
          
          .seal {
            width: 120px;
            height: 120px;
            border: 2px dashed #cbd5e1;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f8fafc;
            margin: 0 auto;
          }
          
          .seal-text {
            font-size: 10px;
            color: #64748b;
            text-align: center;
          }
          
          .signature-area {
            text-align: right;
          }
          
          .signature-line {
            border-top: 2px solid #3b82f6;
            width: 200px;
            margin: 20px 0 5px;
            padding-top: 10px;
          }
          
          .director-name {
            font-size: 14px;
            font-weight: 600;
            color: #1e40af;
          }
          
          .director-title {
            font-size: 12px;
            color: #64748b;
          }
          
          .date-text {
            font-size: 12px;
            color: #64748b;
            margin-bottom: 15px;
          }
          
          /* Pied de page */
          .footer {
            position: absolute;
            bottom: 20px;
            left: 0;
            right: 0;
            text-align: center;
          }
          
          .footer-text {
            font-size: 10px;
            color: #94a3b8;
            font-style: italic;
          }
          
          /* Filigrane */
          .watermark {
            position: absolute;
            font-size: 100px;
            font-weight: 800;
            color: rgba(59, 130, 246, 0.03);
            transform: rotate(-45deg);
            pointer-events: none;
            z-index: 0;
            font-family: 'Playfair Display', serif;
          }
          
          .watermark-1 { top: 25%; left: 15%; }
          .watermark-2 { bottom: 25%; right: 15%; }
          
          /* Éléments décoratifs */
          .decoration {
            position: absolute;
            border: 2px solid rgba(59, 130, 246, 0.2);
            border-radius: 50%;
            pointer-events: none;
          }
          
          .decoration-1 { top: 80px; right: 60px; width: 30px; height: 30px; }
          .decoration-2 { bottom: 120px; left: 80px; width: 20px; height: 20px; }
          .decoration-3 { top: 180px; left: 100px; width: 15px; height: 15px; }
          
          /* Responsive pour l'impression */
          @media print {
            body {
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
            }
            
            .certificate-container {
              width: 100% !important;
              height: auto !important;
              min-height: 100vh !important;
              padding: 20px !important;
              border: none !important;
              margin: 0 !important;
              box-shadow: none !important;
            }
            
            .official-header {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .student-info-card {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .gold-border {
              display: none;
            }
            
            .no-print {
              display: none;
            }
            
            @page {
              margin: 0.5cm;
              size: A4 portrait;
            }
          }
        </style>
      </head>
      <body class="bg-white">
        <div id="root" class="p-10">
          ${certificateHTML}
        </div>

        <script>
          window.onload = () => {
            window.print();
            setTimeout(() => window.close(), 500);
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }
};












  return (



    
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Détails de l'élève</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden">
                {student.photo ? (
                  <img src={student.photo} alt={`${student.prenom} ${student.nom}`} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                    <Users className="h-12 w-12 text-gray-600" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm font-medium">Statut:</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={student.statut === "actif"}
                    onCheckedChange={handleToggleStatus}
                    disabled={isChangingStatus}
                  />
                  <span className="text-sm">{student.statut}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button 
                  size="sm" 
                  onClick={onEdit}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onDelete(student.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Archiver
                </Button>
              </div>
            </div>

{/* Composant pour impression uniquement, hors écran */}
<div
  id="certificate-print"
  style={{
    position: 'absolute',
    left: '-9999px',
    top: 0,
    width: 0,
    height: 0,
    overflow: 'hidden',
  }}
>
  <SchoolCertificate
    student={{
      nom: student.nom,
      prenom: student.prenom,
      dateNaissance: student.dateNaissance,
      lieuNaissance: student.lieuNaissance || "Non spécifié",
      classe: student.classe
    }}
    schoolName="COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO"
    directorName="Dr. Jean-Paul OKOUMOU"
    schoolYear="2024-2025"
  />
</div>




            <div className="md:col-span-2">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Informations personnelles</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Identifiant:</span> {student.identifiant}
                    </div>
                    <div>
                      <span className="font-medium">Mot de passe:</span> {student.motDePasse}
                    </div>
                    <div>
                      <span className="font-medium">Nom:</span> {student.nom}
                    </div>
                    <div>
                      <span className="font-medium">Prénom:</span> {student.prenom}
                    </div>
                    <div>
                      <span className="font-medium">Date de naissance:</span> {student.dateNaissance}
                    </div>
                    <div>
                      <span className="font-medium">Classe:</span> {student.classe}
                    </div>
                    <div>
                      <span className="font-medium">Statut:</span> {student.statut}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Informations de contact</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-medium">Téléphone:</span>{" "}
                      {student.informationsContact.telephone || "Non renseigné"}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span>{" "}
                      {student.informationsContact.email || "Non renseigné"}
                    </div>
                    <div>
                      <span className="font-medium">Adresse:</span>{" "}
                      {student.informationsContact.adresse || "Non renseignée"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Informations financières</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm">
                    <span className="font-medium">Total à payer:</span>
                    <div className="text-lg font-bold text-red-600">
                      {student.totalAPayer.toLocaleString()} FCFA
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="font-medium text-gray-900 mb-3">Documents</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => onPrintReceipt(student)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Receipt
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    // Fonction d'impression de la carte scolaire
                    const printWindow = window.open("", "_blank", "width=900,height=700");
                    if (printWindow) {
                      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(student.id || student.identifiant)}`;

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Carte scolaire - ${student.prenom} ${student.nom}</title>
                            <style>
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              body {
                                font-family: 'Inter', sans-serif;
                                margin: 0;
                                padding: 20px;
                                background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
                                line-height: 1.3;
                                font-size: 12px;
                                color: #2d3748;
                              }
                              .cards-container {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                gap: 20px;
                                min-height: 100vh;
                                padding: 20px;
                              }
                              .card {
                                width: 8.5cm;
                                height: 5.4cm;
                                background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
                                border: 3px solid #1e40af;
                                border-radius: 8px;
                                padding: 12px;
                                font-size: 8px;
                                font-family: 'Courier New', monospace;
                                position: relative;
                                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                                overflow: hidden;
                              }
                              .card::before {
                                content: '';
                                position: absolute;
                                top: 0;
                                left: 0;
                                right: 0;
                                height: 4px;
                                background: linear-gradient(90deg, #1e40af 0%, #3b82f6 50%, #1e40af 100%);
                              }
                              .header {
                                text-align: center;
                                margin-bottom: 8px;
                                position: relative;
                              }
                              .header div {
                                margin-bottom: 2px;
                              }
                              .school-name {
                                font-weight: bold;
                                font-size: 10px;
                                color: #1e40af;
                                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
                              }
                              .school-address {
                                font-size: 6px;
                                opacity: 0.8;
                                color: #64748b;
                              }
                              .ministry {
                                font-size: 6px;
                                font-weight: 600;
                                color: #374151;
                              }
                              .title {
                                text-align: center;
                                font-weight: bold;
                                margin-bottom: 4px;
                                font-size: 9px;
                                color: #1e40af;
                                text-decoration: underline;
                              }
                              .year {
                                font-size: 6px;
                                margin-bottom: 4px;
                                text-align: center;
                                color: #64748b;
                              }
                              .content {
                                display: flex;
                                justify-content: space-between;
                                align-items: start;
                                gap: 8px;
                              }
                              .info {
                                flex: 1;
                                padding-right: 4px;
                              }
                              .info div {
                                margin-bottom: 2px;
                                padding: 1px 0;
                              }
                              .label {
                                font-weight: bold;
                                color: #374151;
                              }
                              .value {
                                color: #1f2937;
                                font-weight: 500;
                              }
                              .photo-qr-container {
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                gap: 4px;
                              }
                              .photo {
                                width: 40px;
                                height: 50px;
                                background: linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%);
                                border: 2px solid #9ca3af;
                                border-radius: 4px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 5px;
                                color: #6b7280;
                                font-weight: bold;
                                text-align: center;
                                box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
                              }
                              .qr-code {
                                width: 30px;
                                height: 30px;
                                border: 1px solid #9ca3af;
                                border-radius: 2px;
                                background: white;
                              }
                              .footer {
                                font-size: 4px;
                                margin-top: 6px;
                                text-align: center;
                                line-height: 1.2;
                                color: #64748b;
                                border-top: 1px solid #e5e7eb;
                                padding-top: 4px;
                              }
                              .footer div {
                                margin-bottom: 1px;
                              }
                              .decorative-corner {
                                position: absolute;
                                width: 0;
                                height: 0;
                                border-style: solid;
                              }
                              .corner-tl {
                                top: 0;
                                left: 0;
                                border-width: 15px 15px 0 0;
                                border-color: #1e40af transparent transparent transparent;
                              }
                              .corner-br {
                                bottom: 0;
                                right: 0;
                                border-width: 0 0 15px 15px;
                                border-color: transparent transparent #1e40af transparent;
                              }

                              /* Verso de la carte */
                              .back-content {
                                padding: 8px;
                                height: 100%;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                              }
                              .back-title {
                                text-align: center;
                                font-weight: bold;
                                font-size: 9px;
                                color: #1e40af;
                                margin-bottom: 6px;
                                text-decoration: underline;
                              }
                              .rules-section {
                                flex: 1;
                                font-size: 5px;
                                line-height: 1.3;
                                color: #374151;
                              }
                              .rules-section div {
                                margin-bottom: 3px;
                              }
                              .emergency-section {
                                font-size: 6px;
                                border-top: 1px solid #e5e7eb;
                                padding-top: 4px;
                                margin-top: 4px;
                              }
                              .emergency-title {
                                font-weight: bold;
                                color: #dc2626;
                                margin-bottom: 2px;
                              }
                              .emergency-info {
                                color: #374151;
                              }

                              @media print {
                                body {
                                  padding: 0;
                                  background: white;
                                }
                                .cards-container {
                                  gap: 10px;
                                  padding: 10px;
                                }
                                .card {
                                  border-color: black;
                                  box-shadow: none;
                                }
                                .card::before {
                                  background: black;
                                }
                                .decorative-corner {
                                  border-color: black transparent transparent transparent;
                                }
                                .corner-br {
                                  border-color: transparent transparent black transparent;
                                }
                                @page {
                                  margin: 0.5cm;
                                  size: A6 landscape;
                                }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="cards-container">
                              <!-- Recto de la carte -->
                              <div class="card">
                                <div class="decorative-corner corner-tl"></div>
                                <div class="decorative-corner corner-br"></div>
                                <div class="header">
                                  <div class="ministry">RÉPUBLIQUE GABONAISE</div>
                                  <div class="ministry">Union - Travail - Justice</div>
                                  <div class="ministry">Ministère de l'Éducation Nationale</div>
                                  <div class="school-name">COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO</div>
                                  <div class="school-address">B.P: 16109 Estuaire - Tél: 077947410 - Libreville, Gabon</div>
                                </div>
                                <div style="border-top: 2px solid #1e40af; padding-top: 4px;">
                                  <div class="title">CARTE D'IDENTITÉ SCOLAIRE</div>
                                  <div class="year">Année Scolaire: 2024-2025</div>
                                  <div class="content">
                                    <div class="info">
                                      <div><span class="label">ID:</span> <span class="value">${student.id || student.identifiant}</span></div>
                                      <div><span class="label">Nom:</span> <span class="value">${student.nom?.toUpperCase() || ''}</span></div>
                                      <div><span class="label">Prénom:</span> <span class="value">${student.prenom}</span></div>
                                      <div><span class="label">Né(e) le:</span> <span class="value">${student.dateNaissance}</span></div>
                                      <div><span class="label">À:</span> <span class="value">${student.lieuNaissance || 'Non spécifié'}</span></div>
                                      <div><span class="label">Classe:</span> <span class="value">${student.classe}</span></div>
                                    </div>
                                    <div class="photo-qr-container">
                                      ${student.photo ? `<img class="photo" src="${student.photo}" alt="Photo de ${student.prenom} ${student.nom}" />` : '<div class="photo">PHOTO</div>'}
                                      <img class="qr-code" src="${qrCodeUrl}" alt="QR Code" />
                                    </div>
                                  </div>
                                  <div class="footer">
                                    <div>Cette carte est strictement personnelle et doit être présentée à chaque demande.</div>
                                    <div>L'Établissement décline toute responsabilité quant à l'utilisation abusive de cette carte.</div>
                                    <div>Le titulaire de la présente carte doit la laisser circuler librement.</div>
                                  </div>
                                </div>
                              </div>

                              <!-- Verso de la carte -->
                              <div class="card">
                                <div class="decorative-corner corner-tl"></div>
                                <div class="decorative-corner corner-br"></div>
                                <div class="back-content">
                                  <div class="back-title">RÈGLEMENT INTÉRIEUR</div>
                                  <div class="rules-section">
                                    <div>• La carte doit être présentée à chaque entrée dans l'établissement</div>
                                    <div>• Elle est strictement personnelle et incessible</div>
                                    <div>• En cas de perte, prévenir immédiatement la direction</div>
                                    <div>• Tout usage frauduleux entraînera des sanctions disciplinaires</div>
                                    <div>• Respecter le règlement intérieur de l'établissement</div>
                                    <div>• Maintenir une attitude exemplaire en toutes circonstances</div>
                                    <div>• Participer activement aux activités pédagogiques</div>
                                    <div>• Respecter le matériel et les locaux de l'établissement</div>
                                  </div>
                                  <div class="emergency-section">
                                    <div class="emergency-title">CONTACTS D'URGENCE</div>
                                    <div class="emergency-info">
                                      <div><strong>Établissement:</strong> 077947410</div>
                                      <div><strong>Parent/Tuteur:</strong> ${student.contactParent || 'Non spécifié'}</div>
                                      <div><strong>Adresse:</strong> ${student.adresse || 'Non spécifiée'}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <script>
                              window.onload = () => {
                                window.print();
                                setTimeout(() => window.close(), 500);
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }
                  }}>
                    <Printer className="h-4 w-4 mr-2" />
                    Carte scolaire
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handlePrintCertificate(student)}>
                    <Printer className="h-4 w-4 mr-2" />
                    Attestation de scolarité
                  </Button>
              
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}