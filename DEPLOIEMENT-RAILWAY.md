# 🚂 Guide de Déploiement sur Railway

## 📋 Vue d'ensemble

Ce guide vous permettra de déployer votre application Flask **MotoTrip Planner** sur Railway et de la rendre accessible via `voyages.oldibike.be`.

---

## ✅ Prérequis

- [x] Compte GitHub (déjà fait ✅)
- [x] Code sur GitHub : https://github.com/OldiBike/mototrip-planner
- [x] Fichier `.env` avec toutes vos variables d'environnement
- [ ] Compte Railway (on va le créer ensemble)

---

## 🚀 ÉTAPE 1 : Créer un compte Railway

1. **Aller sur** : https://railway.app
2. **Cliquer sur "Start a New Project"** ou "Login"
3. **Choisir "Login with GitHub"** ← Important !
4. **Autoriser Railway** à accéder à vos repositories GitHub
5. **Gratuit** : 500 heures/mois (largement suffisant pour commencer)

---

## 🔗 ÉTAPE 2 : Déployer depuis GitHub

### 2.1 Créer un nouveau projet

1. **Dashboard Railway** → Cliquer sur **"New Project"**
2. Choisir **"Deploy from GitHub repo"**
3. Sélectionner **`OldiBike/mototrip-planner`**
4. Railway va automatiquement :
   - ✅ Détecter qu'il s'agit d'une app Flask (grâce au `Procfile`)
   - ✅ Installer les dépendances (`requirements.txt`)
   - ✅ Lancer le serveur avec gunicorn

### 2.2 Attendre le premier déploiement

- Railway va build votre application
- Vous verrez les logs en temps réel
- ⏱️ Durée : 2-5 minutes environ
- ✅ Statut : "Active" quand c'est prêt

---

## 🔐 ÉTAPE 3 : Configurer les variables d'environnement

### 3.1 Accéder aux Variables

1. Dans votre projet Railway, cliquer sur le **service** (votre app)
2. Aller dans l'onglet **"Variables"**
3. Cliquer sur **"New Variable"** ou **"Raw Editor"** (plus rapide)

### 3.2 Copier vos variables depuis `.env`

Ouvrez votre fichier `.env` local et copiez **TOUTES** les variables :

```bash
# Exemple de structure (À ADAPTER avec vos vraies valeurs)

# Flask
SECRET_KEY=votre-secret-key-super-secure
FLASK_ENV=production
FLASK_APP=app.py

# Firebase
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=mototrip-xxxxx
FIREBASE_PRIVATE_KEY_ID=xxxxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_ICI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mototrip-xxxxx.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=xxxxx
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx
FIREBASE_STORAGE_BUCKET=mototrip-xxxxx.appspot.com
APP_ID=default-app-id

# Stripe
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Email (si vous utilisez)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-mot-de-passe-app

# RateHawk
RATEHAWK_API_KEY=xxxxx
RATEHAWK_API_URL=https://api.worldota.net/api/b2b/v3

# Base URL
BASE_URL=https://voyages.oldibike.be
```

### 3.3 Coller dans Railway

**Méthode rapide (Raw Editor)** :
1. Cliquer sur **"Raw Editor"** en haut à droite
2. Copier/coller TOUT le contenu de votre `.env`
3. Cliquer sur **"Update Variables"**
4. Railway va **redémarrer automatiquement** l'application

⚠️ **IMPORTANT** : 
- Ne mettez **PAS** de guillemets autour des valeurs dans Railway (contrairement au `.env` local)
- Vérifiez que la clé privée Firebase est bien formatée

---

## 🌐 ÉTAPE 4 : Obtenir l'URL de votre application

### 4.1 URL temporaire Railway

1. Dans votre service, aller dans l'onglet **"Settings"**
2. Scroll jusqu'à **"Domains"**
3. Cliquer sur **"Generate Domain"**
4. Railway vous donne une URL : `https://mototrip-xxxxx.up.railway.app`
5. ✅ **Testez cette URL** dans votre navigateur

### 4.2 Vérifier que tout fonctionne

