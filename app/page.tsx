import { redirect } from 'next/navigation'

export default function PageAccueil() {
  // Redirection côté serveur vers la page de connexion
  redirect('/connexion')
}
