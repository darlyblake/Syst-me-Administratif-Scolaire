"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Smartphone, Clock, CheckCircle, AlertCircle } from "lucide-react"
import { serviceEnseignants } from "@/services/enseignants.service"

export default function PointageTelephonePage() {
  const [etape, setEtape] = useState<"saisie" | "code" | "succes" | "erreur">("saisie")
  const [identifiant, setIdentifiant] = useState("")
  const [codeVerification, setCodeVerification] = useState("")
  const [codeGenere, setCodeGenere] = useState("")
  const [enseignantId, setEnseignantId] = useState("")
  const [message, setMessage] = useState("")

  const genererCode = () => {
    // Vérifier si l'enseignant existe
    const enseignants = serviceEnseignants.obtenirTousLesEnseignants()
    const enseignant = enseignants.find((e) => e.identifiant === identifiant && e.statut === "actif")

    if (!enseignant) {
      setMessage("Identifiant non trouvé ou enseignant inactif")
      setEtape("erreur")
      return
    }

    // Générer le code de vérification
    const session = serviceEnseignants.genererCodePointageTelephone(enseignant.id)
    setCodeGenere(session.codeVerification)
    setEnseignantId(enseignant.id)
    setEtape("code")

    // Simuler l'envoi du SMS (dans un vrai système, ceci enverrait un SMS)
    setMessage(`Code envoyé par SMS au ${enseignant.telephone}`)
  }

  const validerCode = () => {
    const codeValide = serviceEnseignants.validerCodePointageTelephone(codeVerification, enseignantId)

    if (codeValide) {
      setMessage("Pointage enregistré avec succès !")
      setEtape("succes")
    } else {
      setMessage("Code invalide ou expiré")
      setEtape("erreur")
    }
  }

  const recommencer = () => {
    setEtape("saisie")
    setIdentifiant("")
    setCodeVerification("")
    setCodeGenere("")
    setEnseignantId("")
    setMessage("")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Pointage par Téléphone</CardTitle>
          <CardDescription>Système de pointage sécurisé pour les enseignants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {etape === "saisie" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="identifiant">Identifiant enseignant</Label>
                <Input
                  id="identifiant"
                  placeholder="Votre identifiant..."
                  value={identifiant}
                  onChange={(e) => setIdentifiant(e.target.value)}
                />
              </div>
              <Button onClick={genererCode} className="w-full" disabled={!identifiant.trim()}>
                <Clock className="h-4 w-4 mr-2" />
                Générer le code de pointage
              </Button>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Un code de vérification sera envoyé par SMS à votre numéro enregistré.
                </AlertDescription>
              </Alert>
            </>
          )}

          {etape === "code" && (
            <>
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="code">Code de vérification</Label>
                <Input
                  id="code"
                  placeholder="Entrez le code à 6 chiffres..."
                  value={codeVerification}
                  onChange={(e) => setCodeVerification(e.target.value)}
                  maxLength={6}
                />
              </div>

              <div className="space-y-2">
                <Button onClick={validerCode} className="w-full" disabled={codeVerification.length !== 6}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Valider le pointage
                </Button>
                <Button variant="outline" onClick={recommencer} className="w-full bg-transparent">
                  Annuler
                </Button>
              </div>

              <div className="text-center text-sm text-gray-600">
                <p>
                  Code de démonstration: <strong>{codeGenere}</strong>
                </p>
                <p className="text-xs mt-1">Le code expire dans 5 minutes</p>
              </div>
            </>
          )}

          {etape === "succes" && (
            <>
              <div className="text-center">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">Pointage réussi !</h3>
                <p className="text-green-600">{message}</p>
                <p className="text-sm text-gray-600 mt-2">
                  Heure d'arrivée: {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <Button onClick={recommencer} className="w-full">
                Nouveau pointage
              </Button>
            </>
          )}

          {etape === "erreur" && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{message}</AlertDescription>
              </Alert>
              <Button onClick={recommencer} className="w-full">
                Réessayer
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
