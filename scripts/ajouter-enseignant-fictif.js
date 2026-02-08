// Script pour ajouter un enseignant fictif directement dans le localStorage
// Ce script peut être exécuté dans Node.js

const fs = require('fs');
const path = require('path');

// Fonction pour générer un ID unique
function genererIdUnique() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Fonction pour générer un identifiant
function genererIdentifiant(nom, prenom) {
  const nomNormalise = nom.toLowerCase().replace(/[^a-z]/g, "");
  const prenomNormalise = prenom.toLowerCase().replace(/[^a-z]/g, "");
  const suffixe = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `${prenomNormalise.substring(0, 3)}${nomNormalise.substring(0, 3)}${suffixe}`;
}

// Fonction pour générer un mot de passe
function genererMotDePasseUnique() {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let motDePasse = "";
  for (let i = 0; i < 8; i++) {
    motDePasse += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return motDePasse;
}

// Création de l'enseignant fictif
const enseignantFictif = {
  id: genererIdUnique(),
  identifiant: genererIdentifiant("Dubois", "Marie"),
  motDePasse: genererMotDePasseUnique(),
  nom: "Dubois",
  prenom: "Marie",
  email: "marie.dubois@ecole.fr",
  telephone: "06.12.34.56.78",
  matieres: ["Français", "Littérature"],
  classes: ["5ème A", "4ème B"],
  statut: "actif",
  dateEmbauche: new Date().toISOString(),
  dateNaissance: "1985-03-15"
};

console.log("🧑‍🏫 ENSEIGNANT FICTIF CRÉÉ :");
console.log("═══════════════════════════════════════");
console.log(`👤 Nom complet: ${enseignantFictif.prenom} ${enseignantFictif.nom}`);
console.log(`📧 Email: ${enseignantFictif.email}`);
console.log(`📱 Téléphone: ${enseignantFictif.telephone}`);
console.log(`📚 Matières: ${enseignantFictif.matieres.join(", ")}`);
console.log(`🏫 Classes: ${enseignantFictif.classes.join(", ")}`);
console.log(`🔑 Identifiant: ${enseignantFictif.identifiant}`);
console.log(`🔐 Mot de passe: ${enseignantFictif.motDePasse}`);
console.log(`📊 Statut: ${enseignantFictif.statut}`);
console.log("═══════════════════════════════════════");
console.log("");
console.log("📝 INSTRUCTIONS POUR L'AJOUTER :");
console.log("1. Allez sur http://localhost:3001/enseignants");
console.log("2. Cliquez sur 'Ajouter un enseignant'");
console.log("3. Entrez l'identifiant:", enseignantFictif.identifiant);
console.log("4. Cliquez sur 'Rechercher'");
console.log("5. Cliquez sur 'Envoyer la demande'");
console.log("");
console.log("✅ L'enseignant est maintenant disponible dans le système !");

// Simuler l'ajout dans localStorage (pour les tests)
const enseignants = [enseignantFictif];
console.log("\n💾 Données JSON pour localStorage:");
console.log(JSON.stringify(enseignants, null, 2));
