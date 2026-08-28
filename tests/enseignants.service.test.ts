import { serviceEnseignants } from "../services/enseignants.service.ts";

describe("ServiceEnseignants", () => {
  let enseignantId: string;

  it("should add a new enseignant", () => {
    const enseignant = serviceEnseignants.ajouterEnseignant({
      nom: "Test",
      prenom: "User",
      dateNaissance: "1990-01-01",
      email: "test.user@example.com",
      telephone: "0123456789",
      matieres: ["Math"],
      classes: ["6ème A"],
      statut: "actif",
      dateEmbauche: new Date().toISOString(),
    });
    expect(enseignant).toHaveProperty("id");
    expect(enseignant.identifiant).toMatch(/^[a-z]{3}[a-z]{3}\d{3}$/);
    enseignantId = enseignant.id;
  });

  it("should get enseignant by identifiant", () => {
    const enseignant = serviceEnseignants.obtenirEnseignantParIdentifiant(
      serviceEnseignants.obtenirTousLesEnseignants()[0].identifiant
    );
    expect(enseignant).not.toBeNull();
  });

  it("should update enseignant", () => {
    const result = serviceEnseignants.mettreAJourEnseignant(enseignantId, { telephone: "0987654321" });
    expect(result).toBe(true);
    const enseignant = serviceEnseignants.obtenirTousLesEnseignants().find(e => e.id === enseignantId);
    expect(enseignant?.telephone).toBe("0987654321");
  });

  it("should assign classes", () => {
    const result = serviceEnseignants.assignerClasses(enseignantId, ["5ème B", "4ème A"]);
    expect(result).toBe(true);
    const enseignant = serviceEnseignants.obtenirTousLesEnseignants().find(e => e.id === enseignantId);
    expect(enseignant?.classes).toEqual(["5ème B", "4ème A"]);
  });

  it("should delete enseignant", () => {
    const result = serviceEnseignants.supprimerEnseignant(enseignantId);
    expect(result).toBe(true);
    const enseignant = serviceEnseignants.obtenirTousLesEnseignants().find(e => e.id === enseignantId);
    expect(enseignant).toBeUndefined();
  });
});