Visitez :
- `https://votre-app.up.railway.app/` → Page d'accueil
- `https://votre-app.up.railway.app/voyages` → Liste des voyages
- `https://votre-app.up.railway.app/admin/login` → Page admin

Si tout fonctionne ✅, passez à l'étape suivante !

---

## 🔗 ÉTAPE 5 : Ajouter votre domaine personnalisé

### 5.1 Dans Railway

1. **Settings** → **Domains**
2. Cliquer sur **"Custom Domain"**
3. Entrer : `voyages.oldibike.be`
4. Railway vous donne les instructions DNS

Vous verrez quelque chose comme :
```
CNAME Record:
Name: voyages
Value: mototrip-xxxxx.up.railway.app
```

⚠️ **GARDEZ CETTE PAGE OUVERTE** - Vous en aurez besoin pour WIX !

### 5.2 Configurer les DNS dans WIX

👉 **Suivez maintenant le guide** : `CONFIGURATION-DNS-WIX.md`

---

## 🔄 ÉTAPE 6 : Déploiements automatiques

✨ **Bonne nouvelle** : C'est déjà activé !

À chaque fois que vous faites un `git push` sur GitHub :
1. Railway **détecte le changement**
2. **Rebuild automatiquement** l'application
3. **Déploie la nouvelle version** (sans downtime)

### Commandes utiles

```bash
# Faire des modifications
git add .
git commit -m "Ajout d'un nouveau voyage"
git push origin main

# Railway déploie automatiquement en 2-3 minutes ✨
```

---

## 📊 ÉTAPE 7 : Surveiller votre application

### 7.1 Logs en temps réel

- Dans Railway → Onglet **"Deployments"**
- Cliquez sur le dernier déploiement
- Consultez les logs (erreurs, requêtes, etc.)

### 7.2 Métriques

- Onglet **"Metrics"**
- CPU, RAM, Bandwidth utilisés
- Nombre de requêtes

---

## 💰 Limites et coûts

### Plan Gratuit (Starter)
- ✅ 500 heures/mois (~21 jours)
- ✅ 5$ de crédit/mois
- ✅ Suffisant pour un site à trafic modéré

### Si vous dépassez
- 💳 Railway facture automatiquement : ~5-7$/mois
- Vous pouvez définir une limite de dépenses

---

## 🐛 Résolution de problèmes

### L'app ne démarre pas

1. **Vérifier les logs** : Deployments → Dernier build → Logs
2. **Erreurs communes** :
   - Variables d'environnement manquantes
   - Erreur Firebase : Vérifiez `FIREBASE_PRIVATE_KEY`
   - Erreur Stripe : Vérifiez les clés API

### Erreur 502 Bad Gateway

- Vérifiez que `Procfile` contient : `web: gunicorn app:app`
- Vérifiez que `gunicorn` est dans `requirements.txt`

### Firebase ne fonctionne pas

- La clé privée doit contenir les `\n` (retours à la ligne)
- Format : `"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"`

### Le domaine personnalisé ne fonctionne pas

- Attendez 10-30 minutes (propagation DNS)
- Vérifiez les DNS dans WIX (voir guide `CONFIGURATION-DNS-WIX.md`)
- Utilisez https://dnschecker.org pour tester

---

## ✅ Checklist finale

- [ ] Compte Railway créé et connecté à GitHub
- [ ] Application déployée depuis `OldiBike/mototrip-planner`
- [ ] Variables d'environnement copiées depuis `.env`
- [ ] URL temporaire testée et fonctionnelle
- [ ] Domaine personnalisé `voyages.oldibike.be` configuré
- [ ] DNS configuré dans WIX (voir guide suivant)
- [ ] Bouton ajouté sur le site WIX (voir `INTEGRATION-WIX.md`)

---

## 🎉 Félicitations !

Votre application est maintenant en ligne ! 🚀

**Prochaines étapes** :
1. 📝 Configurer les DNS → `CONFIGURATION-DNS-WIX.md`
2. 🔗 Ajouter le bouton sur WIX → `INTEGRATION-WIX.md`

---

## 📞 Support

**Railway** : https://docs.railway.app  
**Discord Railway** : https://discord.gg/railway

**Problème avec ce guide ?** Contactez-moi ou consultez les logs Railway.
