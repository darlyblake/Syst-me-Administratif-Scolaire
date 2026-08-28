"use client"

import { useState } from "react"
import { ArrowLeft, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NouvelleInscriptionModal from "@/components/NouvelleInscriptionModal"
import { Button } from "@/components/ui/button"

export default function NouvelleInscription() {
  const router = useRouter()
  const [showModal, setShowModal] = useState(true)

  const handleClose = () => {
    router.push("/ecole/inscriptions")
  }

  const handleSuccess = () => {
    setShowModal(false)
    router.push("/ecole/inscriptions")
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/ecole/inscriptions">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <UserPlus className="h-6 w-6" />
              Nouvelle Inscription
            </h1>
            <p className="text-gray-600">Formulaire d'inscription d'un nouvel élève</p>
          </div>
        </div>

        <NouvelleInscriptionModal
          isOpen={showModal}
          onClose={handleClose}
          onSuccess={handleSuccess}
          typeInscription="inscription"
        />
      </div>
    </div>
  )
}
