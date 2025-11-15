# 🌐 Configuration DNS WIX pour oldibike.be

## 📋 Vue d'ensemble

Ce guide vous explique comment configurer le sous-domaine `voyages.oldibike.be` dans WIX pour pointer vers votre application Railway.

---

## ✅ Prérequis

- [x] Application déployée sur Railway (voir `DEPLOIEMENT-RAILWAY.md`)
- [x] URL Railway notée (exemple : `mototrip-xxxxx.up.railway.app`)
- [ ] Accès à votre compte WIX
- [ ] Domaine `oldibike.be` géré par WIX

---

## 🔧 ÉTAPE 1 : Récupérer les informations Railway

### 1.1 Dans Railway

1. Ouvrir votre projet Railway
2. Cliquer sur votre service (application)
3. Aller dans **Settings** → **Domains**
4. Vous devriez voir :
   - Votre domaine Railway : `mototrip-xxxxx.up.railway.app`
   - Section "Custom Domain" où vous avez entré `voyages.oldibike.be`

### 1.2 Noter les informations

Railway vous indique l'enregistrement DNS à créer :

```
Type: CNAME
Name: voyages
Value: mototrip-xxxxx.up.railway.app  ← IMPORTANT : Notez cette valeur !
```

⚠️ **Gardez cette page ouverte** pendant que vous configurez WIX !

---

## 🌍 ÉTAPE 2 : Accéder aux DNS dans WIX

### 2.1 Se connecter à WIX

1. Aller sur https://www.wix.com
2. Se connecter à votre compte
3. Aller dans le **Dashboard**

### 2.2 Accéder aux paramètres du domaine

**Chemin 1 - Via les paramètres du site :**
1. Dans le dashboard, cliquer sur votre site **OldiBike**
2. Aller dans **Settings** (Paramètres)
3. Cliquer sur **Domains** (Domaines)
4. Trouver `oldibike.be` dans la liste
5. Cliquer sur les **3 points** (⋮) à côté du domaine
6. Sélectionner **"Manage DNS Records"** ou **"Gérer les enregistrements DNS"**

**Chemin 2 - Via le menu domaines :**
1. Menu principal → **Domains** (Domaines)
2. Sélectionner `oldibike.be`
3. Cliquer sur **DNS** ou **Advanced DNS Settings**

---

## ➕ ÉTAPE 3 : Ajouter l'enregistrement CNAME

### 3.1 Créer un nouvel enregistrement

1. Dans la page DNS, chercher **"Add Record"** ou **"Ajouter un enregistrement"**
2. Sélectionner le type **"CNAME"**

### 3.2 Remplir les informations

**Formulaire à remplir :**

| Champ | Valeur | Explication |
|-------|--------|-------------|
| **Type** | `CNAME` | Type d'enregistrement (déjà sélectionné) |
| **Host** ou **Name** | `voyages` | Le sous-domaine souhaité |
| **Points to** ou **Value** | `mototrip-xxxxx.up.railway.app` | L'URL Railway (sans https://) |
| **TTL** | `3600` ou `Auto` | Temps de mise en cache (laisser par défaut) |

### 3.3 Exemple visuel

```
┌────────────────────────────────────────────┐
│  Type:    CNAME                            │
│  Host:    voyages                          │
│  Value:   mototrip-xxxxx.up.railway.app    │
│  TTL:     3600                             │
│                                            │
│         [Save] [Cancel]                    │
└────────────────────────────────────────────┘
```

### 3.4 Valider

1. Vérifier que toutes les informations sont correctes
2. Cliquer sur **"Save"** ou **"Enregistrer"**
3. WIX peut afficher un avertissement → **Ignorer et continuer**

---

## ⏱️ ÉTAPE 4 : Attendre la propagation DNS

### 4.1 Temps d'attente

- ⏱️ **Minimum** : 10-15 minutes
- ⏱️ **Maximum** : 24-48 heures (rare)
- ⏱️ **En général** : 30 minutes à 2 heures

### 4.2 Pendant l'attente

☕ Prenez un café ! La propagation DNS est automatique, vous n'avez rien à faire.

---

## ✅ ÉTAPE 5 : Vérifier que ça fonctionne

### 5.1 Vérification dans Railway

1. Retourner sur Railway → **Settings** → **Domains**
2. À côté de `voyages.oldibike.be`, vous devriez voir :
   - ✅ **"Active"** (vert) → Tout fonctionne !
   - ⏳ **"Pending"** (orange) → DNS en cours de propagation
   - ❌ **"Error"** (rouge) → Voir section Dépannage

