# 🚀 Guide Complet de Déploiement FaceUp sur Render

Guide étape par étape pour déployer l'application FaceUp Blackjack depuis le repository GitHub `black-jack-studio/faceup-server` vers Render avec Supabase.

---

## 📋 Vue d'ensemble technique

**Architecture :**
- Monorepo TypeScript avec `client/` (React/Vite) et `server/` (Express)
- ORM : Drizzle avec PostgreSQL
- Base de données : Supabase
- URL de production : `https://faceup-server.onrender.com`
- Port Render : `10000` (défini par Render automatiquement)

**Fichiers critiques :**
- Entry point : `server/index.ts`
- Configuration : `config/env.ts`
- Scripts : `package.json` (déjà configuré pour Render)

---

## ✅ Étape 1 : Vérifications Préalables

### 1.1 Vérifier le code sur GitHub

Le repository `black-jack-studio/faceup-server` doit contenir :
- ✅ `package.json` avec scripts `build` et `start`
- ✅ `config/env.ts` avec URL Render configurée
- ✅ `server/db.ts` supportant `SUPABASE_URL` et `VITE_SUPABASE_URL`
- ✅ `.env.example` comme template

### 1.2 Créer un compte Supabase

1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. **Région importante** : Choisir la même région que Render (ex: `eu-west-3` pour Paris)
4. Noter le mot de passe de la base de données (vous en aurez besoin)

### 1.3 Récupérer les credentials Supabase

Dans Supabase Dashboard → **Settings** → **API** :

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

Dans **Settings** → **Database** → **Connection String** :

```env
SUPABASE_DB_PASSWORD=votre-mot-de-passe
```

---

## 🛠️ Étape 2 : Créer le Web Service sur Render

### 2.1 Connexion GitHub

1. Se connecter sur [render.com](https://render.com)
2. Cliquer sur **"New +"** → **"Web Service"**
3. Connecter le repository GitHub `black-jack-studio/faceup-server`
4. Autoriser l'accès à Render

### 2.2 Configuration du Service

**Nom du service :**
```
faceup-server
```

**Region :**
```
Frankfurt (EU Central)
```
⚠️ Choisir la même région que Supabase pour minimiser la latence

**Branch :**
```
main
```

**Build Command :**
```bash
npm install && npm run build
```

**Start Command :**
```bash
npm run start
```

**Environment :**
```
Node
```

---

## 🔐 Étape 3 : Variables d'Environnement

Dans Render Dashboard → **Environment** → **Add Environment Variable**

### Variables obligatoires :

```env
# Environnement
NODE_ENV=production
PORT=10000

# Base de données Supabase
USE_SUPABASE=true
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_DB_PASSWORD=votre-mot-de-passe

# Compatibilité (facultatif mais recommandé)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx

# Session Security
SESSION_SECRET=générer-une-clé-aléatoire-très-longue
```

**Pour générer SESSION_SECRET :**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Variables optionnelles (si utilisées) :

```env
# RevenueCat (pour achats in-app mobiles)
REVENUECAT_API_KEY=votre-revenuecat-api-key

# Stripe (paiements web)
STRIPE_SECRET_KEY=sk_live_xxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# PayPal
PAYPAL_CLIENT_ID=votre-paypal-client-id
PAYPAL_CLIENT_SECRET=votre-paypal-client-secret

# Feature flags
SEED_CARD_BACKS=false
```

---

## 🗄️ Étape 4 : Initialiser la Base de Données Supabase

### 4.1 Méthode 1 : Via Drizzle Kit (Recommandée)

Sur votre machine locale :

```bash
# Configurer les variables d'environnement localement
export USE_SUPABASE=true
export SUPABASE_URL=https://xxxxx.supabase.co
export SUPABASE_ANON_KEY=eyJxxxxx
export SUPABASE_DB_PASSWORD=votre-mot-de-passe

# Pousser le schéma vers Supabase
npm run db:push
```

### 4.2 Méthode 2 : Via SQL Editor Supabase

1. Dans Supabase Dashboard → **SQL Editor**
2. Copier le schéma SQL complet depuis `shared/schema.ts` (converti en SQL)
3. Exécuter les migrations

---

## 🚀 Étape 5 : Déployer

### 5.1 Lancer le déploiement

1. Dans Render Dashboard, cliquer sur **"Create Web Service"**
2. Render va automatiquement :
   - Cloner le repository GitHub
   - Installer les dépendances (`npm install`)
   - Build le client (`vite build`)
   - Build le serveur (`esbuild server/index.ts`)
   - Démarrer l'application (`node dist/index.js`)

### 5.2 Surveiller les logs

Dans **Logs**, vérifier :

```
✅ Using SUPABASE DB: postgres.xxxxx@aws-1-eu-west-3.pooler.supabase.com
✅ Card backs fully initialized
✅ Server ready - serving on port 10000
```

### 5.3 Vérifier le déploiement

Tester les endpoints :

```bash
# Health check
curl https://faceup-server.onrender.com/api/health

# Devrait retourner :
{
  "status": "ok",
  "timestamp": "2025-10-29T...",
  "environment": "production"
}
```

---

## 📱 Étape 6 : Configuration Capacitor (Application Mobile)

### 6.1 Mettre à jour capacitor.config.ts

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.faceup.blackjack',
  appName: 'FaceUp Blackjack',
  webDir: 'dist/public',
  server: {
    url: 'https://faceup-server.onrender.com',
    cleartext: true
  }
};

