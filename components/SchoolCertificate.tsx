"use client"

interface SchoolCertificateProps {
  student: {
    nom: string
    prenom: string
    dateNaissance: string
    lieuNaissance: string
    classe: string
  }
  schoolName?: string
  directorName?: string
  schoolAddress?: string
  schoolPhone?: string
  city?: string
  schoolYear?: string
  template?: 'classic' | 'modern' | 'elegant'
}

export function SchoolCertificate({
  student,
  schoolName = "COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO",
  directorName = "Dr. Jean-Paul OKOUMOU",
  schoolAddress = "B.P: 16109 Estuaire",
  schoolPhone = "077 94 74 10",
  city = "Libreville",
  schoolYear = "2024-2025",
  template = 'classic',
}: SchoolCertificateProps) {
  const currentDate = new Date().toLocaleDateString("fr-FR", {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Template styles
  const getTemplateStyles = () => {
    switch (template) {
      case 'modern':
        return `
          .certificate-container {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            position: relative;
            overflow: hidden;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
          }

          .official-header {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: white;
            position: relative;
            overflow: hidden;
          }

          .school-name {
            font-family: 'Inter', sans-serif;
            font-weight: 700;
          }

          .student-info-card {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-left: 4px solid #0f172a;
          }
        `;

      case 'elegant':
        return `
          .certificate-container {
            font-family: 'Playfair Display', serif;
            background: linear-gradient(135deg, #fef7ed 0%, #fffbeb 100%);
            position: relative;
            overflow: hidden;
          }

          .official-header {
            background: linear-gradient(135deg, #92400e 0%, #b45309 100%);
            color: white;
            position: relative;
            overflow: hidden;
          }

          .school-name {
            font-family: 'Playfair Display', serif;
            font-weight: 700;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
          }

          .student-info-card {
            background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
            border-left: 4px solid #92400e;
          }
        `;

      default: // classic
        return `
          .certificate-container {
            font-family: 'Inter', sans-serif;
            background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
            position: relative;
            overflow: hidden;
          }

          .official-header {
            background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
            color: white;
            position: relative;
            overflow: hidden;
          }

          .school-name {
            font-family: 'Playfair Display', serif;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }

          .student-info-card {
            background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
            border-left: 4px solid #3b82f6;
          }
        `;
    }
  };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap');

        ${getTemplateStyles()}
        
        .official-header {
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          color: white;
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
          animation: float 20s infinite linear;
        }
        
        .school-name {
          font-family: 'Playfair Display', serif;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }
        
        .title-decoration {
          position: relative;
          display: inline-block;
        }
        
        .title-decoration::before,
        .title-decoration::after {
          content: '✦';
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          color: #3b82f6;
          font-size: 1.2em;
        }
        
        .title-decoration::before {
          left: -2rem;
        }
        
        .title-decoration::after {
          right: -2rem;
        }
        
        .student-info-card {
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          border-left: 4px solid #3b82f6;
          transition: all 0.3s ease;
        }
        
        .student-info-card:hover {
          transform: translateX(5px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }
        
        .info-item {
          position: relative;
          padding-left: 1.5rem;
        }
        
        .info-item::before {
          content: '•';
          position: absolute;
          left: 0;
          color: #3b82f6;
          font-weight: bold;
        }
        
        .signature-area {
          position: relative;
        }
        
        .signature-area::before {
          content: '';
          position: absolute;
          top: -10px;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
        }
        
        .watermark {
          position: absolute;
          font-size: 120px;
          font-weight: 800;
          color: rgba(59, 130, 246, 0.03);
          transform: rotate(-45deg);
          pointer-events: none;
          z-index: 0;
          font-family: 'Playfair Display', serif;
        }
        
        .decoration-circle {
          position: absolute;
          border: 2px solid rgba(59, 130, 246, 0.2);
          border-radius: 50%;
          pointer-events: none;
        }
        
        .gold-border {
          position: absolute;
          border: 2px solid #f59e0b;
          border-radius: 8px;
          pointer-events: none;
        }
        
        .seal {
          background: radial-gradient(circle, #f8fafc 40%, #e2e8f0 100%);
          border: 2px dashed #cbd5e1;
          position: relative;
        }
        
        .seal::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 60%;
          height: 60%;
          border: 2px solid #3b82f6;
          border-radius: 50%;
          opacity: 0.3;
        }
        
        @keyframes float {
          0% { transform: rotate(30deg) translateX(0) translateY(0); }
          100% { transform: rotate(30deg) translateX(-20px) translateY(-20px); }
        }
        
        @media print {
          .certificate-container {
            background: white !important;
            box-shadow: none !important;
          }
          
          .official-header {
            background: #1e40af !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .student-info-card {
            background: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      <div className="certificate-container w-[21cm] h-[29.7cm] p-12 text-[14px] leading-relaxed print:p-10 relative">
        {/* Cadre doré */}
        <div className="gold-border inset-8"></div>
        <div className="gold-border inset-10"></div>

        {/* En-tête officielle */}
        <div className="official-header text-center mb-12 rounded-2xl p-8 relative overflow-hidden">
          <div className="relative z-10">
            <div className="text-[12px] font-light uppercase tracking-widest text-blue-100 mb-1">
              RÉPUBLIQUE GABONAISE
            </div>
            <div className="text-[11px] text-blue-200 italic mb-3">
              Union - Travail - Justice
            </div>
            <div className="text-[11px] text-blue-300 mb-6">
              Ministère de l'Éducation Nationale
            </div>
            
            <div className="school-name text-2xl font-bold mb-2 tracking-wide">
              {schoolName}
            </div>
            <div className="text-[13px] text-blue-200 opacity-90">
              Établissement d'Enseignement Général
            </div>
          </div>
        </div>

    {/* Informations de contact */}



        {/* Titre du document */}
        <div className="text-center mb-12 relative">
          <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent"></div>
          <div className="inline-block bg-white px-8 py-4 relative">
            <h1 className="title-decoration text-2xl font-bold text-blue-900 mb-2">
              ATTESTATION DE SCOLARITÉ
            </h1>
            <div className="text-[12px] text-gray-600 font-semibold">
              N° REF: {schoolYear}-{student.nom.slice(0, 3).toUpperCase()}-{Math.random().toString(36).substr(2, 5).toUpperCase()}
            </div>
          </div>
        </div>

        {/* Corps de l'attestation */}
        <div className="mb-16 space-y-8 text-gray-800">
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
            <p className="text-justify leading-loose mb-6 text-gray-700">
              Je soussigné(e), <span className="font-semibold text-blue-800 bg-blue-50 px-2 py-1 rounded-md">{directorName}</span>, 
              Directeur(trice) de l'établissement <span className="font-semibold text-blue-800">{schoolName}</span>,
              certifie que :
            </p>

            <div className="student-info-card rounded-xl p-6 ml-4">
              <div className="space-y-4">
                <div className="info-item">
                  <div className="text-[12px] text-gray-600 uppercase tracking-wide mb-1">Nom complet</div>
                  <div className="font-semibold text-lg text-blue-900">
                    {student.prenom} <span className="uppercase">{student.nom}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div className="info-item">
                    <div className="text-[12px] text-gray-600 uppercase tracking-wide mb-1">Né(e) le</div>
                    <div className="font-semibold">{student.dateNaissance}</div>
                  </div>

                  <div className="info-item">
                    <div className="text-[12px] text-gray-600 uppercase tracking-wide mb-1">Lieu de naissance</div>
                    <div className="font-semibold">{student.lieuNaissance}</div>
                  </div>
                </div>

                <div className="info-item">
                  <div className="text-[12px] text-gray-600 uppercase tracking-wide mb-1">Classe</div>
                  <div className="font-semibold text-blue-700 text-lg">{student.classe}</div>
                </div>
              </div>
            </div>

            <p className="text-justify leading-loose mt-6 text-gray-700">
              est régulièrement inscrit(e) dans notre établissement pour l'année scolaire{" "}
              <span className="font-semibold text-blue-800 bg-yellow-50 px-2 py-1 rounded-md">{schoolYear}</span> 
              et y poursuit normalement sa scolarité.
            </p>
          </div>

          <div className="text-center italic text-gray-600 border-t border-blue-100 pt-6">
            <p className="text-[15px]">En foi de quoi, la présente attestation est délivrée à l'intéressé(e) pour servir et valoir ce que de droit.</p>
          </div>
        </div>

        {/* Signature et date */}
        <div className="flex justify-between items-end mt-20 signature-area">
          <div className="text-center">
            <div className="text-[12px] text-gray-600 mb-2">Cachet de l'établissement</div>
            <div className="seal w-40 h-32 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-[10px] text-gray-500 font-semibold">OFFICIEL</div>
                <div className="text-[8px] text-gray-400 mt-1">Apposer le cachet</div>
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[12px] text-gray-600 mb-4">
              Fait à {city}, le {currentDate}
            </div>
            <div className="space-y-2">
              <div className="border-t-2 border-blue-600 pt-2 w-56">
                <div className="text-[13px] font-semibold text-blue-800">{directorName}</div>
                <div className="text-[11px] text-gray-600">Directeur de l'établissement</div>
              </div>
              <div className="text-[10px] text-gray-500 italic">Signature</div>
            </div>
          </div>
        </div>

        {/* Pied de page */}
        <div className="absolute bottom-6 left-0 right-0 text-center">
          <div className="text-[10px] text-gray-500 italic space-y-1">
            <div>Document officiel - N° d'agrément: MEN/1234/2024</div>
            <div>À conserver précieusement - Toute altération rend ce document nul</div>
          </div>
        </div>

        {/* Filigrane de fond */}
        <div className="watermark top-1/4 left-1/4">OFFICIEL</div>
        <div className="watermark bottom-1/4 right-1/4">CSRO</div>

        {/* Éléments décoratifs */}
        <div className="decoration-circle top-20 right-12 w-8 h-8"></div>
        <div className="decoration-circle bottom-32 left-16 w-6 h-6"></div>
        <div className="decoration-circle top-44 left-24 w-4 h-4"></div>
        <div className="decoration-circle bottom-44 right-24 w-5 h-5"></div>
      </div>
    </>
  )
}