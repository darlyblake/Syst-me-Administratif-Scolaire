// Script pour configurer les données de test
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

// Ajouter l'enseignant de test
const enseignantsTest = JSON.parse(fs.readFileSync('enseignants-test.json', 'utf8'));
localStorage.setItem('enseignants', JSON.stringify(enseignantsTest));

console.log('✅ Enseignant de test ajouté au localStorage');
console.log('ID:', enseignantsTest[0].id);
console.log('Nom:', enseignantsTest[0].prenom, enseignantsTest[0].nom);
console.log('Matières:', enseignantsTest[0].matieres.join(', '));
console.log('Classes:', enseignantsTest[0].classes.join(', '));
