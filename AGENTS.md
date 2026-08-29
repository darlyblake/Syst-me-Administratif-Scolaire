# GUIDE AGENT IA — FRONTEND

## Système Administratif Scolaire — EduPilot

## 1. Objectif du frontend
Construire une interface de gestion scolaire professionnelle, moderne, claire et intuitive.

L'application ne doit PAS avoir une apparence « application générée par IA ».

Éviter notamment :

- multiplication de cards ;
- gradients inutiles ;
- gros effets lumineux ;
- interfaces ressemblant à des dashboards IA ;
- éléments décoratifs sans utilité ;
- trop de badges ;
- trop de couleurs ;
- animations excessives ;
- informations répétées ;
- écrans surchargés.

L'interface doit ressembler à un véritable logiciel professionnel utilisé quotidiennement par :

- direction ;
- administration ;
- secrétariat ;
- comptabilité ;
- enseignants ;
- surveillants.

Priorité :

1. simplicité ;
2. lisibilité ;
3. rapidité ;
4. cohérence ;
5. accessibilité ;
6. responsive ;
7. sécurité.

---

# 2. Architecture générale
Utiliser une architecture par responsabilités.

```
src/
│
├── app/
│   ├── ecole/
│   │   ├── dashboard/
│   │   ├── students/
│   │   ├── classes/
│   │   ├── enseignants/
│   │   ├── personnel/
│   │   ├── inscriptions/
│   │   ├── paiements/
│   │   ├── notes/
│   │   ├── absences/
│   │   └── settings/
│   │
│   └── ...
│
├── components/
│   ├── ui/
│   ├── layout/
│   ├── forms/
│   ├── tables/
│   ├── students/
│   ├── classes/
│   ├── academic/
│   ├── tuition/
│   └── payments/
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── services/
│   │   │   ├── establishment.service.ts
│   │   │   ├── academic-year.service.ts
│   │   │   ├── academic.service.ts
│   │   │   ├── student.service.ts
│   │   │   ├── tuition.service.ts
│   │   │   ├── enrollment.service.ts
│   │   │   └── payment.service.ts
│   │   │
│   │   └── types/
│   │       ├── establishment.ts
│   │       ├── academic.ts
│   │       ├── student.ts
│   │       ├── tuition.ts
│   │       ├── enrollment.ts
│   │       └── payment.ts
│   │
│   ├── validations/
│   │   ├── student.schema.ts
│   │   ├── class.schema.ts
│   │   ├── tuition.schema.ts
│   │   └── enrollment.schema.ts
│   │
│   └── utils/
│
└── hooks/
    ├── use-academic-structure.ts
    ├── use-students.ts
    ├── use-tuition.ts
    ├── use-enrollment.ts
    └── use-payments.ts
```

Ne pas créer inutilement des fichiers.

Avant de créer un nouveau composant ou service, vérifier s'il existe déjà un composant réutilisable.

---

# 3. Supabase
Le frontend utilise uniquement les variables publiques :

```
NEXT_PUBLIC_SUPABASE_URL=https://mogbzexqcatpgfrwzjld.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_KEY>
```

Ne jamais mettre :

```
SUPABASE_SERVICE_ROLE_KEY
```

dans :

- composants React ;
- hooks client ;
- `NEXT_PUBLIC_*` ;
- code exécuté dans le navigateur.

La service role key est exclusivement réservée au serveur lorsqu'elle sera nécessaire.

---

# 4. Client Supabase
Créer :

```
src/lib/supabase/client.ts
```

Responsabilité :

- créer le client Supabase ;
- ne contenir aucune logique métier ;
- être utilisé par les services.

Exemple :

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

Ne pas créer plusieurs clients Supabase différents dans les composants.

---

# 5. Types TypeScript
Les types doivent correspondre aux tables Supabase.

Créer :

```
src/lib/supabase/types/
```

## academic.ts
Doit contenir les types :

```
Establishment
AcademicYear
EducationCycle
GradeLevel
SchoolClass
```

Relations :

```
EducationCycle
    ↓
GradeLevel
    ↓
SchoolClass
```

---

## tuition.ts
Types :

```
TuitionPlan
TuitionPlanInstallment
PaymentMode
```

Modes :

```ts
type PaymentMode =
  | "monthly"
  | "installments"
  | "single";
```

---

## student.ts

```ts
Student
```

---

## enrollment.ts

```ts
Enrollment
```

---

## payment.ts

```ts
Payment
PaymentSchedule
PaymentAllocation
InstallmentStatus
```

Ne pas utiliser `any` pour contourner les types.

