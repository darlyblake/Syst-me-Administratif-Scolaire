// Script pour vérifier les données disponibles
console.log("🔍 Vérification des données des enseignants");
console.log("==========================================");

// Vérifier si localStorage est disponible
if (typeof localStorage !== 'undefined') {
  const enseignantsData = localStorage.getItem('enseignants');

  if (enseignantsData) {
    const enseignants = JSON.parse(enseignantsData);
    console.log(`📊 ${enseignants.length} enseignant(s) trouvé(s):`);

    enseignants.forEach((e, index) => {
      console.log(`\n${index + 1}. ID: ${e.id}`);
      console.log(`   Nom: ${e.prenom} ${e.nom}`);
      console.log(`   Email: ${e.email}`);
      console.log(`   Matières: [${e.matieres ? e.matieres.join(', ') : 'aucune'}]`);
      console.log(`   Classes: [${e.classes ? e.classes.join(', ') : 'aucune'}]`);
      console.log(`   Statut: ${e.statut}`);
    });
  } else {
    console.log("❌ Aucune donnée d'enseignants trouvée dans localStorage");
  }

  // Vérifier aussi les emplois du temps
  const emploisDuTempsData = localStorage.getItem('emploiDuTemps');
  if (emploisDuTempsData) {
    const emplois = JSON.parse(emploisDuTempsData);
    console.log(`\n📅 ${emplois.length} créneau(x) d'emploi du temps trouvé(s)`);
  } else {
    console.log("\n📅 Aucun créneau d'emploi du temps trouvé");
  }
} else {
  console.log("❌ localStorage non disponible dans cet environnement");
}
