/**
 * Script d'initialisation du localStorage pour les emplois du temps
 * À exécuter dans la console du navigateur sur http://192.168.1.68:3000
 */

// Fonction pour générer un ID unique
function genererIdUnique() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

// Vérifier le localStorage actuel
console.log("🔍 Vérification du localStorage actuel...");
console.log("Enseignants existants:", localStorage.getItem("enseignants") ? "✅ Présents" : "❌ Absents");
console.log("Emplois du temps existants:", localStorage.getItem("emploiDuTemps") ? "✅ Présents" : "❌ Absents");

// Créer les enseignants
const enseignantsTest = [
  {
    id: "1758533290658h1gvlrzs5",
    nom: "MARTIN",
    prenom: "Jean",
    identifiant: "mar123",
    motDePasse: "password123",
    email: "jean.martin@ecole.fr",
    telephone: "01-23-45-67-89",
    matieres: ["Mathématiques", "Physique-Chimie"],
    classes: ["CP1", "CP2"],
    statut: "actif",
    dateEmbauche: "2024-01-15T00:00:00.000Z"
  },
  {
    id: genererIdUnique(),
    nom: "DUBOIS",
    prenom: "Marie",
    identifiant: "dub456",
    motDePasse: "password456",
    email: "marie.dubois@ecole.fr",
    telephone: "01-23-45-67-90",
    matieres: ["Français", "Histoire-Géographie"],
    classes: ["CE1", "CE2"],
    statut: "actif",
    dateEmbauche: "2024-01-10T00:00:00.000Z"
  },
  {
    id: genererIdUnique(),
    nom: "GARCIA",
    prenom: "Carlos",
    identifiant: "gar789",
    motDePasse: "password789",
    email: "carlos.garcia@ecole.fr",
    telephone: "01-23-45-67-91",
    matieres: ["Anglais", "Espagnol"],
    classes: ["CM1", "CM2"],
    statut: "actif",
    dateEmbauche: "2024-01-20T00:00:00.000Z"
  }
];

// Créer les créneaux d'emploi du temps
const creneauxEmploiDuTemps = [
  // Jean MARTIN - CP1
  {
    id: genererIdUnique(),
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },
  {
    id: genererIdUnique(),
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "mardi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },
  {
    id: genererIdUnique(),
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Physique-Chimie",
    jour: "mercredi",
    heureDebut: "10:00",
    heureFin: "11:00",
    salle: "B203"
  },
  {
    id: genererIdUnique(),
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "jeudi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },
  {
    id: genererIdUnique(),
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "vendredi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },

  // Marie DUBOIS - CE1
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "lundi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "mardi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Histoire-Géographie",
    jour: "mercredi",
    heureDebut: "14:00",
    heureFin: "15:00",
    salle: "C301"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "jeudi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "vendredi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },

  // Carlos GARCIA - CM1
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "lundi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "mardi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Espagnol",
    jour: "mercredi",
    heureDebut: "15:00",
    heureFin: "16:00",
    salle: "A103"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "jeudi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  },
  {
    id: genererIdUnique(),
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "vendredi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  }
];

try {
  // Sauvegarder les enseignants
  localStorage.setItem("enseignants", JSON.stringify(enseignantsTest));
  console.log("✅ Enseignants sauvegardés:", enseignantsTest.length);

  // Sauvegarder les emplois du temps
  localStorage.setItem("emploiDuTemps", JSON.stringify(creneauxEmploiDuTemps));
  console.log("✅ Emplois du temps sauvegardés:", creneauxEmploiDuTemps.length);

  // Vérifier les données sauvegardées
  const enseignantsSauvegardes = JSON.parse(localStorage.getItem("enseignants"));
  const emploisSauvegardes = JSON.parse(localStorage.getItem("emploiDuTemps"));

  console.log("\n📊 Vérification finale:");
  console.log("- Enseignants:", enseignantsSauvegardes.length);
  console.log("- Créneaux d'emploi du temps:", emploisSauvegardes.length);

  // Afficher les identifiants
  console.log("\n👤 Identifiants de connexion:");
  enseignantsSauvegardes.forEach(ens => {
    console.log(`- ${ens.prenom} ${ens.nom}: ${ens.identifiant} / ${ens.motDePasse}`);
  });

  console.log("\n✨ Données initialisées avec succès!");
  console.log("🔗 Vous pouvez maintenant tester la page d'emploi du temps consolidé.");

} catch (error) {
  console.error("❌ Erreur lors de la sauvegarde:", error);
}

// Instructions pour l'utilisateur
console.log("\n📋 Prochaines étapes:");
console.log("1. Allez sur http://192.168.1.68:3000/tableau-bord");
console.log("2. Connectez-vous avec un des comptes créés");
console.log("3. Cliquez sur 'Emplois du temps consolidés'");
console.log("4. Sélectionnez une classe pour voir l'emploi du temps");
