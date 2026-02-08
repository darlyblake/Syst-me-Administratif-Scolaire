// Script de configuration pour les tests
const fs = require('fs');

// Lire les données d'enseignants de test
const enseignantsTest = JSON.parse(fs.readFileSync('enseignants-test.json', 'utf8'));

console.log('=== CONFIGURATION DE TEST ===');
console.log('Enseignant de test créé:');
console.log('- ID:', enseignantsTest[0].id);
console.log('- Nom:', enseignantsTest[0].prenom + ' ' + enseignantsTest[0].nom);
console.log('- Matières:', enseignantsTest[0].matieres.join(', '));
console.log('- Classes:', enseignantsTest[0].classes.join(', '));
console.log('- Email:', enseignantsTest[0].email);
console.log('');
console.log('URL de test:');
console.log('http://192.168.1.64:3000/enseignants/' + enseignantsTest[0].id + '/emploi-du-temps');
console.log('');
console.log('Identifiants de connexion:');
console.log('- Utilisateur: freid');
console.log('- Mot de passe: 123456');
console.log('');
console.log('Procédure de test:');
console.log('1. Aller sur http://192.168.1.64:3000/connexion');
console.log('2. Se connecter avec freid / 123456');
console.log('3. Aller sur la page enseignants');
console.log('4. Cliquer sur l\'enseignant pour voir son emploi du temps');
console.log('5. Tester l\'ajout/suppression de créneaux');