---

# 6. Service Academic
Créer :

```
src/lib/supabase/services/academic.service.ts
```

Fonctions obligatoires :

```ts
getCycles(establishmentId)

createCycle(data)

updateCycle(cycleId, data)

deactivateCycle(cycleId)

getLevelsByCycle(cycleId)

createLevel(data)

updateLevel(levelId, data)

deactivateLevel(levelId)

getClassesByLevel(levelId)

createClass(data)

updateClass(classId, data)

deactivateClass(classId)

getAcademicStructure(establishmentId)
```

---

# 7. getAcademicStructure()
Cette fonction est fondamentale.

Elle doit récupérer :

```
Cycle
  ↓
Niveaux
  ↓
Classes
```

Résultat attendu :

```ts
[
  {
    id: "...",
    name: "Collège",

    grade_levels: [
      {
        id: "...",
        name: "6ème",

        school_classes: [
          {
            id: "...",
            name: "6ème A"
          },
          {
            id: "...",
            name: "6ème B"
          }
        ]
      }
    ]
  }
]
```

La page Structure académique doit utiliser cette fonction plutôt que multiplier les requêtes.

---

# 8. Service Academic Year
Créer :

```
academic-year.service.ts
```

Fonctions :

```ts
getAcademicYears(establishmentId)

getActiveAcademicYear(establishmentId)

createAcademicYear(data)

activateAcademicYear(yearId)

closeAcademicYear(yearId)
```

L'année active doit être clairement identifiable.

Dans l'interface :

```
Année scolaire

[ 2026 - 2027 ▼ ]
```

Cette année sélectionnée doit être utilisée par les modules :

- inscriptions ;
- scolarité ;
- classes ;
- élèves ;
- paiements ;
- notes.

---

# 9. Service Tuition
Créer :

```
tuition.service.ts
```

Fonctions :

```ts
getTuitionPlans(academicYearId)

getTuitionPlan(academicYearId, gradeLevelId)

createTuitionPlan(data)

updateTuitionPlan(planId, data)

deactivateTuitionPlan(planId)
```

---

# 10. Logique des tarifs
ATTENTION :

Le tarif est lié au :

```
Niveau
```

et non à :

```
Classe
```

Exemple :

```
Collège
│
├── 6ème
│     ├── 6ème A
│     └── 6ème B
│
└── 5ème
      ├── 5ème A
      └── 5ème B
```

Si le tarif de 6ème est :

```
450 000 FCFA
Paiement mensuel
```

alors :

```
6ème A → même tarif
6ème B → même tarif
```

Ne jamais créer un tarif différent automatiquement pour chaque classe.

---

# 11. Interface Scolarité
Route :

```
/ecole/settings/scolarite
```

Interface recommandée :

```
Scolarité

Année scolaire
[ 2026 - 2027 ]

────────────────────────────────

Collège

6ème
450 000 FCFA
Paiement mensuel

                              Modifier

5ème
500 000 FCFA
4 tranches

                              Modifier

4ème
550 000 FCFA
6 tranches

                              Modifier
```

Éviter les grosses cards.

Privilégier :

- tableau ;
- lignes ;
- sections ;
- panneaux latéraux ;
- formulaires simples.

---

# 12. Formulaire de configuration d'un tarif
Quand l'utilisateur clique sur Modifier :

```
Configuration de la scolarité

Niveau
4ème

Frais d'inscription
[ 25 000 FCFA ]

Scolarité annuelle
[ 550 000 FCFA ]

Mode de paiement

( ) Mensuel
(•) Par tranches
( ) Paiement unique
```

Si :

```
Par tranches
```

est sélectionné :

```
Nombre de tranches
[ 6 ]
```

Puis :

```
Échéances

1
Libellé : Première tranche
Montant : 100 000
Date : 05/09/2026

2
Libellé : Deuxième tranche
Montant : 100 000
Date : 05/11/2026

...

Total configuré :
550 000 FCFA

Scolarité :
550 000 FCFA

✓ Les montants correspondent
```

Le bouton Enregistrer doit être désactivé si le total est incorrect.

---

# 13. Service Student
Créer :

```
student.service.ts
```

Fonctions :

```ts
getStudents(establishmentId, filters)

getStudent(studentId)

createStudent(data)

updateStudent(studentId, data)

deactivateStudent(studentId)
```

Filtres :

```
Recherche
Classe
Niveau
Année scolaire
Statut
```

---

# 14. Service Enrollment
Créer :

```
enrollment.service.ts
```

Fonctions :

