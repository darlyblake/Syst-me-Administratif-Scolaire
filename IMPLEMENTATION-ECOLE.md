# Plan d'Implémentation - Interface École

Ce fichier suit l'avancement de l'implémentation des fonctionnalités de l'interface École selon les spécifications du document `INTERFACE-ECOLE.md`.

## Fonctionnalités Actuelles (Déjà Implémentées)

- [x] Structure de l'application par rôles (admin, ecole, parents)
- [x] Page de connexion unique avec 3 onglets
- [x] Middleware de protection des routes par rôle
- [x] Tableau de bord basique avec statistiques
- [x] Gestion des élèves (liste, filtres, recherche, export)
- [x] Gestion des enseignants
- [x] Gestion des paiements (basique)
- [x] Paramètres de l'école

---

## Phase 1 : Fonctionnalités Essentielles

### 1. Gestion des Inscriptions

#### Nouvelle Inscription
- [x] Formulaire complet d'inscription
  - [x] Informations personnelles de l'enfant
  - [x] Informations des parents
  - [x] Contacts d'urgence
  - [x] Informations médicales
  - [x] Choix de la classe
  - [x] Options supplémentaires (cantine, transport, tenue, etc.)
  - [x] Photo de l'enfant
- [x] Calcul automatique des frais
- [x] Génération du code unique pour l'enfant
- [x] Génération du code QR pour la fiche d'inscription
- [x] Impression de la fiche avec code QR
- [x] Validation par l'administration

#### Réinscription
- [x] Formulaire pré-rempli avec l'année précédente
- [x] Mise à jour des informations (adresse, contacts, etc.)
- [x] Changement de classe automatique
- [x] Choix des options pour la nouvelle année
- [x] Calcul des frais selon les options
- [x] Validation et paiement

#### Transfert d'Élève
- [x] Réception d'un élève venant d'une autre école
- [x] Import du fichier transférable via code unique
- [x] Validation des informations
- [x] Intégration dans le système
- [x] Génération d'un nouveau code local

#### Statistiques d'Inscription
- [x] Nombre d'inscriptions par jour/semaine/mois
- [x] Répartition par classe
- [x] Répartition par âge
- [x] Taux de réinscription
- [x] Comparaison avec les années précédentes

### 2. Gestion des Notes et Bulletins

#### Saisie des Notes
- [x] Saisie par matière et par classe
- [x] Saisie par trimestre
- [x] Saisie par évaluation
- [x] Notes chiffrées et appréciations
- [x] Moyennes automatiques
- [x] Classements

#### Bulletins
- [x] Génération automatique des bulletins
- [x] Bulletins par trimestre
- [x] Bulletin annuel
- [x] Notes et moyennes
- [x] Appréciations des enseignants
- [x] Statistiques de classe
- [x] Signature du directeur
- [x] Envoi aux parents

#### Appréciations
- [x] Appréciations par matière
- [x] Appréciation globale
- [x] Commentaires personnalisés
- [x] Observations du conseil de classe

#### Statistiques
- [x] Moyennes de classe
- [x] Répartition des notes
- [x] Évolution dans le temps
- [x] Comparaison inter-classes
- [x] Graphiques et visualisations

### 3. Gestion des Absences

#### Pointage des Présences
- [x] Pointage quotidien des élèves
- [x] Pointage par classe
- [x] Pointage individuel
- [x] Heures d'arrivée et de départ
- [x] Statut (présent, absent, retard)
- [x] Motif de l'absence
- [x] Justificatifs

#### Registre d'Appel
- [x] Registre d'appel par classe
- [x] Statut (présent, absent, retard, excusé)
- [x] Date de l'appel
- [x] Modification du statut
- [x] Calcul du taux de présence
- [x] Statistiques d'appel

#### Signalement par Parents
- [x] Réception des signalements d'absence
- [x] Validation des justificatifs
- [x] Pièces jointes (certificats médicaux)
- [x] Enregistrement dans le système
- [x] Notification à l'enseignant

#### Statistiques de Présence
- [x] Taux de présence par élève
- [x] Taux de présence par classe
- [x] Historique des absences
- [x] Rapports mensuels/trimestriels
- [x] Alertes d'absences répétées

#### Justifications
- [x] Gestion des justificatifs
- [x] Validation par l'administration
- [x] Stockage des documents
- [x] Suivi des justifications en attente

### 4. Communication avec les Parents

#### Messagerie
- [x] Messagerie interne avec les parents
- [x] Messagerie par classe
- [x] Messagerie individuelle
- [x] Pièces jointes
- [x] Historique des conversations
- [x] Notifications de nouveaux messages

