# Modèles de Certificats Scolaires

Ce système permet aux utilisateurs de choisir entre différents modèles de certificats scolaires.

## Modèles Disponibles

### 1. Classique (classic)
- Style traditionnel avec dégradés bleus
- Police : Inter + Playfair Display
- Couleurs : Bleu professionnel
- Idéal pour les établissements traditionnels

### 2. Moderne (modern)
- Design épuré et contemporain
- Police : Inter uniquement
- Couleurs : Tons gris et noirs
- Parfait pour les écoles modernes

### 3. Élégant (elegant)
- Style raffiné et sophistiqué
- Police : Playfair Display
- Couleurs : Tons dorés et beiges
- Convient aux cérémonies spéciales

## Utilisation

### Utilisation Simple (avec modèle par défaut)
```tsx
import { SchoolCertificate } from './components/SchoolCertificate'

<SchoolCertificate
  student={{
    nom: "DUPONT",
    prenom: "Jean",
    dateNaissance: "15/03/2010",
    lieuNaissance: "Libreville",
    classe: "CM2 A"
  }}
  schoolName="Mon École"
  directorName="M. Directeur"
/>
```

### Avec Sélection de Modèle
```tsx
import { SchoolCertificate } from './components/SchoolCertificate'

<SchoolCertificate
  student={studentData}
  template="modern" // ou "classic" ou "elegant"
  schoolName="Mon École"
  directorName="M. Directeur"
/>
```

### Avec Sélecteur Interactif
```tsx
import { SchoolCertificateSelector } from './components/SchoolCertificateSelector'

<SchoolCertificateSelector
  student={studentData}
  schoolName="Mon École"
  directorName="M. Directeur"
/>
```

## Props du Composant

### SchoolCertificate
- `student` (requis) : Objet avec nom, prénom, dateNaissance, lieuNaissance, classe
- `template` (optionnel) : 'classic' | 'modern' | 'elegant' (défaut: 'classic')
- `schoolName` (optionnel) : Nom de l'établissement
- `directorName` (optionnel) : Nom du directeur
- `schoolAddress` (optionnel) : Adresse de l'école
- `schoolPhone` (optionnel) : Téléphone de l'école
- `city` (optionnel) : Ville
- `schoolYear` (optionnel) : Année scolaire

### SchoolCertificateSelector
- Même props que SchoolCertificate sauf `template`
- Ajoute une interface de sélection interactive

## Personnalisation

Pour ajouter un nouveau modèle :

1. Ajouter le nouveau type dans l'interface `SchoolCertificateProps`
2. Ajouter un case dans la fonction `getTemplateStyles()`
3. Définir les styles CSS pour le nouveau modèle
4. Ajouter le modèle dans le tableau `templates` du sélecteur

## Exemple Complet

Voir le fichier `components/CertificateTemplatesExample.tsx` pour un exemple complet d'utilisation.

## Impression

Tous les modèles sont optimisés pour l'impression avec :
- Couleurs préservées (`print-color-adjust: exact`)
- Marges adaptées
- Éléments décoratifs masqués si nécessaire