```ts
createEnrollment(data)

getEnrollments(filters)

getEnrollment(enrollmentId)

getEnrollmentSchedule(enrollmentId)
```

La fonction principale :

```ts
createEnrollment()
```

doit simplement créer l'inscription.

Ne pas générer manuellement l'échéancier dans React.

La base Supabase possède déjà le trigger prévu pour générer :

```
payment_schedules
```

---

# 15. Formulaire d'inscription
L'expérience utilisateur doit suivre cet ordre :

```
Élève
 ↓
Année scolaire
 ↓
Cycle
 ↓
Niveau
 ↓
Classe
 ↓
Informations financières
 ↓
Confirmation
```

Exemple :

```
Nouvelle inscription

Élève
[ Jean Dupont ]

Année
[ 2026-2027 ]

Cycle
[ Collège ]

Niveau
[ 6ème ]

Classe
[ 6ème B ]
```

Après sélection du niveau :

```
Scolarité

450 000 FCFA / an

Paiement mensuel

10 échéances de 45 000 FCFA
```

Ces informations sont récupérées automatiquement.

L'utilisateur ne doit pas devoir rechercher manuellement le tarif.

---

# 16. Chargement dynamique
Lorsque l'utilisateur choisit :

```
Cycle = Collège
```

appeler :

```ts
getLevelsByCycle(cycleId)
```

Lorsque l'utilisateur choisit :

```
Niveau = 6ème
```

appeler simultanément :

```ts
getClassesByLevel(levelId)

getTuitionPlan(
  academicYearId,
  levelId
)
```

Utiliser :

```ts
Promise.all()
```

si les deux requêtes sont indépendantes.

---

# 17. Service Payment
Créer :

```
payment.service.ts
```

Fonctions :

```ts
createPayment(data)

allocatePayment(data)

getPayments(enrollmentId)

getStudentPaymentHistory(studentId)

getPaymentSchedule(enrollmentId)
```

---

# 18. Affichage d'un échéancier
Ne pas présenter cela comme un dashboard IA.

Faire simplement :

```
Scolarité de Jean Dupont

Total :
450 000 FCFA

Payé :
180 000 FCFA

Reste :
270 000 FCFA

────────────────────────────

Échéances

Septembre
45 000 FCFA
Payé

Octobre
45 000 FCFA
Payé

Novembre
45 000 FCFA
Partiellement payé

Décembre
45 000 FCFA
À payer
```

Utiliser une table ou une liste structurée.

---

# 19. Composants réutilisables
Créer des composants génériques :

```
components/ui/
```

Exemples :

```
Button
Input
Select
Dialog
Drawer
Table
Badge
Dropdown
Tabs
Pagination
EmptyState
ConfirmDialog
Skeleton
Toast
```

Ne pas recréer un bouton différent dans chaque module.

---

# 20. Composants métier
Créer :

```
components/academic/
```

avec par exemple :

```
CycleList
CycleForm
GradeLevelList
GradeLevelForm
ClassList
ClassForm
AcademicStructureTree
```

Puis :

```
components/tuition/
```

avec :

```
TuitionPlanList
TuitionPlanForm
InstallmentEditor
PaymentModeSelector
TuitionSummary
```

Puis :

```
components/enrollment/
```

avec :

```
EnrollmentForm
EnrollmentSummary
EnrollmentAcademicSelector
EnrollmentTuitionSummary
```

---

# 21. Hooks
Les pages ne doivent pas contenir toute la logique de récupération des données.

Créer :

```
hooks/
```

Exemples :

```
useAcademicStructure()

useAcademicYears()

useStudents()

useTuitionPlans()

useEnrollment()

usePaymentSchedule()
```

Exemple :

```ts
const {
  data,
  isLoading,
  error
} = useAcademicStructure(establishmentId);
```

---

# 22. États de chargement
Chaque page doit prévoir :

```
Loading
Empty
Error
Success
```

Ne jamais afficher une page vide pendant une requête.

Exemple :

```
Chargement de la structure...
```

Utiliser des skeletons discrets.

---

# 23. États vides
Exemple :

```
Aucune classe

Aucune classe n'a encore été créée pour ce niveau.

[ Ajouter une classe ]
```

Pas :

```
No data found
```

L'application doit être entièrement en français.

---

# 24. Gestion des erreurs
Ne jamais afficher directement :

```
PostgREST error...
```

Transformer les erreurs techniques en messages utilisateur.

Exemple :

```
Impossible d'enregistrer la scolarité.

Vérifiez que le total des échéances
correspond au montant annuel.
```

Les détails techniques doivent rester dans les logs.

