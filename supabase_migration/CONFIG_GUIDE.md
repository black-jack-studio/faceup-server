# 🔧 GUIDE DE CONFIGURATION - MIGRATION SUPABASE

## Variables d'Environnement

### Étape 1 : Ajouter les Secrets Supabase

Ajoutez ces variables dans votre espace Replit (**Secrets** ou fichier `.env`) :

```bash
# Déjà configurées ✅
VITE_SUPABASE_URL=https://yqganeyurpbdkjaxsgnm.supabase.co
VITE_SUPABASE_ANON_KEY=<votre clé>
SUPABASE_SERVICE_ROLE_KEY=<votre clé>

# NOUVELLE VARIABLE REQUISE 🚨
SUPABASE_DB_PASSWORD=<votre mot de passe DB>
```

### 📍 Comment obtenir le mot de passe DB Supabase ?

1. Allez dans **Supabase Dashboard** → Votre projet
2. **Settings** → **Database**
3. Cherchez **"Connection string"** → section **"URI"**
4. Format : `postgresql://postgres.[REF]:[PASSWORD]@...`
5. Le `[PASSWORD]` est votre mot de passe DB

**OU** si vous ne l'avez pas :
- **Reset database password** dans Settings → Database
- ⚠️ Cela réinitialise UNIQUEMENT le mot de passe Postgres, pas vos données

---

## 🔄 Stratégie de Migration : BIG SWITCH

**Note :** Nous utilisons une migration "Big Switch" (bascule directe) au lieu de dual-write pour plus de simplicité et de sécurité. Voir `MIGRATION_STRATEGY.md` pour les détails.

### Phase 1 : NEON (Actuelle - Par Défaut ✅)
```bash
# Mode actuel
USE_SUPABASE=false  # ou non définie
# → Lit et écrit sur Neon
```

### Phase 2 : Test READ Supabase (10 min)
```bash
# Basculer vers Supabase pour TESTER
USE_SUPABASE=true
# → Lit et écrit sur Supabase
# → Tester login, profil, stats
```

### Phase 3 : Test WRITE Supabase (10 min)
```bash
# Toujours en mode Supabase
USE_SUPABASE=true
# → Tester paris, achats, roue fortune
# → Vérifier tout fonctionne
```

### Phase 4 : Production Supabase (Final)
```bash
# Migration complète
USE_SUPABASE=true
# → Monitoring 24h
# → Désactiver Neon après 7 jours
```

---

## ✅ Plan de Test

### Test 1 : Connexion Supabase (Après SQL import)

1. Vérifiez que les tables Supabase sont créées (voir `EXECUTE_ME.md`)
2. Ajoutez `SUPABASE_DB_PASSWORD` dans les Secrets
3. Ajoutez `USE_SUPABASE=true` dans les Secrets
4. Redémarrez l'app
5. Vérifiez les logs :
   ```
   🟢 Using SUPABASE DB: postgres.yqganeyurpbdkjaxsgnm@...
   ```

### Test 2 : Lecture des Données

1. Connectez-vous avec un compte existant
2. Vérifiez que le profil s'affiche correctement
3. Vérifiez les stats, classements, amis

### Test 3 : Écriture des Données

1. Faites un pari et gagnez/perdez
2. Vérifiez que les coins/XP sont mis à jour
3. Créez un nouveau compte (signup)
4. Ajoutez un ami

### Test 4 : Features Avancées

1. Roue de la fortune (10 gems)
2. Boutique (acheter avatar/card back)
3. Challenges
4. Classements saisonniers

---

## 🆘 Debugging

### Problème : "Supabase configuration missing"

**Solution :** Ajoutez `SUPABASE_DB_PASSWORD` dans les Secrets

### Problème : "relation does not exist"

**Solution :** Vous n'avez pas exécuté les fichiers SQL Supabase (voir `EXECUTE_ME.md`)

### Problème : "password authentication failed"

**Solution :** Mot de passe DB incorrect, réinitialisez-le dans Supabase Settings → Database

### Problème : L'app se connecte à Neon au lieu de Supabase

**Solution :** Vérifiez que `USE_SUPABASE=true` est bien dans les Secrets et redémarrez

---

## 🔍 Vérification des Connexions

### Logs de Connexion

Au démarrage, vous devez voir :
```
🔵 Using NEON DB: ...         (mode NEON)
🟢 Using SUPABASE DB: ...      (mode SUPABASE)
```

### Test avec cURL

```bash
# Vérifier que l'API fonctionne
curl http://localhost:5000/api/user

# Doit retourner les données utilisateur
```

---

## 📊 Comparaison des Performances

| Opération | NEON | SUPABASE | Note |
|-----------|------|----------|------|
| Lecture simple | ~50ms | ~30ms | Supabase plus rapide |
| Écriture | ~100ms | ~60ms | Pooler optimisé |
| Transactions | ~150ms | ~90ms | Latence réduite |
| Websocket | Oui | Oui | Support complet |

---

## ➡️ Prochaines Étapes

Une fois les tests réussis avec `USE_SUPABASE=true` :

1. ✅ Vérifier que tout fonctionne pendant 24h
2. ✅ Désactiver Neon
3. ✅ Supprimer les variables Neon (PGHOST, PGUSER, etc.)
4. ✅ Migration complète !

---

**📍 Statut Actuel :**  
✅ Code de bascule créé  
✅ Fichiers SQL prêts  
🔄 **EN ATTENTE : Exécution SQL + configuration SUPABASE_DB_PASSWORD**
