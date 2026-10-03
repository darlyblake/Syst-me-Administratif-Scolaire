# PLAN — Module Pointage (Backend + Frontend)

## Objectif
Mettre en place un système complet de pointage pour un établissement scolaire, basé sur l'identité du personnel, l'établissement, l'emploi du temps et quatre événements principaux.

Le système doit fonctionner avec :
- code personnel unique saisi sur l'ordinateur central ;
- QR code depuis le téléphone de l'utilisateur ;
- détection automatique du cours enseignant à partir de l'emploi du temps ;
- suivi administratif, historique et alertes ;
- règles configurables de calcul des heures.

Le module doit rester isolé des autres interfaces et ne doit pas modifier les interfaces Enseignant, Personnel, Finance, Scolarité, etc. en dehors des intégrations nécessaires au pointage.

---

## 1. Modèle fonctionnel

### 1.1 Quatre événements de pointage
1. Arrivée à l'établissement
2. Départ de l'établissement
3. Début de cours
4. Fin de cours

L'utilisateur choisit explicitement l'action sur l'écran central de pointage.

### 1.2 Identification
Deux méthodes :
- code personnel unique ;
- QR temporaire affiché sur l'ordinateur central et scanné depuis le téléphone.

Le code/QR identifie la personne. Il ne doit pas demander à l'enseignant de choisir son cours.

### 1.3 Détection automatique du cours
Pour un événement « Début de cours » ou « Fin de cours » :
- identifier l'enseignant ;
- identifier l'établissement ;
- récupérer la date et l'heure de l'établissement ;
- rechercher automatiquement le créneau de l'enseignant correspondant à l'heure actuelle ;
- vérifier les tolérances configurées ;
- sélectionner automatiquement le cours ;
- enregistrer l'événement.

Aucun sélecteur manuel de cours pour l'enseignant.

### 1.4 Fin de cours
Si l'enseignant dispose d'un téléphone :
- il peut clôturer depuis son interface enseignant.

S'il n'en dispose pas :
- le système connaît l'heure théorique de fin ;
- le cours passe en « attente de clôture » ;
- une alerte est présentée au surveillant général / personnel autorisé ;
- celui-ci peut clôturer le cours ou effectuer une correction avec motif.

La fin théorique ne doit pas écraser l'heure réelle si une fin réelle a été enregistrée.

---

## 2. Calcul des heures

Séparer impérativement :
- heure réelle de début ;
- heure réelle de fin ;
- durée réelle ;
- durée administrative retenue.

Exemple :
- cours prévu : 08:00 → 09:40 ;
- durée administrative : 2 h ;
- seuil configurable : 40 minutes ;
- pointage à 08:20 → 2 h retenues ;
- pointage à 08:40 ou après → règle secondaire configurable, par exemple 1 h.

Les paramètres doivent permettre de définir :
- durée administrative d'un créneau ;
- seuil de conservation de la durée complète ;
- durée retenue après dépassement du seuil ;
- tolérance avant/après le début ;
- règle de retard ;
- règle de clôture ;
- éventuellement validation manuelle.

Toujours conserver l'heure réellement pointée.

---

## 3. États d'un cours
Prévoir au minimum :
- PROGRAMME
- EN_ATTENTE_DEBUT
- EN_COURS
- EN_ATTENTE_CLOTURE
- TERMINE
- NON_POINTE
- ANNULE
- ABSENCE_ENSEIGNANT si le workflow le nécessite.

---

## 4. Backend / Supabase

### 4.1 À auditer avant création
Identifier les tables existantes concernant :
- établissements ;
- personnel ;
- enseignants ;
- affectations établissement/enseignant ;
- utilisateurs/comptes ;
- emploi du temps ;
- classes ;
- matières ;
- années académiques ;
- rôles/permissions ;
- audit.

Réutiliser les structures existantes lorsque possible.

### 4.2 Nouvelles structures à envisager
Créer uniquement ce qui manque.

#### Pointage — événements
Une table centrale pour les événements réels :
- id
- establishment_id
- personnel_id
- event_type
- occurred_at
- method (code/qr)
- related_schedule_id nullable
- related_course_session_id nullable
- device/session identifier si nécessaire
- status
- metadata minimale
- created_at
- created_by si nécessaire

#### Sessions de cours
Une structure séparée pour représenter l'exécution réelle d'un cours :
- id
- establishment_id
- schedule_id
- teacher/personnel_id
- class_id
- subject_id
- scheduled_start
- scheduled_end
- actual_start
- actual_end
- actual_duration_minutes
- credited_minutes
- late_minutes
- status
- closure_method
- closed_by
- closure_reason
- created_at
- updated_at

Cette séparation permet de conserver le planning prévu et l'exécution réelle.

