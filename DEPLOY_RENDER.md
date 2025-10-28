# 🚀 Déploiement de FaceUp sur Render

Guide complet pour déployer l'application FaceUp Blackjack sur Render avec Supabase.

## 📋 Prérequis

- Compte [Render](https://render.com) (gratuit)
- Compte [Supabase](https://supabase.com) (gratuit)
- Code source sur GitHub

## 🗂️ Étape 1 : Préparation du Code

### 1.1 Copier les nouveaux fichiers de configuration

Les fichiers suivants ont été créés pour le déploiement sur Render :

- `package.render.json` - Scripts npm adaptés pour Render
- `vite.config.render.ts` - Configuration Vite sans dépendances Replit
- `tsconfig.server.json` - Configuration TypeScript pour le serveur
- `config/env.ts` - Centralisation des variables d'environnement
- `.env.example` - Template des variables d'environnement

### 1.2 Copier package.render.json vers package.json

**Sur votre machine locale (après avoir extrait le code de GitHub)** :

```bash
# Remplacer package.json par la version Render
cp package.render.json package.json

# Remplacer vite.config.ts par la version Render
cp vite.config.render.ts vite.config.ts
```

### 1.3 Nettoyer les dépendances Replit (optionnel)

Vous pouvez supprimer ces packages du `package.json` si vous le souhaitez :

```bash
npm uninstall @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal
```

### 1.4 Pousser sur GitHub

```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## 🗄️ Étape 2 : Configuration de Supabase

### 2.1 Créer un projet Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Choisir une région proche de vos utilisateurs (ex: EU West)
4. Noter le mot de passe de la base de données

### 2.2 Exécuter les migrations SQL

1. Dans Supabase, aller dans l'éditeur SQL
2. Copier le contenu de vos fichiers de migration (si vous en avez)
3. OU utiliser Drizzle Kit pour pousser le schéma :

```bash
# Sur votre machine locale
npm run db:push
```

### 2.3 Récupérer les informations de connexion

Dans Supabase → Settings → API :
- `VITE_SUPABASE_URL` : Project URL
- `VITE_SUPABASE_ANON_KEY` : anon public key
- `SUPABASE_SERVICE_ROLE_KEY` : service_role secret key (⚠️ gardez-le secret!)

Dans Supabase → Settings → Database :
- `SUPABASE_DB_PASSWORD` : votre mot de passe de database

## ☁️ Étape 3 : Déploiement sur Render

### 3.1 Créer un nouveau Web Service

1. Aller sur [render.com](https://render.com)
2. Cliquer sur "New +" → "Web Service"
3. Connecter votre repository GitHub
4. Sélectionner le repository `faceup-blackjack`

### 3.2 Configuration du Service

**Build Command** :
```bash
npm install && npm run build
```

**Start Command** :
```bash
npm run start:server
```

**Environment** : `Node`

**Region** : Choisir la même région que Supabase (ex: Frankfurt pour EU)

### 3.3 Variables d'Environnement

Ajouter toutes les variables d'environnement dans Render :

```env
NODE_ENV=production
PORT=5000

# Database (Supabase)
USE_SUPABASE=true
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DB_PASSWORD=votre-mot-de-passe

# Session Security (générer une clé aléatoire)
SESSION_SECRET=votre-cle-secrete-tres-longue-et-aleatoire

# Payment (si utilisé)
STRIPE_SECRET_KEY=sk_live_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
```

**Pour générer une SESSION_SECRET sécurisée** :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3.4 Déployer

1. Cliquer sur "Create Web Service"
2. Render va automatiquement :
   - Cloner votre repo
   - Installer les dépendances
   - Build le client et le serveur
   - Démarrer l'application

### 3.5 Récupérer l'URL de production

Une fois déployé, Render vous donne une URL du type :
```
https://faceup-blackjack.onrender.com
```

### 3.6 Mettre à jour config/env.ts

Sur votre repository local, mettre à jour `config/env.ts` avec votre vraie URL :

```typescript
export const API_URL = process.env.API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://faceup-blackjack.onrender.com'  // ← Votre URL Render
    : 'http://localhost:5000');

export const ALLOWED_ORIGINS = [
  'capacitor://localhost',
  'http://localhost',
  'http://localhost:5173',
  'https://faceup-blackjack.onrender.com',  // ← Votre URL Render
];
```

Puis repousser :
```bash
git add config/env.ts
git commit -m "Update production URL"
git push origin main
```

Render va automatiquement redéployer.

## 📱 Étape 4 : Configuration Capacitor pour Mobile

### 4.1 Mettre à jour capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faceup.blackjack',
  appName: 'FaceUp Blackjack',
  webDir: 'dist/public',
  server: {
    url: 'https://faceup-blackjack.onrender.com',  // ← Votre URL Render
    cleartext: true
  },
  plugins: {
    // Configuration OAuth deep links
  }
};

export default config;
```

### 4.2 Build pour iOS/Android

```bash
# Build l'application web
npm run build

# Sync avec les plateformes natives
npx cap sync

# Ouvrir dans Xcode (iOS)
npx cap open ios

# Ouvrir dans Android Studio (Android)
npx cap open android
```

## ✅ Vérification du Déploiement

### Checklist :

- [ ] L'application est accessible sur l'URL Render
- [ ] La connexion Supabase fonctionne (test d'inscription/connexion)
- [ ] Les sessions persistent correctement
- [ ] CORS fonctionne pour `capacitor://localhost`
- [ ] Les paiements Stripe/PayPal fonctionnent (si activés)
- [ ] L'application mobile se connecte au backend Render

### Logs de débogage :

Sur Render, aller dans "Logs" pour voir les erreurs en temps réel.

## 🔧 Dépannage

### Erreur de build sur Render

**Problème** : `Module not found`
**Solution** : Vérifier que toutes les dépendances sont dans `dependencies` (pas `devDependencies`) du package.json

### Erreur CORS sur mobile

**Problème** : Les requêtes depuis Capacitor sont bloquées
**Solution** : Vérifier que `capacitor://localhost` est bien dans `ALLOWED_ORIGINS` du fichier `config/env.ts`

### Erreur de connexion Supabase

**Problème** : `Connection refused`
**Solution** : Vérifier que `USE_SUPABASE=true` et que toutes les variables Supabase sont correctes

### Sessions ne persistent pas

**Problème** : L'utilisateur est déconnecté après rafraîchissement
**Solution** : Utiliser un store de session persistant (Redis sur Render Add-ons) au lieu de MemoryStore

## 🎯 Prochaines Étapes

1. **Configurer un domaine personnalisé** sur Render (optionnel)
2. **Activer HTTPS strict** pour la production
3. **Mettre en place des backups automatiques** Supabase
4. **Configurer des alertes** de monitoring sur Render
5. **Soumettre l'app iOS** sur l'App Store
6. **Soumettre l'app Android** sur Google Play Store

## 💡 Notes Importantes

- **Plan gratuit Render** : L'app se met en veille après 15 min d'inactivité (redémarre en ~30s au premier accès)
- **Upgrade Render** : Plan payant ($7/mois) pour éviter la mise en veille
- **Supabase gratuit** : 500MB de DB, 2GB de bande passante/mois
- **Variables d'environnement** : Toujours garder les clés secrètes hors du code source

---

## 📚 Ressources

- [Documentation Render](https://render.com/docs)
- [Documentation Supabase](https://supabase.com/docs)
- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Guide iOS App Store](https://developer.apple.com/app-store/submissions/)
- [Guide Google Play Store](https://support.google.com/googleplay/android-developer/answer/9859152)
