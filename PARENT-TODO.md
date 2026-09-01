# Interface Parent — feuille de route

Cette checklist suit l'avancement réel du module Parent. Une tâche n'est cochée que lorsque le frontend, le backend nécessaire, la sécurité et la vérification associée sont terminés.

## 1. Tableau de bord
- [x] Résumé des enfants
- [x] Moyennes / notes disponibles
- [x] Absences / retards
- [x] Paiements
- [x] Notifications importantes
- [x] Événements à venir
- [x] Alertes importantes
- [x] Actualisation des données
- [x] États chargement / erreur / vide

## 2. Gestion des enfants
- [ ] Liste des enfants associés
- [ ] Ajouter un enfant
- [ ] Scanner QR / code
- [ ] Saisir l'identifiant manuellement
- [ ] Vérification de l'identité de l'enfant
- [ ] Demande d'association
- [ ] Gestion d'une association existante
- [x] Retirer une association
- [x] Historique des associations
- [x] Protection contre l'accès à un enfant non autorisé

## 3. Scolarité
- [ ] Notes
- [ ] Bulletins
- [ ] Moyennes
- [ ] Classement si autorisé
- [ ] Matières
- [ ] Résultats par période
- [ ] Historique scolaire
- [ ] Téléchargement des bulletins

## 4. Présence
- [ ] Absences
- [ ] Retards
- [ ] Justifications
- [ ] Historique
- [ ] Notifications d'absence
- [ ] Dépôt d'une justification

## 5. Paiements / scolarité
- [ ] Situation financière
- [ ] Montant payé
- [ ] Reste à payer
- [ ] Historique
- [ ] Reçus
- [ ] Téléchargement des reçus
- [ ] Échéances
- [ ] Notifications d'échéance
- [ ] Gestion multi-enfants / multi-établissements

## 6. Notifications
- [x] Notifications générales
- [x] Notifications liées à un enfant
- [x] Notifications financières
- [x] Notifications d'absence
- [x] Notifications scolaires
- [x] Marquer comme lu
- [x] Tout marquer comme lu
- [x] Historique
- [x] Compteur non lu

## 7. Calendrier / événements
- [ ] Calendrier scolaire
- [ ] Examens
- [ ] Réunions
- [ ] Vacances
- [ ] Événements
- [ ] Filtrage par enfant / établissement
- [ ] Rappels

## 8. Communication
- [ ] Établissement → parent
- [ ] Parent → établissement
- [ ] Conversations
- [ ] Messages liés à un enfant
- [ ] Pièces jointes si nécessaires
- [ ] Notifications de nouveaux messages
- [ ] Protection des conversations

## 9. Service technique
- [ ] Créer une demande
- [ ] Catégoriser la demande
- [ ] Description du problème
- [ ] Suivi du statut
- [ ] Réponse du support
- [ ] Historique
- [ ] Fermeture
- [ ] Notifications

## 10. Profil parent
- [ ] Informations personnelles
- [ ] Modification des informations
- [ ] Photo / avatar si prévu
- [ ] Coordonnées
- [ ] Vérification des données

## 11. Paramètres
- [ ] Préférences de notifications
- [ ] Sécurité du compte
- [ ] Changement de mot de passe
- [ ] Sessions actives
- [ ] Déconnexion
- [ ] Préférences générales

## 12. Sécurité
- [ ] RLS Supabase
- [x] Isolation parent / enfant
- [x] Isolation entre établissements
- [ ] Permissions backend
- [ ] Protection des identifiants enfants
- [ ] Protection des bulletins / documents
- [x] Protection des paiements
- [x] Protection des messages
- [ ] Protection des fichiers uploadés
- [ ] Gestion des sessions
- [ ] Audit des accès sensibles

## 13. Performance
- [x] Requêtes Supabase optimisées
- [ ] Index PostgreSQL nécessaires
- [ ] Pagination
- [ ] Chargement différé
- [x] Réduction des requêtes répétitives
- [ ] Cache lorsque pertinent
- [ ] Optimisation mobile
- [ ] Optimisation images / documents

## 14. Scalabilité
- [x] Plusieurs établissements
- [x] Plusieurs enfants par parent
- [x] Plusieurs parents pour un enfant selon les règles métier
- [ ] Pagination côté serveur
- [x] Requêtes adaptées aux gros volumes
- [x] Architecture multi-tenant
- [x] Pas de récupération massive de données
- [ ] Préparation aux notifications à grande échelle

## 15. Tests finaux
- [ ] Parent avec un enfant
- [ ] Parent avec plusieurs enfants
- [ ] Parent lié à plusieurs établissements
- [ ] Parent sans enfant
- [ ] Tentative d'accès à un enfant non autorisé
- [ ] Compte désactivé
- [ ] Établissement désactivé
- [ ] Tests mobile
- [ ] Erreurs réseau
- [ ] Tests RLS
- [ ] Test d'accès croisé parent/enfant
- [ ] Test de charge des requêtes importantes