### 5.2 Tester dans le navigateur

Ouvrir votre navigateur et visiter :

```
https://voyages.oldibike.be
```

**Résultats possibles :**

✅ **Ça fonctionne !**
- La page se charge
- Vous voyez votre application Flask

⏳ **"Site can't be reached" ou "DNS_PROBE_FINISHED_NXDOMAIN"**
- DNS pas encore propagé
- Attendre encore 15-30 minutes
- Essayer en navigation privée

❌ **Erreur SSL/HTTPS**
- Railway génère automatiquement un certificat SSL
- Attendre 5-10 minutes supplémentaires

### 5.3 Vérification DNS en ligne

Utilisez des outils en ligne pour vérifier :

**DNSChecker** : https://dnschecker.org
1. Entrer : `voyages.oldibike.be`
2. Type : `CNAME`
3. Cliquer sur "Search"
4. Vous devriez voir votre URL Railway dans les résultats

**WhatsMyDNS** : https://whatsmydns.net
- Même principe
- Montre la propagation mondiale

---

## 🐛 ÉTAPE 6 : Dépannage

### Problème 1 : "Domain already in use"

**Cause** : Un autre service utilise déjà ce sous-domaine

**Solution** :
1. Dans WIX DNS, chercher un enregistrement existant pour `voyages`
2. Le supprimer ou le modifier
3. Réessayer

### Problème 2 : "Invalid CNAME record"

**Causes possibles** :
- ❌ Vous avez mis `https://` devant l'URL Railway
- ❌ Vous avez mis un `/` à la fin

**Solution correcte** :
- ✅ Juste : `mototrip-xxxxx.up.railway.app`
- ❌ Pas : `https://mototrip-xxxxx.up.railway.app/`

### Problème 3 : "Cannot add CNAME for root domain"

**Cause** : Vous essayez de créer `oldibike.be` au lieu de `voyages.oldibike.be`

**Solution** :
- Le champ "Host" doit être : `voyages`
- PAS : `oldibike.be` ou `voyages.oldibike.be`

### Problème 4 : Ça ne fonctionne toujours pas après 24h

**Vérifications** :
1. Dans WIX DNS, l'enregistrement CNAME existe-t-il bien ?
2. Dans Railway, le domaine custom est-il bien configuré ?
3. Essayer de supprimer et recréer l'enregistrement CNAME
4. Vider le cache DNS de votre ordinateur :

**Windows** :
```bash
ipconfig /flushdns
```

**macOS** :
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Linux** :
```bash
sudo systemd-resolve --flush-caches
```

---

## 📊 ÉTAPE 7 : Configuration SSL (automatique)

### 7.1 Certificat HTTPS

Railway génère **automatiquement** un certificat SSL Let's Encrypt :

- ✅ **Gratuit**
- ✅ **Automatique**
- ✅ **Renouvelé automatiquement** tous les 90 jours

### 7.2 Vérification SSL

1. Aller sur `https://voyages.oldibike.be`
2. Cliquer sur le **cadenas** 🔒 dans la barre d'adresse
3. Vérifier que le certificat est valide
4. Émis par : **Let's Encrypt**

---

## 🎨 ÉTAPE 8 : Redirection automatique HTTP → HTTPS

Railway redirige **automatiquement** `http://` vers `https://` :

- `http://voyages.oldibike.be` → `https://voyages.oldibike.be`

Rien à configurer ! ✨

---

## ✅ Checklist finale

- [ ] Enregistrement CNAME créé dans WIX
  - Type : `CNAME`
  - Host : `voyages`
  - Value : `mototrip-xxxxx.up.railway.app`
- [ ] Domaine custom ajouté dans Railway (`voyages.oldibike.be`)
- [ ] Propagation DNS terminée (10-30 minutes)
- [ ] Site accessible via `https://voyages.oldibike.be`
- [ ] Certificat SSL actif (cadenas vert 🔒)
- [ ] Redirection HTTP → HTTPS fonctionne

---

## 🎉 Félicitations !

Votre sous-domaine est maintenant configuré ! 🚀

**Architecture finale :**
```
www.oldibike.be        → Site vitrine WIX
voyages.oldibike.be    → Application Flask (Railway)
```

**Prochaine étape** :
👉 Ajouter un bouton sur votre site WIX → `INTEGRATION-WIX.md`

---

## 📞 Support

**WIX Support** : https://support.wix.com  
**Railway Docs** : https://docs.railway.app/deploy/deployments#custom-domains

**Problème avec ce guide ?** Contactez le support WIX ou Railway selon la nature du problème.
