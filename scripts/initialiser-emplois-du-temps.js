/**
 * Script d'initialisation des données d'emploi du temps
 * Crée des données de test dans le localStorage pour tester la page consolidée
 */

// Simulation du localStorage
const localStorage = {
  getItem: function(key) {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(key);
    }
    return null;
  },

  setItem: function(key, value) {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(key, value);
    }
  }
};

// Fonction pour générer un ID unique
function genererIdUnique() {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

console.log("🚀 Initialisation des données d'emploi du temps");
console.log("==============================================");

// Vérifier s'il y a déjà des données
const emploiDuTempsExistant = localStorage.getItem("emploiDuTemps");
if (emploiDuTempsExistant) {
  const nombreCreneaux = JSON.parse(emploiDuTempsExistant).length;
  console.log(`⚠️ ${nombreCreneaux} créneaux d'emploi du temps déjà existants`);
  console.log("💡 Utilisez cette commande pour effacer les données existantes:");
  console.log("   localStorage.removeItem('emploiDuTemps');");
} else {
  console.log("📋 Aucune donnée d'emploi du temps trouvée");
}

// Créer des enseignants fictifs avec leurs données complètes
const enseignantsTest = [
  {
    id: "1758533290658h1gvlrzs5", // ID existant de l'exemple
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

// Créer des créneaux d'emploi du temps réalistes
const creneauxEmploiDuTemps = [
  // Jean MARTIN - CP1
  {
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "lundi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },
  {
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "mardi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },
  {
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Physique-Chimie",
    jour: "mercredi",
    heureDebut: "10:00",
    heureFin: "11:00",
    salle: "B203"
  },
  {
    enseignantId: "1758533290658h1gvlrzs5",
    classe: "CP1",
    matiere: "Mathématiques",
    jour: "jeudi",
    heureDebut: "08:00",
    heureFin: "09:00",
    salle: "A101"
  },
  {
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
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "lundi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },
  {
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "mardi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },
  {
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Histoire-Géographie",
    jour: "mercredi",
    heureDebut: "14:00",
    heureFin: "15:00",
    salle: "C301"
  },
  {
    enseignantId: enseignantsTest[1].id,
    classe: "CE1",
    matiere: "Français",
    jour: "jeudi",
    heureDebut: "09:00",
    heureFin: "10:00",
    salle: "A102"
  },
  {
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
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "lundi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  },
  {
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "mardi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  },
  {
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Espagnol",
    jour: "mercredi",
    heureDebut: "15:00",
    heureFin: "16:00",
    salle: "A103"
  },
  {
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "jeudi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  },
  {
    enseignantId: enseignantsTest[2].id,
    classe: "CM1",
    matiere: "Anglais",
    jour: "vendredi",
    heureDebut: "11:00",
    heureFin: "12:00",
    salle: "B201"
  }
];

console.log(`\n📝 Création de ${enseignantsTest.length} enseignants et ${creneauxEmploiDuTemps.length} créneaux d'emploi du temps...`);

// Sauvegarder les enseignants
localStorage.setItem("enseignants", JSON.stringify(enseignantsTest));
console.log("✅ Enseignants sauvegardés");

// Sauvegarder les emplois du temps
localStorage.setItem("emploiDuTemps", JSON.stringify(creneauxEmploiDuTemps));
console.log("✅ Emplois du temps sauvegardés");

// Vérifier les données sauvegardées
const enseignantsSauvegardes = JSON.parse(localStorage.getItem("enseignants"));
const emploisSauvegardes = JSON.parse(localStorage.getItem("emploiDuTemps"));

console.log("\n📊 Vérification des données sauvegardées:");
console.log("- Enseignants:", enseignantsSauvegardes.length);
console.log("- Créneaux d'emploi du temps:", emploisSauvegardes.length);

// Afficher un résumé par classe
console.log("\n🏫 Résumé par classe:");
const classes = ["CP1", "CE1", "CM1"];
classes.forEach(classe => {
  const creneauxClasse = emploisSauvegardes.filter(c => c.classe === classe);
  const enseignantsClasse = [...new Set(creneauxClasse.map(c => c.enseignantId))];
  console.log(`- ${classe}: ${creneauxClasse.length} cours avec ${enseignantsClasse.length} enseignant(s)`);
});

// Instructions pour l'utilisateur
console.log("\n📋 Instructions:");
console.log("1. Ouvrez http://192.168.1.68:3000/tableau-bord");
console.log("2. Connectez-vous avec les identifiants d'un enseignant:");
console.log("   - Jean MARTIN: mar123 / password123");
console.log("   - Marie DUBOIS: dub456 / password456");
console.log("   - Carlos GARCIA: gar789 / password789");
console.log("3. Cliquez sur 'Emplois du temps consolidés' dans Actions rapides");
console.log("4. Sélectionnez une classe pour voir l'emploi du temps complet");

console.log("\n✨ Données d'emploi du temps initialisées avec succès!");
console.log("🔗 Prêt à tester la page d'emploi du temps consolidé.");
