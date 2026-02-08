"use client"

import { SchoolCertificateSelector } from './SchoolCertificateSelector'

export function CertificateTemplatesExample() {
  // Exemple d'étudiant
  const sampleStudent = {
    nom: "DUPONT",
    prenom: "Jean",
    dateNaissance: "15/03/2010",
    lieuNaissance: "Libreville",
    classe: "CM2 A"
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-4">
          Modèles de Certificats Scolaires
        </h1>
        <p className="text-center text-gray-600 max-w-2xl mx-auto">
          Découvrez nos différents modèles de certificats. Choisissez le style qui correspond
          le mieux à vos besoins institutionnels.
        </p>
      </div>

      <SchoolCertificateSelector
        student={sampleStudent}
        schoolName="COMPLEXE SCOLAIRE LA RÉUSSITE D'OWENDO"
        directorName="Dr. Jean-Paul OKOUMOU"
        schoolAddress="B.P: 16109 Estuaire"
        schoolPhone="077 94 74 10"
        city="Libreville"
        schoolYear="2024-2025"
      />
    </div>
  )
}
