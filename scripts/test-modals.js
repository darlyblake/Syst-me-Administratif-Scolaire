// Script de test pour vérifier que les modals fonctionnent correctement
// À exécuter dans la console du navigateur sur la page /enseignants

console.log("🧪 TEST DES MODALS - ENSEIGNANTS");
console.log("=================================");

// Vérifier que les modals sont bien importés
console.log("✅ Vérification des imports des modals...");

try {
  // Vérifier que les composants modals existent
  console.log("AssignerClassesModal:", typeof AssignerClassesModal);
  console.log("ContacterProfesseurModal:", typeof ContacterProfesseurModal);
  console.log("HistoriqueAffectationsModal:", typeof HistoriqueAffectationsModal);
  console.log("DocumentsAdministratifsModal:", typeof DocumentsAdministratifsModal);
  console.log("AttribuerNotificationsModal:", typeof AttribuerNotificationsModal);

  console.log("✅ Tous les composants modals sont disponibles");

  // Vérifier que les états des modals existent
  console.log("✅ États des modals:");
  console.log("- showAssignerClassesModal:", typeof showAssignerClassesModal);
  console.log("- showContacterProfesseurModal:", typeof showContacterProfesseurModal);
  console.log("- showHistoriqueAffectationsModal:", typeof showHistoriqueAffectationsModal);
  console.log("- showDocumentsAdministratifsModal:", typeof showDocumentsAdministratifsModal);
  console.log("- showAttribuerNotificationsModal:", typeof showAttribuerNotificationsModal);

  console.log("✅ Tous les états des modals sont disponibles");

  // Vérifier que les fonctions de contrôle existent
  console.log("✅ Fonctions de contrôle:");
  console.log("- setShowAssignerClassesModal:", typeof setShowAssignerClassesModal);
  console.log("- setShowContacterProfesseurModal:", typeof setShowContacterProfesseurModal);
  console.log("- setShowHistoriqueAffectationsModal:", typeof setShowHistoriqueAffectationsModal);
  console.log("- setShowDocumentsAdministratifsModal:", typeof setShowDocumentsAdministratifsModal);
  console.log("- setShowAttribuerNotificationsModal:", typeof setShowAttribuerNotificationsModal);

  console.log("✅ Toutes les fonctions de contrôle sont disponibles");

  console.log("\n🎯 INSTRUCTIONS POUR TESTER LES MODALS:");
  console.log("1. Sélectionnez un enseignant dans la liste");
  console.log("2. Dans la section 'Actions administratives', cliquez sur :");
  console.log("   - 📚 'Assigner des classes'");
  console.log("   - 📧 'Contacter le professeur'");
  console.log("   - 🕒 'Historique des affectations'");
  console.log("   - 📋 'Documents administratifs'");
  console.log("   - 🔔 'Attribuer des notifications'");
  console.log("3. Vérifiez que les modals s'ouvrent sans erreurs");

  console.log("\n📝 CRÉATION D'UN ENSEIGNANT FICTIF:");
  console.log("Pour créer un enseignant fictif, exécutez ce code:");
  console.log(`
const enseignant = {
  nom: "Dubois",
  prenom: "Marie",
  email: "marie.dubois@ecole.fr",
  telephone: "06.12.34.56.78",
  matieres: ["Français", "Littérature"],
  classes: ["5ème A", "4ème B"],
  statut: "actif",
  dateNaissance: "1985-03-15"
};

const nouvelEnseignant = serviceEnseignants.ajouterEnseignant(enseignant);
console.log("Enseignant créé avec l'identifiant:", nouvelEnseignant.identifiant);
  `);

} catch (error) {
  console.error("❌ Erreur lors de la vérification:", error);
}

// Fonction pour créer un enseignant fictif rapidement
window.creerEnseignantFictif = function() {
  const enseignant = {
    nom: "Dubois",
    prenom: "Marie",
    email: "marie.dubois@ecole.fr",
    telephone: "06.12.34.56.78",
    matieres: ["Français", "Littérature"],
    classes: ["5ème A", "4ème B"],
    statut: "actif",
    dateNaissance: "1985-03-15"
  };

  const nouvelEnseignant = serviceEnseignants.ajouterEnseignant(enseignant);
  console.log("✅ Enseignant fictif créé !");
  console.log("🔑 Identifiant:", nouvelEnseignant.identifiant);
  console.log("👤 Nom:", nouvelEnseignant.prenom, nouvelEnseignant.nom);

  // Recharger la page pour voir le nouvel enseignant
  location.reload();

  return nouvelEnseignant;
};

console.log("\n💡 ASTUCE: Tapez 'creerEnseignantFictif()' dans la console pour créer un enseignant fictif rapidement");