export default config;
```

### 6.2 Build et sync

```bash
npm run build
npx cap sync
npx cap open ios      # Pour iOS
npx cap open android  # Pour Android
```

---

## 🔧 Dépannage

### Erreur : "Cannot GET /"

**Problème** : Le build du client n'a pas été servi correctement

**Solution** :
1. Vérifier que `dist/public/index.html` existe après le build
2. Vérifier les logs : `serveStatic` doit être appelé en production
3. Redéployer manuellement : **Manual Deploy** → **Deploy latest commit**

### Erreur : "Database configuration missing"

**Problème** : Variables Supabase manquantes ou incorrectes

**Solution** :
1. Vérifier que `USE_SUPABASE=true`
2. Vérifier `SUPABASE_URL` (commence par `https://`)
3. Vérifier `SUPABASE_DB_PASSWORD`
4. Redéployer après correction

### Erreur CORS sur mobile

**Problème** : Requêtes bloquées depuis Capacitor

**Solution** :
Le fichier `config/env.ts` contient déjà `capacitor://localhost` dans `ALLOWED_ORIGINS`. Vérifier que le code est bien déployé.

### Erreur : "Card back initialization failed"

**Problème** : La base de données n'a pas les tables nécessaires

**Solution** :
1. Exécuter `npm run db:push` depuis votre machine locale
2. OU désactiver le seeding : `SEED_CARD_BACKS=false`

### Plan gratuit Render : App en veille

**Comportement** : L'app se met en veille après 15 minutes d'inactivité

**Solutions** :
- **Gratuit** : Première requête prend ~30 secondes (cold start)
- **Payant** : Passer au plan Starter ($7/mois) pour éviter la mise en veille

---

## ✨ Optimisations Production

### 1. Activer le cache de sessions avec Redis

Render propose Redis comme add-on ($10/mois). Modifier `server/routes.ts` :

```typescript
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  // ... reste de la config
}));
```

### 2. Activer HTTPS strict

Dans `server/routes.ts`, la config session utilise déjà :

```typescript
cookie: {
  secure: process.env.NODE_ENV === 'production', // HTTPS only
  httpOnly: true,
  sameSite: 'strict'
}
```

✅ Déjà configuré

### 3. Monitoring et Alertes

Dans Render Dashboard :
- **Metrics** : Surveiller CPU, RAM, requêtes/sec
- **Notifications** : Configurer alertes email/Slack

---

## 📊 Checklist Finale

- [ ] ✅ Application accessible sur `https://faceup-server.onrender.com`
- [ ] ✅ Endpoint `/api/health` retourne `{"status": "ok"}`
- [ ] ✅ Connexion Supabase fonctionne (logs : `Using SUPABASE DB`)
- [ ] ✅ Inscription/connexion utilisateur fonctionnelle
- [ ] ✅ Sessions persistent correctement
- [ ] ✅ CORS fonctionne pour `capacitor://localhost`
- [ ] ✅ Application mobile se connecte au backend Render
- [ ] ✅ Paiements Stripe/PayPal testés (si activés)

---

## 🎯 Prochaines Étapes

1. **Domaine personnalisé** : Configurer `faceup.app` sur Render (Settings → Custom Domain)
2. **App Store** : Soumettre l'app iOS avec TestFlight
3. **Google Play** : Soumettre l'app Android en beta fermée
4. **Backups automatiques** : Configurer Point-in-Time Recovery sur Supabase
5. **CDN** : Activer Cloudflare devant Render pour accélérer le chargement

---

## 📞 Support

- **Render Docs** : https://render.com/docs
- **Supabase Docs** : https://supabase.com/docs
- **Logs Render** : Dashboard → Logs (temps réel)
- **Logs Supabase** : Dashboard → Logs (requêtes SQL)

---

## 💡 Notes Importantes

⚠️ **Sécurité** :
- Ne jamais commit les secrets dans Git
- Toujours utiliser les variables d'environnement Render
- Changer `SESSION_SECRET` régulièrement en production

⚠️ **Performance** :
- Render Free : Cold start ~30s après 15min d'inactivité
- Supabase Free : 500MB DB, 2GB bandwidth/mois
- Pour trafic important : passer aux plans payants

⚠️ **Base de données** :
- Toujours tester les migrations sur une DB de staging avant production
- Activer les backups quotidiens sur Supabase (Settings → Database → Backups)

---

**Dernière mise à jour** : 29 octobre 2025
**Version** : 1.0 - Production Ready