---

# 25. Architecture des pages

## Dashboard
Afficher uniquement les informations utiles :

```
Bonjour

Année scolaire : 2026-2027

Élèves
1 245

Enseignants
86

Classes
42

Scolarité encaissée
...
```

Pas 20 cartes.

---

# 26. Page Classes
Route :

```
/ecole/classes
```

Présentation :

```
Classes

[ Rechercher ]

Cycle       Niveau       Classe       Effectif

Collège     6ème         6ème A       35
Collège     6ème         6ème B       32
Collège     5ème         5ème A       30
```

Actions :

```
Voir
Modifier
```

---

# 27. Page Élèves
Route :

```
/ecole/students
```

Utiliser une vraie table.

Colonnes :

```
N° étudiant
Nom
Prénom
Classe
Statut
Actions
```

Recherche visible en haut.

Filtres secondaires.

---

# 28. Page Paramètres
Route :

```
/ecole/settings
```

Ne pas mettre 50 paramètres sur une seule page.

Organisation :

```
Paramètres

Général
Informations de l'établissement

Année scolaire
Gestion des années

Structure académique
Cycles, niveaux et classes

Scolarité
Tarifs et modes de paiement

Utilisateurs
Utilisateurs et permissions
```

---

# 29. Responsive
L'application doit fonctionner correctement :

```
Desktop
Laptop
Tablette
Mobile
```

Sur mobile :

- sidebar transformée en navigation compacte ;
- tableaux pouvant devenir des listes ;
- formulaires en une colonne ;
- boutons accessibles au doigt ;
- aucun débordement horizontal inutile.

---

# 30. Performance
Éviter :

```
requête Supabase
dans chaque composant
```

Préférer :

```
Page
 ↓
Hook
 ↓
Service
 ↓
Supabase
```

Mettre en cache les données relativement stables :

- cycles ;
- niveaux ;
- classes ;
- année scolaire.

Après mutation :

```
invalidate/refetch
```

au lieu de recharger toute la page.

---

# 31. Sécurité frontend
Ne jamais faire confiance au frontend pour la sécurité.

Le frontend peut empêcher une mauvaise saisie pour améliorer UX.

Mais la sécurité réelle doit être assurée par :

```
Supabase RLS
PostgreSQL
Contraintes
Triggers
Fonctions serveur
```

Ne jamais :

```ts
if (user.role === "admin") {
   // sécurité uniquement frontend
}
```

Cela ne suffit pas.

---

# 32. Validation des formulaires
Utiliser une bibliothèque de validation déjà présente dans le projet si disponible.

Sinon utiliser :

```
Zod
```

Valider :

- champs obligatoires ;
- montants ;
- dates ;
- nombre de tranches ;
- cohérence des échéances.

Exemple :

```
Scolarité annuelle = 550 000

Échéances = 500 000

❌ Impossible d'enregistrer
```

---

# 33. Règle essentielle sur les montants
Ne jamais utiliser des nombres flottants naïvement pour les calculs financiers.

Préférer :

```
number
```

avec une gestion stricte des montants en FCFA, ou convertir les montants en unités entières si nécessaire.

Afficher :

```
550 000 FCFA
```

et non :

```
550000
```

---

# 34. Navigation
La navigation doit rester stable.

Exemple :

```
Tableau de bord

Établissement
├── Élèves
├── Inscriptions
├── Classes
├── Enseignants
├── Personnel
├── Notes
├── Absences
└── Paiements

Administration
└── Paramètres
```

Ne pas multiplier les sous-menus inutilement.

---

# 35. Design system
Style général :

```
Professionnel
Moderne
Sobre
Administratif
Clair
```

Utiliser une palette limitée.

Éviter :

```
gradient violet/bleu
glassmorphism excessif
néons
ombres énormes
animations permanentes
```

Les animations doivent être fonctionnelles :

- ouverture ;
- fermeture ;
- feedback ;
- transition légère.

---

# 36. Cards
Les cards ne sont PAS interdites.

Mais elles doivent avoir une vraie utilité.

Bon :

```
Élèves
1 245
```

Mauvais :

```
[ CARD ]
[ CARD ]
[ CARD ]
[ CARD ]
[ CARD ]
[ CARD ]
```

pour chaque petite information.

Privilégier :

- tableaux ;
- listes ;
- sections ;
- panneaux ;
- drawers ;
- formulaires.

---

# 37. Ne pas utiliser une esthétique « AI SaaS »
INTERDIT :

```
✨ Intelligence artificielle
✨ Smart insights
✨ AI assistant
✨ gradients
✨ énorme hero
✨ cartes flottantes
```