#### Notifications
- [x] Création de notifications
- [x] Types de notifications (convocations, paiements, absences, notes, événements, urgences)
- [x] Destinataires (tous les parents, par classe, individuel)
- [x] Programmation des envois
- [x] Statistiques d'ouverture

#### Convocations
- [x] Convocations aux réunions parents-professeurs
- [x] Convocations aux conseils de classe
- [x] Convocations administratives
- [x] Suivi des réponses
- [x] Rappels automatiques

#### Demandes de Rendez-vous
- [x] Réception des demandes
- [x] Calendrier des disponibilités
- [x] Validation des rendez-vous
- [x] Confirmations automatiques
- [x] Rappels avant le rendez-vous

---

## Phase 2 : Fonctionnalités Importantes

### 5. Module Comptabilité

#### Comptes Généraux
- [x] Plan comptable personnalisable
- [x] Création de comptes
- [x] Hiérarchie des comptes
- [x] Solde des comptes
- [x] Mouvements de comptes
- [x] Types de comptes (recettes, dépenses personnel, dépenses opérationnelles, etc.)

#### Gestion de la Paie du Personnel

##### Calcul Automatique des Salaires
- [x] Pour le personnel permanent (salaire mensuel)
  - [x] Salaire de base mensuel
  - [x] Primes et avantages
  - [x] Déductions (impôts, sécurité sociale)
  - [x] Congés payés
  - [x] Absences non rémunérées
  - [x] Heures supplémentaires
  - [x] Net à payer
- [x] Pour le personnel horaire (journaliers, vacataires)
  - [x] Taux horaire
  - [x] Heures travaillées (du pointage)
  - [x] Heures supplémentaires avec taux majoré
  - [x] Calcul automatique : heures × taux
  - [x] Validation par supervision
  - [x] Reçu de paiement
- [x] Pour le personnel journalier (intérimaires)
  - [x] Taux journalier
  - [x] Jours travaillés
  - [x] Calcul automatique : jours × taux
  - [x] Validation par supervision
  - [x] Reçu de paiement

##### Génération des Fiches de Paie
- [x] Fiche de paie individuelle pour chaque employé
- [x] Détails de la période de paie
- [x] Format PDF standardisé
- [x] Signature du comptable/directeur
- [x] Envoi par email (optionnel)

##### Historique des Paiements
- [x] Historique complet des paiements de personnel
- [x] Par employé et par période
- [x] Détails de chaque paiement
- [x] Reçus téléchargeables
- [x] Statistiques de masse salariale

##### Rapports de Paie
- [x] Masse salariale par période
- [x] Par type de personnel
- [x] Par département
- [x] Évolution dans le temps
- [x] Comparaison inter-périodes
- [x] Budget vs Réel

#### Autres Dépenses
- [x] Catégories de dépenses (loyer, électricité, eau, etc.)
- [x] Enregistrement des dépenses
- [x] Suivi budgétaire
- [x] Rapports de dépenses

#### Rapports Financiers
- [x] Bilan
- [x] Compte de résultat
- [x] Rapport de trésorerie
- [x] Export en Excel/PDF

### 6. Gestion du Personnel

#### Types de Personnel
- [x] Enseignants permanents
- [x] Enseignants vacataires
- [x] Personnel administratif
- [x] Personnel de service
- [x] Journaliers
- [x] Intérimaires

#### Profil du Personnel
- [x] Informations personnelles complètes
- [x] Type de contrat
- [x] Poste et fonction
- [x] Date d'embauche
- [x] Type de rémunération
- [x] Taux horaire ou salaire mensuel
- [x] Heures de travail prévues
- [x] Statut (actif, inactif, congé, suspendu)
- [x] Informations bancaires
- [x] Documents (contrat, CV, diplômes)

#### Pointage du Personnel
- [x] Pointage quotidien
- [x] Méthodes (manuel, téléphone, QR code, badgeuse)
- [x] Heures d'arrivée et de départ
- [x] Calcul automatique des heures travaillées
- [x] Statistiques de présence
- [x] Validation par la supervision

#### Heures Supplémentaires
- [x] Enregistrement des heures supplémentaires
- [x] Taux majoré (1.25x, 1.5x, 2x)
- [x] Validation par la direction
- [x] Intégration dans le calcul de paie
- [x] Rapports d'heures supplémentaires

#### Congés et Absences
- [x] Demande de congés (payés, sans solde, maladie)
- [x] Solde de congés par employé
- [x] Validation des demandes
- [x] Calcul automatique de l'impact sur la paie
- [x] Historique des congés
- [x] Planning des congés