#### Paramètres de pointage
Configuration par établissement / année académique :
- établissement
- année académique si nécessaire
- tolérance avant début
- tolérance après début
- seuil de comptabilisation complète
- durée retenue après seuil
- règles de clôture
- alertes activées/désactivées
- méthode d'identification autorisée

#### Identifiants de pointage
Pour le code personnel :
- personnel_id
- establishment_id
- code unique
- actif
- date de création
- date de rotation/révocation si nécessaire

Ne jamais exposer inutilement le code dans les listes publiques.

#### Sessions QR
Pour le QR central :
- établissement
- terminal/session
- token aléatoire temporaire
- expires_at
- actif/révoqué

Le QR ne doit pas être un secret permanent.

#### Alertes
Pour les situations nécessitant l'attention de l'administration :
- cours non pointé
- retard
- cours à clôturer
- absence
- départ non enregistré
- anomalie.

#### Audit
Tracer les corrections sensibles :
- utilisateur ;
- action ;
- objet ;
- ancienne valeur ;
- nouvelle valeur ;
- motif ;
- date.

---

## 5. RPC / logique métier

Privilégier des fonctions transactionnelles pour les opérations critiques.

Prévoir des fonctions métier de type :
- enregistrer_arrivee_pointage
- enregistrer_depart_pointage
- enregistrer_debut_cours
- enregistrer_fin_cours
- identifier_pointage_par_code
- valider_pointage_qr
- trouver_cours_actuel_enseignant
- cloturer_cours_par_administration
- calculer_heures_creditees

Les noms définitifs doivent être adaptés aux conventions déjà présentes dans le projet.

### Règles essentielles
Une fonction de pointage doit vérifier côté serveur :
1. utilisateur/personnel valide ;
2. établissement autorisé ;
3. personnel actif ;
4. code/QR valide ;
5. événement cohérent avec l'état précédent ;
6. emploi du temps correspondant ;
7. tolérance applicable ;
8. absence de double pointage ;
9. calcul des heures ;
10. création atomique de l'événement/session.

Ne pas faire confiance uniquement aux contrôles React.

---

## 6. RLS / sécurité

Toutes les nouvelles tables exposées doivent avoir RLS.

Le contrôle doit être basé sur l'établissement et les permissions réelles de l'utilisateur.

Rôles à prendre en compte selon le modèle existant :
- administrateur ;
- direction/direction ;
- surveillant général ;
- personnel autorisé au pointage ;
- enseignant pour ses propres événements/cours.

Un enseignant ne doit pas pouvoir :
- consulter les pointages d'un autre établissement ;
- créer un cours arbitraire ;
- choisir un autre enseignant ;
- modifier librement ses heures ;
- clôturer le cours d'un autre enseignant.

Les corrections administratives doivent être réservées aux rôles autorisés et auditées.

---

## 7. Frontend — écran central de pointage

Créer/adapter une page dédiée « Pointage ».

Écran principal très simple :

### POINTAGE
- Arrivée à l'établissement
- Départ de l'établissement
- Début de cours
- Fin de cours

Après choix :
- saisie du code personnel ;
- ou scan QR depuis téléphone.

### Arrivée
Le système identifie la personne et enregistre l'arrivée.

### Départ
Le système identifie la personne et enregistre le départ.

### Début de cours
Le système identifie l'enseignant puis recherche automatiquement son cours actuel.

Exemple :
« Pointage validé — Mathématiques 6e A — 08:00 → 09:40 »

Aucun choix manuel du cours.

### Fin de cours
Le système recherche le cours en cours de cet enseignant et l'arrête.

---

## 8. Interface enseignant

Ajouter uniquement les intégrations nécessaires :
- afficher le cours actuel ;
- afficher son état ;
- bouton pour scanner le QR central ;
- permettre le début du cours via QR ;
- permettre la fin du cours via QR ;
- afficher l'heure réelle et l'heure prévue.

L'enseignant ne sélectionne jamais manuellement son cours.

---

## 9. Interface surveillant général / administration

La page Pointage doit comporter :

### Suivi
- pointage du jour ;
- historique ;
- fiches de pointage ;
- absents ;
- retards ;
- cours non pointés ;
- rapports.

### Alertes
Exemples :
- enseignant n'ayant pas pointé son cours ;
- enseignant en retard ;
- cours arrivé à sa fin sans clôture ;
- absence ;
- anomalie de pointage.

### Paramètres
- règles de calcul ;
- tolérances ;
- seuils ;
- clôture ;
- méthodes d'identification ;
- règles d'alertes.

Ces éléments sont secondaires dans la page et ne doivent pas transformer l'écran de pointage en gros dashboard surchargé.

---

## 10. Historique

L'historique doit permettre de filtrer :
- date/période ;
- personnel ;
- fonction ;
- événement ;
- établissement ;
- méthode ;
- statut.

Afficher notamment :
- date ;
- personne ;
- événement ;
- heure ;
- cours/classe si concerné ;
- méthode ;
- résultat.

