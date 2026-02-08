// Script pour ajouter un enseignant de test dans localStorage
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

// Création de l'enseignant de test
const enseignantTest = {
  id: genererIdUnique(),
  identifiant: genererIdentifiant("Martin", "Pierre"),
  motDePasse: genererMotDePasseUnique(),
  nom: "Martin",
  prenom: "Pierre",
  email: "pierre.martin@ecole.fr",
  telephone: "06.11.22.33.44",
  matieres: ["Mathématiques", "Physique"],
  classes: ["Terminale S", "Première S"],
  statut: "actif",
  dateEmbauche: new Date().toISOString(),
  dateNaissance: "1980-05-20"
};

console.log("🧑‍🏫 AJOUT D'UN ENSEIGNANT DE TEST");
console.log("=====================================");
console.log(`👤 Nom complet: ${enseignantTest.prenom} ${enseignantTest.nom}`);
console.log(`📧 Email: ${enseignantTest.email}`);
console.log(`📱 Téléphone: ${enseignantTest.telephone}`);
console.log(`📚 Matières: ${enseignantTest.matieres.join(", ")}`);
console.log(`🏫 Classes: ${enseignantTest.classes.join(", ")}`);
console.log(`🔑 Identifiant: ${enseignantTest.identifiant}`);
console.log(`🔐 Mot de passe: ${enseignantTest.motDePasse}`);
console.log(`📊 Statut: ${enseignantTest.statut}`);
console.log(`🆔 ID généré: ${enseignantTest.id}`);

// Simuler l'ajout dans localStorage
const enseignants = [enseignantTest];
const dataPath = path.join(__dirname, '..', 'enseignants-test.json');

try {
  fs.writeFileSync(dataPath, JSON.stringify(enseignants, null, 2));
  console.log(`\n✅ Données sauvegardées dans: ${dataPath}`);
  console.log("\n📝 Pour utiliser cet enseignant:");
  console.log(`   URL: http://localhost:3000/enseignants/${enseignantTest.id}/emploi-du-temps`);
  console.log(`   Identifiant: ${enseignantTest.identifiant}`);
  console.log(`   Mot de passe: ${enseignantTest.motDePasse}`);
} catch (error) {
  console.error("❌ Erreur lors de la sauvegarde:", error.message);
}