#### Emploi du Temps
- [x] Création de l'emploi du temps
- [x] Par classe et par enseignant
- [x] Gestion des créneaux horaires
- [x] Modifications en temps réel
- [x] Export et impression

#### Évaluation du Personnel
- [x] Évaluations par les parents
- [x] Évaluations par l'administration
- [x] Statistiques de performance
- [x] Rapports d'évaluation

#### Heures de Vacataires
- [x] Enregistrement des heures travaillées
- [x] Calcul automatique du montant
- [x] Taux horaire configurable
- [x] Validation des heures
- [x] Statistiques de paiement

#### États de Salaire
- [x] Génération des fiches de paie
- [x] Salaire de base
- [x] Heures supplémentaires
- [x] Primes et déductions
- [x] Calcul du salaire net
- [x] Statut (brouillon, validé, payé)
- [x] Téléchargement des états

### 7. Gestion des Événements

#### Calendrier des Événements
- [x] Création d'événements
- [x] Types d'événements (fêtes, sorties, examens, réunions, vacances, fermetures)
- [x] Calendrier académique
- [x] Inscriptions aux événements
- [x] Notifications aux parents

#### Gestion des Inscriptions
- [x] Inscriptions aux événements
- [x] Suivi des participants
- [x] Paiements (si applicable)
- [x] Listes des participants
- [x] Export des listes

---

## Phase 3 : Fonctionnalités Complémentaires

### 8. Gestion des Élèves (Compléments)

#### Profil Détaillé
- [x] Dossier médical
- [x] Historique scolaire (classes, années)
- [x] Historique des modifications

#### Gestion des Options
- [x] Tenue scolaire
- [x] Cantine
- [x] Transport
- [x] Assurance
- [x] Activités parascolaires
- [x] Coopérative
- [x] Calcul automatique des coûts

#### Archivage
- [x] Archivage des élèves ayant quitté l'école
- [x] Conservation des données légales
- [x] Export du dossier complet
- [x] Statut (actif, inactif, archivé)

### 9. Gestion des Paiements (Compléments)

#### Modes de Paiement
- [ ] Espèces
- [ ] Chèque
- [ ] Virement bancaire
- [ ] Mobile Money
- [ ] Carte bancaire

#### Rapports Financiers
- [x] Recettes journalières
- [x] Recettes mensuelles
- [x] Recettes annuelles
- [x] Par type de paiement
- [x] Par classe
- [x] Export en Excel/PDF

#### Gestion des Impayés
- [x] Liste des élèves avec impayés
- [x] Montant restant par élève
- [x] Date de dernier paiement
- [x] Relances automatiques
- [x] Historique des relances

#### Intégration Paiement Mobile
- [ ] Configuration des opérateurs (Orange Money, MTN, etc.)
- [ ] Réception des notifications de paiement
- [ ] Validation automatique
- [ ] Rapprochement bancaire
- [ ] Rapports de rapprochement

### 10. Gestion des Documents

#### Génération de Documents
- [x] Certificats de scolarité
- [x] Bulletins scolaires
- [x] Attestations d'assurance
- [x] Reçus de paiement
- [x] Convocations
- [x] Fiches d'inscription
- [x] Dossiers de transfert

#### Impression
- [x] Impression de tous les documents
- [x] Personnalisation avec logo
- [x] Format standardisé
- [x] Batch printing (impression en lot)
- [x] Historique des impressions

#### Archivage
- [x] Archivage des documents
- [x] Stockage sécurisé
- [x] Recherche et récupération
- [x] Conservation légale

### 11. Tableau de Bord (Améliorations)

#### Widgets Avancés
- [x] Widget Absences
- [x] Widget Notifications
- [x] Widget Événements
- [x] Alertes et tâches en attente

#### Statistiques en Temps Réel
- [x] Nombre d'élèves inscrits
- [x] Taux de présence du jour
- [x] Recettes du mois
- [x] Nombre d'enseignants présents
- [x] Classes actives
- [x] Alertes de paiement en retard

---

## Statut Global

- **Phase 1 (Essentiel)** : 4/4 modules (100%)
- **Phase 2 (Important)** : 3/3 modules (100%)
- **Phase 3 (Complémentaire)** : 4/4 modules (100%)
- **Total** : 11/11 modules (100%)

---

## Notes

- Les fonctionnalités marquées comme déjà implémentées sont fonctionnelles mais peuvent nécessiter des améliorations.
- L'ordre d'implémentation suggéré est Phase 1 → Phase 2 → Phase 3.
- Chaque module peut être subdivisé en tâches plus petites pour un meilleur suivi.