---

## 11. Fiches de pointage

Une fiche individuelle doit permettre de voir :
- arrivée ;
- départ ;
- cours effectués ;
- retards ;
- heures réelles ;
- heures retenues ;
- absences ;
- corrections administratives.

Prévoir impression/export ultérieurement.

---

## 12. Alertes

Le système doit pouvoir générer des alertes à partir des horaires attendus.

Exemples :
- cours non commencé après la tolérance ;
- cours arrivé à son heure de fin sans clôture ;
- absence d'arrivée ;
- départ manquant ;
- pointage hors créneau ;
- double pointage/anomalie.

Les alertes doivent être déduites du planning et des événements, pas saisies manuellement.

---

## 13. Architecture frontend

Respecter l'architecture existante :
- services Supabase pour la logique d'accès aux données ;
- hooks pour l'état et les requêtes ;
- composants réutilisables ;
- types TypeScript ;
- RLS côté Supabase.

Éviter de mettre la logique métier complète dans les pages React.

Prévoir si nécessaire :
- pointage.service.ts
- pointage.types.ts
- usePointage.ts
- usePointageAlerts.ts
- composants dédiés au pointage.

Avant création, vérifier les fichiers existants.

---

## 14. UX/UI

Respecter les règles du projet :
- interface professionnelle ;
- pas de style « IA » ;
- peu de cards ;
- pas de gradients inutiles ;
- peu de couleurs ;
- actions très visibles ;
- écran central utilisable rapidement ;
- responsive ;
- table conservée lorsque les données nécessitent une table.

L'ordinateur central doit pouvoir rester ouvert sur l'écran Pointage toute la journée.

---

## 15. Ordre d'implémentation

### Phase 1 — Documentation
- [x] Créer ce fichier MD
- [x] Commit/push du document

### Phase 2 — Audit backend
- [ ] Identifier tables emploi du temps
- [ ] Identifier relations enseignants/personnel/établissements
- [ ] Identifier années académiques
- [ ] Identifier rôles
- [ ] Identifier audit
- [ ] Vérifier les RLS existantes
- [ ] Vérifier les éventuels systèmes de pointage déjà présents

### Phase 3 — Backend
- [x] Créer les migrations nécessaires
- [x] Créer les tables manquantes
- [x] RLS
- [x] Fonctions/RPC
- [x] Génération/validation des identifiants
- [x] QR temporaire
- [x] Calcul des heures
- [x] Alertes
- [ ] Audit
- [x] Vérifications SQL de structure et permissions

### Phase 4 — Frontend administration
- [x] Page Pointage
- [x] écran d'action
- [ ] historique
- [ ] fiches
- [ ] absences
- [ ] retards
- [ ] cours non pointés
- [x] alertes
- [x] paramètres

### Phase 5 — Intégration enseignant
- [x] cours actuel
- [x] scan QR côté enseignant
- [x] début automatique
- [x] fin QR / clôture administrative
- [x] états du cours

### Phase 6 — Vérification
- [ ] test code
- [ ] test QR
- [ ] test arrivée
- [ ] test départ
- [ ] test début de cours
- [ ] test fin de cours
- [ ] test sans téléphone
- [ ] test cours non pointé
- [ ] test alerte fin de cours
- [ ] test calcul 1h40 → 2h
- [ ] test seuil 40 minutes
- [ ] test multi-établissement
- [ ] test RLS
- [ ] test absence de double pointage
- [ ] build frontend
- [ ] vérification navigateur

---

## 16. Contraintes de sécurité et de compatibilité

- Ne pas exposer de service role key au frontend.
- Ne pas faire confiance aux validations côté client.
- Ne pas permettre à un enseignant de choisir un cours arbitraire.
- Ne pas supprimer/modifier les données historiques sans audit.
- Ne pas casser les modules existants.
- Ne pas modifier les autres interfaces sans nécessité.
- Les opérations critiques doivent être transactionnelles.
- Les heures réelles et les heures retenues doivent rester distinctes.
- Toute correction administrative doit être traçable.

---

## 17. Critère de fin

Le module sera considéré comme fonctionnel lorsque :
1. un membre du personnel peut pointer son arrivée avec son code ou QR ;
2. il peut pointer son départ ;
3. un enseignant peut commencer son cours sans choisir le cours ;
4. le système identifie automatiquement son cours à partir de l'emploi du temps ;
5. un enseignant avec téléphone peut clôturer son cours ;
6. sans téléphone, le surveillant peut clôturer le cours depuis son interface ;
7. les cours non pointés et les cours à clôturer génèrent les alertes prévues ;
8. les heures réelles et heures retenues sont conservées séparément ;
9. les règles de calcul sont configurables ;
10. l'historique et les fiches de pointage sont consultables ;
11. les accès sont protégés par RLS et permissions ;
12. les tests backend et frontend passent sans régression.
