# État des tests et validations

**Projet :** Système Administratif Scolaire  
**Branche :** `main`  
**Mise à jour :** 28 octobre 2026

Ce document distingue les tests fonctionnels validés pendant les vérifications du projet des contrôles automatisés et des essais qui restent à faire. Un résultat n'est pas marqué « validé » si seule la compilation ou l'ouverture publique d'une page a été vérifiée.

## 1. Tests fonctionnels validés

| Module | État | Portée déclarée de la validation |
|---|---|---|
| Registre d'appel | **Validé — tests passés** | Les tests fonctionnels du registre d'appel ont été déclarés terminés et réussis. |
| Notes et résultats | **Tests fonctionnels déclarés terminés** | Les tests fonctionnels de ce module ont été déclarés terminés. La vérification complète des nouvelles modifications de bulletins avec une session authentifiée et des données Supabase réelles reste à confirmer. |

### Registre d'appel

Le registre d'appel est le module pour lequel l'ensemble des tests a été déclaré réussi. Cette validation fonctionnelle doit être distinguée de la compilation générale du projet.

### Notes et résultats

Les tests fonctionnels du module Notes et résultats ont été déclarés terminés. Toutefois, les changements récents apportés à la génération des bulletins doivent encore être vérifiés avec des données réelles : récupération des notes, calcul des moyennes, classement et rendu du PDF. Il ne faut donc pas interpréter le statut des tests antérieurs comme une validation exhaustive de ces changements récents.

## 2. Contrôles automatisés et déploiement

| Contrôle | Résultat | Limite |
|---|---|---|
| GitHub Actions — validation de compilation Next.js | **Réussi** | La configuration de compilation ignore actuellement la validation TypeScript et ESLint. |
| Déploiement Vercel de la branche `main` | **READY** | Le statut READY confirme le déploiement, pas la validation fonctionnelle de toutes les pages. |
| Réponse HTTP des pages Notes/Bulletins et Documents | **HTTP 200** | Les vérifications publiques non authentifiées ne valident pas les parcours avec une session et les données réelles. |

Références du contrôle du 28 octobre 2026 :
- Commit : [bceb5798cf15bffdca98e10cd92538380074e88b](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/commit/bceb5798cf15bffdca98e10cd92538380074e88b)
- Exécution GitHub Actions : [Validate Next.js build](https://github.com/darlyblake/Syst-me-Administratif-Scolaire/actions/runs/40703995888)
- Application : https://syst-me-administratif-scolaire.vercel.app/

## 3. Tests restant à effectuer

| Module / parcours | État | Vérification attendue |
|---|---|---|
| Bulletins avec données réelles | À vérifier | Ouvrir une session autorisée, récupérer les notes d'un élève réel, vérifier les matières et les périodes. |
| Moyennes et classements | À vérifier sur données réelles | Comparer les moyennes normalisées sur 20 et les rangs affichés avec un calcul de contrôle. |
| PDF des bulletins | À vérifier | Générer, ouvrir et imprimer le PDF ; contrôler les informations et la mise en page. |
| Documents administratifs | À vérifier | Générer chaque document pour un élève réel et contrôler les noms, la classe, l'année scolaire, les dates et l'établissement. |
| Impression des documents | **Non validée** | Vérifier le rendu imprimé et toutes les informations affichées sur le document final. |
| TypeScript et ESLint | Non confirmés par la CI actuelle | Exécuter séparément les contrôles de types et de lint, puis traiter les erreurs éventuelles. |

## 4. Conclusion

La validation fonctionnelle déclarée est positive pour le **registre d'appel** et les tests fonctionnels du module **Notes et résultats** ont été déclarés terminés. La compilation automatisée et le déploiement sont également réussis.

En revanche, la validation finale des bulletins modifiés avec des données authentifiées, ainsi que le rendu PDF et l'impression des documents administratifs, ne doivent pas être présentés comme terminés tant que ces essais n'ont pas été effectués.