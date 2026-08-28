const fs = require('fs');

// Simuler localStorage
global.localStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = value;
  },
  removeItem(key) {
    delete this.store[key];
  }
};

// Charger les données d'enseignants de test
const enseignantsTest = JSON.parse(fs.readFileSync('enseignants-test.json', 'utf8'));
localStorage.setItem('enseignants', JSON.stringify(enseignantsTest));

console.log('✅ Données de test chargées');
console.log('Enseignant:', enseignantsTest[0].prenom, enseignantsTest[0].nom);
console.log('ID:', enseignantsTest[0].id);

// Simuler l'ajout d'un créneau
const creneauTest = {
  id: Date.now().toString(),
  enseignantId: enseignantsTest[0].id,
  matiere: "Français",
  classe: "5ème A",
  jour: "lundi",
  heureDebut: "08:00",
  heureFin: "09:00"
};

// Simuler le service enseignants
class ServiceEnseignants {
  constructor() {
    this.CLE_STOCKAGE_EMPLOI_DU_TEMPS = "emploiDuTemps";
  }

  obtenirEmploiDuTemps() {
    try {
      const donnees = localStorage.getItem(this.CLE_STOCKAGE_EMPLOI_DU_TEMPS);
      return donnees ? JSON.parse(donnees) : [];
    } catch {
      return [];
    }
  }

  ajouterCreneauEmploiDuTemps(creneau) {
    const emploiDuTemps = this.obtenirEmploiDuTemps();
    emploiDuTemps.push(creneau);
    localStorage.setItem(this.CLE_STOCKAGE_EMPLOI_DU_TEMPS, JSON.stringify(emploiDuTemps));
    return creneau;
  }

  supprimerCreneauEmploiDuTemps(creneauId) {
    const emploiDuTemps = this.obtenirEmploiDuTemps();
    const nouveauEmploiDuTemps = emploiDuTemps.filter(c => c.id !== creneauId);
    localStorage.setItem(this.CLE_STOCKAGE_EMPLOI_DU_TEMPS, JSON.stringify(nouveauEmploiDuTemps));
    return nouveauEmploiDuTemps.length !== emploiDuTemps.length;
  }

  obtenirEmploiDuTempsEnseignant(enseignantId) {
    return this.obtenirEmploiDuTemps().filter(c => c.enseignantId === enseignantId);
  }
}

const serviceEnseignants = new ServiceEnseignants();

// Test 1: Ajouter un créneau
console.log('\n🧪 Test 1: Ajout d\'un créneau');
console.log('Créneaux avant ajout:', serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id).length);

serviceEnseignants.ajouterCreneauEmploiDuTemps(creneauTest);

console.log('Créneaux après ajout:', serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id).length);
console.log('Créneau ajouté:', serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id)[0]);

// Test 2: Vérifier la persistance
console.log('\n🧪 Test 2: Vérification de la persistance');
const creneauxApresAjout = serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id);
console.log('Créneaux persistés:', creneauxApresAjout.length);

// Test 3: Ajouter un deuxième créneau
console.log('\n🧪 Test 3: Ajout d\'un deuxième créneau');
const creneauTest2 = {
  id: Date.now().toString() + '2',
  enseignantId: enseignantsTest[0].id,
  matiere: "Littérature",
  classe: "4ème B",
  jour: "mardi",
  heureDebut: "10:00",
  heureFin: "11:00"
};

serviceEnseignants.ajouterCreneauEmploiDuTemps(creneauTest2);
console.log('Créneaux après deuxième ajout:', serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id).length);

// Test 4: Supprimer un créneau
console.log('\n🧪 Test 4: Suppression d\'un créneau');
const creneauxAvantSuppression = serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id).length;
serviceEnseignants.supprimerCreneauEmploiDuTemps(creneauTest.id);
console.log('Créneaux après suppression:', serviceEnseignants.obtenirEmploiDuTempsEnseignant(enseignantsTest[0].id).length);

// Test 5: Vérifier que les données sont sauvegardées dans localStorage
console.log('\n🧪 Test 5: Vérification localStorage');
const tousLesCreneaux = serviceEnseignants.obtenirEmploiDuTemps();
console.log('Total des créneaux dans localStorage:', tousLesCreneaux.length);
console.log('Données localStorage:', JSON.stringify(tousLesCreneaux, null, 2));

console.log('\n✅ Tous les tests terminés!');
