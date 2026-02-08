"use client"

import type { DonneesEleve } from "@/types/models"
import { printHtml } from "@/lib/print"

interface StudentCardProps {
  student: DonneesEleve
  schoolYear?: string
  showPrintButton?: boolean
}

export function StudentCard({ student, schoolYear = "2024-2025", showPrintButton = false }: StudentCardProps) {
  const handlePrintSchoolCard = () => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(student.id || student.identifiant)}`;
    const html = `
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
              /* ...styles preserved... */
            </style>
          </head>
          <body>
            <div class="card-container">
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
                  <div class="year">Année Scolaire: ${schoolYear}</div>
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
                      <div class="photo">PHOTO</div>
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
            </div>
            <script>
              window.onload = () => {
                window.print();
                setTimeout(() => window.close(), 500);
              }
            </script>
          </body>
        </html>
      `

    printHtml(html)
  }

  return (
    <div className="w-[8.5cm] h-[5.4cm] bg-white border-2 border-gray-800 p-3 text-xs font-mono print:border-black relative">
      {/* Coins décoratifs */}
      <div className="absolute top-0 left-0 w-0 h-0 border-l-[12px] border-t-[12px] border-l-blue-800 border-t-blue-800"></div>
      <div className="absolute bottom-0 right-0 w-0 h-0 border-r-[12px] border-b-[12px] border-r-blue-800 border-b-blue-800"></div>

      {/* En-tête officiel */}
      <div className="text-center mb-2">
        <div className="text-[8px] font-bold text-blue-800">RÉPUBLIQUE GABONAISE</div>
        <div className="text-[8px] text-gray-700">Union - Travail - Justice</div>
        <div className="text-[8px] text-gray-700">Ministère de l'Éducation Nationale</div>
        <div className="text-[8px] font-bold mt-1 text-blue-800">COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO</div>
        <div className="text-[8px] text-gray-600">B.P: 16109 Estuaire Tél: 077947410</div>
      </div>

      {/* Ligne de séparation avec dégradé */}
      <div className="border-t-2 border-blue-800 pt-2 relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-800 via-blue-500 to-blue-800"></div>

        <div className="text-center font-bold mb-2 text-[10px] text-blue-800 underline">CARTE D'IDENTITÉ SCOLAIRE</div>
        <div className="text-[8px] mb-2 text-center text-gray-600">Année Scolaire: {schoolYear}</div>

        {/* Contenu principal avec photo et QR */}
        <div className="flex justify-between items-start gap-2">
          <div className="flex-1 pr-2">
            <div className="text-[8px] space-y-1">
              <div>
                <span className="font-bold text-gray-700">ID:</span> <span className="text-gray-900">{student.id || student.identifiant}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Nom:</span> <span className="text-gray-900">{student.nom?.toUpperCase()}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Prénom:</span> <span className="text-gray-900">{student.prenom}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Né(e) le:</span> <span className="text-gray-900">{student.dateNaissance}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">À:</span> <span className="text-gray-900">{student.lieuNaissance || 'Non spécifié'}</span>
              </div>
              <div>
                <span className="font-bold text-gray-700">Classe:</span> <span className="text-gray-900">{student.classe}</span>
              </div>
            </div>
          </div>

          {/* Zone photo et QR */}
          <div className="flex flex-col items-center gap-1">
            <div className="w-10 h-12 bg-gradient-to-br from-gray-200 to-gray-300 border-2 border-gray-600 rounded flex items-center justify-center shadow-inner">
              <span className="text-[5px] text-gray-500 font-bold transform -rotate-90 whitespace-nowrap">PHOTO</span>
            </div>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=30x30&data=${encodeURIComponent(student.id || student.identifiant)}`}
              alt="QR Code"
              className="w-[30px] h-[30px] border border-gray-400 rounded"
            />
          </div>
        </div>

        {/* Mentions légales */}
        <div className="text-[6px] mt-2 text-center leading-tight text-gray-600 border-t border-gray-300 pt-1">
          <div>Cette carte est strictement personnelle et doit être présentée à chaque demande</div>
          <div>L'Établissement décline toute responsabilité quant à l'utilisation abusive de cette carte</div>
          <div className="mt-1 font-bold">Le titulaire de la présente carte doit la laisser circuler librement</div>
        </div>
      </div>

      {/* Bouton d'impression si demandé */}
      {showPrintButton && (
        <button
          onClick={handlePrintSchoolCard}
          className="absolute top-1 right-1 bg-blue-600 text-white text-[6px] px-1 py-0.5 rounded hover:bg-blue-700 transition-colors"
        >
          Imprimer
        </button>
      )}
    </div>
  )
}
