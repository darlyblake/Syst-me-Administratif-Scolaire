import EmploiDuTempsClient from "./client"

export function generateStaticParams() {
  // Sample enseignant IDs for static generation
  return [
    { enseignantId: '1' },
    { enseignantId: '2' },
    { enseignantId: '3' },
  ]
}

export default function EmploiDuTempsPage() {
  return <EmploiDuTempsClient />
}
