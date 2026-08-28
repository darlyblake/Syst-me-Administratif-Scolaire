// Script temporaire pour vérifier les enseignants disponibles
const fs = require('fs');
const path = require('path');

// Simuler le service enseignants pour récupérer les données
const enseignantsData = localStorage.getItem ? JSON.parse(localStorage.getItem('enseignants') || '[]') : [];

console.log('Enseignants disponibles:');
if (enseignantsData.length === 0) {
  console.log('Aucun enseignant trouvé dans le localStorage');
} else {
  enseignantsData.forEach(e => {
    console.log(`- ID: ${e.id}, Nom: ${e.prenom} ${e.nom}, Matières: [${e.matieres ? e.matieres.join(', ') : 'aucune'}], Classes: [${e.classes ? e.classes.join(', ') : 'aucune'}]`);
  });
}
