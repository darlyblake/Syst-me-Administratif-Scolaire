// Script pour créer un enseignant fictif
// À exécuter dans la console du navigateur sur la page /enseignants

// Fonction pour créer un enseignant fictif
function creerEnseignantFictif() {
  const enseignant = {
    nom: "Dubois",
    prenom: "Marie",
    email: "marie.dubois@ecole.fr",
    telephone: "06.12.34.56.78",
    matieres: ["Français", "Littérature"],
    classes: ["5ème A", "4ème B"],
    statut: "actif",
    dateNaissance: "1985-03-15"
  }

  // Ajouter l'enseignant via le service
  const nouvelEnseignant = serviceEnseignants.ajouterEnseignant(enseignant)

  console.log("✅ Enseignant créé avec succès !")
  console.log("📋 Informations de l'enseignant :")
  console.log("- Nom complet:", nouvelEnseignant.prenom, nouvelEnseignant.nom)
  console.log("- Email:", nouvelEnseignant.email)
  console.log("- Téléphone:", nouvelEnseignant.telephone)
  console.log("- Matières:", nouvelEnseignant.matieres.join(", "))
  console.log("- Classes:", nouvelEnseignant.classes.join(", "))
  console.log("- Statut:", nouvelEnseignant.statut)
  console.log("🔑 Identifiant:", nouvelEnseignant.identifiant)
  console.log("🔐 Mot de passe:", nouvelEnseignant.motDePasse)

  return nouvelEnseignant
}

// Exécuter la fonction
const enseignantCree = creerEnseignantFictif()

// Afficher les instructions pour l'utilisateur
console.log("\n📝 Pour ajouter cet enseignant dans l'interface :")
console.log("1. Allez sur la page /enseignants")
console.log("2. Cliquez sur 'Ajouter un enseignant'")
console.log("3. Entrez l'identifiant:", enseignantCree.identifiant)
console.log("4. Cliquez sur 'Rechercher'")
console.log("5. Cliquez sur 'Envoyer la demande'")