sauf lorsqu'une véritable fonctionnalité IA existe.

L'application est avant tout un logiciel de gestion scolaire.

---

# 38. Règle avant modification
Avant de modifier une page :

1. Lire la page entière.
2. Identifier les composants utilisés.
3. Identifier les hooks.
4. Identifier les services.
5. Identifier les appels Supabase.
6. Vérifier les types.
7. Vérifier les dépendances.
8. Vérifier les autres pages qui utilisent les composants.
9. Réutiliser ce qui fonctionne.
10. Supprimer uniquement ce qui est réellement inutile.

Ne jamais casser une fonctionnalité existante pour améliorer uniquement le design.

---

# 39. Règle avant création
Avant de créer :

```
component
hook
service
utility
```

chercher d'abord s'il existe déjà une implémentation équivalente.

Si elle existe :

```
réutiliser
```

plutôt que :

```
dupliquer
```

---

# 40. Règle Supabase
Le frontend doit respecter exactement cette hiérarchie :

```
establishments
      ↓
academic_years

education_cycles
      ↓
grade_levels
      ↓
school_classes

students
      ↓
enrollments
      ↓
tuition_plans
      ↓
tuition_plan_installments
      ↓
payment_schedules
      ↓
payments
      ↓
payment_allocations
```

Ne pas inventer d'autres relations sans vérifier le schéma Supabase.

---

# 41. Workflow de développement de l'agent
Pour chaque module :

```
1. Inspecter
2. Comprendre
3. Identifier les composants existants
4. Identifier les services existants
5. Identifier les problèmes UX
6. Corriger la logique
7. Corriger l'interface
8. Tester TypeScript
9. Tester lint
10. Tester build
11. Vérifier les régressions
12. Commit
```

Ne pas modifier 10 modules simultanément.

Finir complètement un module avant de passer au suivant.

---

# 42. Ordre de travail recommandé
L'agent doit travailler dans cet ordre :

```
1. Configuration Supabase
       ↓
2. Année scolaire
       ↓
3. Structure académique
       ↓
4. Classes
       ↓
5. Scolarité / tarifs
       ↓
6. Élèves
       ↓
7. Inscriptions
       ↓
8. Échéanciers
       ↓
9. Paiements
       ↓
10. Dashboard
       ↓
11. Notes
       ↓
12. Absences
       ↓
13. Enseignants
       ↓
14. Personnel
       ↓
15. Paramètres
```

---

# 43. Critère de validation
Une fonctionnalité n'est pas considérée comme terminée simplement parce que :

```
ça compile
```

Elle doit :

- fonctionner ;
- être compréhensible ;
- gérer le chargement ;
- gérer les erreurs ;
- gérer l'état vide ;
- être responsive ;
- respecter les types ;
- respecter Supabase ;
- ne pas dupliquer du code ;
- ne pas introduire de faille évidente ;
- conserver les fonctionnalités existantes.

---

# 44. Règle finale pour l'agent
Tu travailles comme un développeur frontend senior.

Ne cherche pas à produire beaucoup de code.

Cherche à produire :

```
moins de complexité
+
meilleure UX
+
meilleure architecture
+
meilleure maintenabilité
```

Chaque décision doit répondre à la question :

> « Est-ce que cette modification rend réellement l'application plus simple et plus professionnelle pour un utilisateur d'établissement scolaire ? »

Si la réponse est non, ne pas ajouter la fonctionnalité ou le composant.

Avant chaque modification importante, inspecter le code existant et comprendre ses dépendances.

Ne jamais supprimer une fonctionnalité métier sans vérifier son utilisation ailleurs.

Ne jamais contourner Supabase/RLS pour faire fonctionner rapidement une interface.

Toujours privilégier une architecture claire :

```
UI
 ↓
Hooks
 ↓
Services
 ↓
Supabase
 ↓
PostgreSQL
```

et non :

```
UI
 ↓
20 requêtes Supabase
 ↓
logique métier
 ↓
calculs
 ↓
gestion des erreurs
```

L'objectif final est une application scolaire professionnelle, simple à utiliser, rapide et maintenable.

### Je te conseille aussi
Mets ce guide dans **`AGENTS.md` à la racine du dépôt**. Ensuite, ton agent Codex pourra le lire automatiquement comme référence du projet.

Et surtout, **ne lui demande pas de tout refaire d'un coup**. Donne-lui module par module, dans l'ordre indiqué. Ça évitera qu'il casse la logique existante en essayant de refaire toute l'application simultanément.
