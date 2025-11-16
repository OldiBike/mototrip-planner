# 🔍 Diagnostic Erreur 502 Railway - Guide Complet

## ⚠️ Erreur Actuelle

**URL:** https://voyages.oldibike.be/  
**Erreur:** 502 Bad Gateway - "Application failed to respond"

---

## 📋 Checklist de Diagnostic

### ✅ ÉTAPE 1: Vérifier les Logs Railway

**C'est LA chose la plus importante à faire!**

1. **Aller sur Railway**: https://railway.app
2. **Sélectionner votre projet** MotoTrip
3. **Cliquer sur votre service** (l'application)
4. **Onglet "Deployments"**
5. **Cliquer sur le dernier déploiement**
6. **Regarder les logs** en temps réel

### 🔎 Que chercher dans les logs:

#### Erreur 1: Module psycopg2 manquant
```
ModuleNotFoundError: No module named 'psycopg2'
```
**Solution**: Vérifier que `psycopg2-binary==2.9.9` est décommenté dans `requirements.txt` ✅ (fait)

#### Erreur 2: Impossible de se connecter à la base de données
```
OperationalError: could not connect to server
```
**Solution**: Vérifier que le service PostgreSQL est actif et que `DATABASE_URL` est configurée

#### Erreur 3: Variables d'environnement manquantes
```
KeyError: 'FLASK_SECRET_KEY'
KeyError: 'DATABASE_URL'
```
**Solution**: Ajouter les variables manquantes dans Railway > Variables

#### Erreur 4: Erreur Firebase
```
ValueError: Failed to initialize Firebase
```
**Solution**: Vérifier `FIREBASE_CREDENTIALS` - doit être un JSON valide

#### Erreur 5: Port non trouvé
```
Error: $PORT not set
```
**Solution**: Railway définit automatiquement `PORT`, mais vérifier le `Procfile`

---

## 🔧 ÉTAPE 2: Vérifier la Configuration PostgreSQL

### Option A: Vous utilisez PostgreSQL Railway

1. **Dashboard Railway** > Votre projet
2. Vérifiez qu'il y a **2 services**:
   - 🚂 Votre application Flask
   - 🐘 PostgreSQL

Si PostgreSQL n'existe pas:
1. Cliquer sur **"+ New"**
2. Choisir **"Database" > "Add PostgreSQL"**
3. Railway va créer la variable `DATABASE_URL` automatiquement
4. **Redéployer** votre application

### Option B: Vous utilisez SQLite (développement)

Si vous voulez utiliser SQLite temporairement:

1. **Railway > Variables** > Ajouter:
```
DATABASE_URL=sqlite:///mototrip.db
```

⚠️ **Attention**: SQLite ne persiste pas sur Railway - utilisez PostgreSQL en production!

---

## 🔑 ÉTAPE 3: Vérifier les Variables d'Environnement

### Variables OBLIGATOIRES pour Railway:

Allez dans **Railway > Votre service > Variables**

```bash
# Base de données (fournie automatiquement par Railway si PostgreSQL est ajouté)
DATABASE_URL=postgresql://user:pass@host:5432/railway

# Flask (CRITIQUE)
FLASK_SECRET_KEY=votre-cle-secrete-super-longue-et-aleatoire

# Firebase (CRITIQUE si vous utilisez Firebase)
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"...","private_key":"..."}

# OU fichier Firebase (alternative)
FIREBASE_CREDENTIALS_PATH=/app/firebase-credentials.json

# App ID
APP_ID=mototrip-planner

# Admin (optionnel mais recommandé)
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=pbkdf2:sha256:...
```

### Comment obtenir ADMIN_PASSWORD_HASH:

Localement, exécutez:
```python
from werkzeug.security import generate_password_hash
print(generate_password_hash('VotreMotDePasseAdmin'))
```

---

## 🐛 ÉTAPE 4: Tests de Diagnostic

### Test 1: Vérifier que l'app démarre localement

```bash
# En local avec les mêmes variables que Railway
export DATABASE_URL="postgresql://..."
export FLASK_SECRET_KEY="..."
export FIREBASE_CREDENTIALS='{"type":"service_account",...}'

# Lancer l'app
python wsgi.py
```

Si ça marche en local → Problème de config Railway  
Si ça ne marche pas → Problème dans le code

### Test 2: Vérifier le Procfile

```bash
# Votre Procfile doit contenir:
web: gunicorn wsgi:app --bind 0.0.0.0:$PORT
```

Vérifiez que:
- ✅ `wsgi.py` existe à la racine
- ✅ `gunicorn` est dans `requirements.txt`
- ✅ Le fichier s'appelle bien `Procfile` (pas `Procfile.txt`)

### Test 3: Vérifier wsgi.py

```python
# Le fichier wsgi.py doit contenir:
from app import create_app

app = create_app()

if __name__ == '__main__':
    import os
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
```

---

## 🚨 Problèmes Courants et Solutions

### Problème 1: "Application failed to respond" après le déploiement

**Causes possibles:**
1. L'app crash au démarrage (voir logs)
2. PostgreSQL n'est pas configuré
3. Variables d'environnement manquantes
4. Firebase credentials invalides

**Solution:**
1. **Logs d'abord!** Railway > Deployments > Logs
2. Cherchez la première erreur qui apparaît
3. Corrigez-la et redéployez

### Problème 2: "Cannot connect to database"

**Solution rapide - Option SQLite:**

Railway > Variables > Ajouter:
```
DATABASE_URL=sqlite:///mototrip.db
```

**Solution production - PostgreSQL:**
1. Railway > + New > Database > PostgreSQL
2. Attendez que `DATABASE_URL` soit ajoutée automatiquement
3. Redéployez

### Problème 3: "Firebase initialization failed"

**Solution 1 - JSON en variable d'environnement:**

Le JSON doit être sur **une seule ligne**, avec les `\n` échappés:

```json
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"mototrip-xxxxx","private_key":"-----BEGIN PRIVATE KEY-----\nVOTRE_CLE\n-----END PRIVATE KEY-----\n","client_email":"..."}
```

**Solution 2 - Supprimer Firebase temporairement:**

Modifier `app/config.py` pour ne pas crasher si Firebase n'est pas configuré:

```python
def init_firebase():
    """Initialise Firebase Admin SDK (optionnel en dev)"""
    global firebase_app
    
    if firebase_app is not None:
        return firebase_app
    
    try:
        # ... code Firebase ...
        return firebase_app
    except Exception as e:
        print(f"⚠️  Erreur Firebase: {e}")
        return None  # Ne pas crasher l'app
```

✅ C'est déjà fait dans votre code!

### Problème 4: "Secret Key not set"

Railway > Variables > Ajouter:
```
FLASK_SECRET_KEY=votre-cle-super-secrete-aleatoire-minimum-32-caracteres
```

---

## 📊 Plan d'Action Prioritaire

### 🔴 PRIORITÉ 1 - Regarder les logs Railway

**SANS LES LOGS, ON NE PEUT PAS DIAGNOSTIQUER!**

1. Railway > Deployments > Dernier déploiement > Logs
2. Copier les **5-10 premières lignes d'erreur**
3. Poster ici ou analyser

### 🟡 PRIORITÉ 2 - Vérifier PostgreSQL

Si PostgreSQL n'existe pas:
1. + New > Database > PostgreSQL
2. Redéployer

OU temporairement utiliser SQLite (variable `DATABASE_URL=sqlite:///mototrip.db`)

### 🟢 PRIORITÉ 3 - Vérifier les variables

Minimum vital:
- `FLASK_SECRET_KEY`
- `DATABASE_URL`
- `FIREBASE_CREDENTIALS` (ou désactiver Firebase temporairement)

---

## 🎯 Commandes de Diagnostic Rapide

```bash
# Tester l'app localement
python wsgi.py

# Tester avec gunicorn
gunicorn wsgi:app

# Vérifier requirements.txt
cat requirements.txt | grep psycopg2
# Doit afficher: psycopg2-binary==2.9.9

# Vérifier Procfile
cat Procfile
# Doit afficher: web: gunicorn wsgi:app --bind 0.0.0.0:$PORT

# Lister les variables Railway (dans l'interface web)
```

---

## 💡 Solution Temporaire - Mode Debug

Pour avoir plus d'infos, vous pouvez temporairement activer le mode debug:

Railway > Variables > Ajouter:
```
FLASK_ENV=development
FLASK_DEBUG=1
```

⚠️ **Retirer en production après diagnostic!**

---

## ✅ Checklist de Résolution

- [ ] J'ai regardé les logs Railway et noté les erreurs
- [ ] PostgreSQL est ajouté dans Railway OU j'utilise SQLite temporairement
- [ ] `DATABASE_URL` est configurée
- [ ] `FLASK_SECRET_KEY` est configurée
- [ ] `FIREBASE_CREDENTIALS` est configurée OU Firebase désactivé
- [ ] `psycopg2-binary` est décommenté dans requirements.txt
- [ ] Le Procfile est correct
- [ ] J'ai redéployé après chaque modification
- [ ] L'app fonctionne en local avec les mêmes variables

---

## 📞 Prochaine Étape

**COPIEZ-MOI LES LOGS RAILWAY** et je pourrai vous dire exactement quel est le problème!

Railway > Deployments > Cliquer sur le déploiement > Copier les logs (surtout les erreurs en rouge)

---

**Date:** 16/11/2025  
**Statut:** Guide de diagnostic - À utiliser pour identifier le problème exact
