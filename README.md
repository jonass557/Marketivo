# MyShop - Site E-commerce Complet

Site e-commerce full-stack généré avec React, Node.js, Prisma et Tailwind CSS.

## Technologies

- **Frontend**: React.js, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express.js
- **Base de données**: PostgreSQL (via Prisma)
- **Authentification**: JWT

## Prérequis

- Node.js (v16+)
- PostgreSQL (ou une autre base SQL compatible)

## Installation

### 1. Backend

```bash
cd backend
npm install
```

Configuration :
Renommez `.env.example` en `.env` (si nécessaire) et configurez votre URL de base de données.
Le fichier `.env` est déjà créé avec une configuration par défaut.

```env
DATABASE_URL="postgresql://user:password@localhost:5432/myshop"
JWT_SECRET="votre_secret_jwt"
```

Initialiser la base de données :
```bash
npx prisma db push
# Ou pour la migration complète
npx prisma migrate dev
```

Démarrer le serveur :
```bash
npm run dev
```

### 2. Frontend

```bash
cd frontend
npm install
```

Démarrer l'application React :
```bash
npm run dev
```

## Fonctionnalités Implémentées

- **Architecture Full-Stack** : Dossiers séparés frontend/backend.
- **Modèles de Données** : Utilisateurs, Produits, Commandes, Catégories, etc.
- **Authentification** : API Backend (Register/Login) et Page Login Frontend.
- **UI/UX** : Design moderne avec Tailwind CSS et structure de composants type shadcn/ui.
- **Devise** : Configuré pour utiliser le XAF (CFA).

## Structure du Projet

- `/backend`
  - `/src/controllers` : Logique métier
  - `/src/routes` : Routes API
  - `/src/models` : (Géré via Prisma Schema)
  - `/prisma` : Schéma de base de données
- `/frontend`
  - `/src/components` : Composants Réutilisables (Header, UI)
  - `/src/pages` : Pages de l'application (Home, Login)
  - `/src/context` : Gestion d'état global (Auth)

## Prochaines Étapes

1. Connecter une vraie base de données PostgreSQL.
2. Implémenter les contrôleurs manquants (Produits, Commandes).
3. Finaliser les pages Frontend (Boutique, Panier, Dashboard Admin).
