# 🚀 Déploiement OldiBike - Solution WIX + Railway

## 📋 Vue d'ensemble de la solution

Cette documentation explique comment publier vos **fiches voyages moto** créées dans l'application Flask sur votre site **oldibike.be** hébergé sur WIX.

---

## 🏗️ Architecture finale

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  WIX - Site vitrine (www.oldibike.be)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Bouton : Découvrir nos voyages →]                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Clic client
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  RAILWAY - Application Flask (voyages.oldibike.be)         │
│                                                             │
│  📄 Routes PUBLIQUES (vos clients) :                        │
│  • GET  /voyages              → Liste de tous les voyages  │
│  • GET  /voyages/<slug>       → Fiche voyage détaillée     │
│  • POST /voyages/<slug>/book  → Réservation + Stripe       │
│                                                             │
│  🔒 Routes PRIVÉES (vous) :                                 │
│  • /admin                     → Dashboard                  │
│  • /customers                 → Gestion clients            │
│  • /hotels                    → Banque d'hôtels            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
            │                           │
            │                           │
            ▼                           ▼
    ┌───────────────┐          ┌──────────────┐
    │   Firebase    │          │    Stripe    │
    │   Firestore   │          │   Payments   │
    │   Storage     │          │              │
    └───────────────┘          └──────────────┘
```

---

## 🎯 Pourquoi cette solution ?

### ❌ Limitations de WIX

- WIX ne peut pas héberger d'applications Flask (Python)
- WIX est conçu pour des sites statiques/CMS
- Impossible d'uploader directement une app dynamique

### ✅ Solution retenue : WIX + Railway

| Composant | Rôle | Hébergement |
|-----------|------|-------------|
| **Site vitrine** | Présentation entreprise, accueil | WIX (actuel) |
| **Application voyages** | Fiches, réservations, paiements | Railway (nouveau) |
| **Base de données** | Voyages, clients, bookings | Firebase |
| **Paiements** | Traitement sécurisé | Stripe |
| **DNS** | Gestion nom de domaine | WIX |

---

## 📚 Guides disponibles

Tous les guides détaillés ont été créés. Suivez-les dans l'ordre :

### 1️⃣ Déployer sur Railway
📄 **Fichier** : `DEPLOIEMENT-RAILWAY.md`

**Ce que vous allez faire** :
- ✅ Créer un compte Railway (gratuit)
- ✅ Connecter votre repo GitHub
- ✅ Configurer les variables d'environnement (copier/coller depuis `.env`)
- ✅ Déployer automatiquement
- ✅ Obtenir l'URL : `mototrip-xxxxx.up.railway.app`

⏱️ **Temps estimé** : 15-20 minutes

---

### 2️⃣ Configurer le sous-domaine
📄 **Fichier** : `CONFIGURATION-DNS-WIX.md`

**Ce que vous allez faire** :
- ✅ Accéder aux DNS dans WIX
- ✅ Ajouter un enregistrement CNAME : `voyages` → Railway
- ✅ Configurer le domaine custom dans Railway
- ✅ Attendre la propagation DNS (10-30 min)
- ✅ Vérifier que `voyages.oldibike.be` fonctionne

⏱️ **Temps estimé** : 10 minutes (+ 30 min d'attente DNS)

---

### 3️⃣ Ajouter le bouton sur WIX
📄 **Fichier** : `INTEGRATION-WIX.md`

**Ce que vous allez faire** :
- ✅ Ouvrir l'éditeur WIX
- ✅ Ajouter un bouton "Découvrir nos voyages"
- ✅ Lien vers `https://voyages.oldibike.be`
- ✅ Publier le site

⏱️ **Temps estimé** : 10 minutes

---

## 🚦 Workflow une fois déployé

### Comment publier un nouveau voyage ?

1. **Vous** : Créez le voyage dans l'admin Flask
   - Connectez-vous : `voyages.oldibike.be/admin/login`
   - Dashboard → Créer un voyage
   - Remplissez tous les détails (étapes, hôtels, prix, photos)
   
2. **Vous** : Publiez le voyage
   - Cliquez sur "Publier"
   - Choisissez un slug : `balade-ardennes-2024`
   - Validez

3. **Firebase** : Enregistre automatiquement
   - Le voyage est stocké dans `publishedTrips`
   - Accessible instantanément

4. **Client** : Découvre le voyage
   - Visite `www.oldibike.be`
   - Clique sur "Découvrir nos voyages"
   - Redirigé vers `voyages.oldibike.be`
   - Voit le nouveau voyage dans la liste

5. **Client** : Réserve le voyage
   - Clique sur "Découvrir ce voyage"
   - Remplit le formulaire de réservation
   - Redirigé vers Stripe pour payer
   - Reçoit un email de confirmation

**✨ Tout est automatique ! Aucune manipulation WIX nécessaire !**

---

## 💰 Coûts mensuels

| Service | Coût | Notes |
|---------|------|-------|
| **WIX** | Variable | Votre abonnement actuel (pas de surcoût) |
| **Railway** | Gratuit → ~5-7$/mois | 500h/mois gratuit, puis facturation usage |
| **Firebase** | Gratuit → ~5$/mois | Plan Spark gratuit suffisant au début |
| **Stripe** | 1.4% + 0.25€ | Par transaction seulement |
| **Domaine** | Inclus dans WIX | ✅ Déjà payé |

**💡 Total estimé début** : 0-10€/mois (selon le trafic)

---

## 🔒 Sécurité et confidentialité

### Variables sensibles

❌ **Ne jamais commiter dans Git** :
- `.env` (déjà dans `.gitignore` ✅)
- Clés Firebase
- Clés Stripe
- SECRET_KEY

✅ **Stocker dans Railway** :
- Toutes les variables sont dans l'interface Railway
- Cryptées et sécurisées
- Jamais exposées publiquement

### Accès

- **Admin** : Accessible uniquement par vous (`/admin/login` protégé)
- **Clients** : Accès limité aux routes publiques (`/voyages`)
- **Firebase** : Règles de sécurité déjà configurées
- **Stripe** : Clés séparées (test/production)

---

## 📊 Monitoring et maintenance

### Surveiller l'application

**Railway Dashboard** :
- Logs en temps réel
- Métriques (CPU, RAM, Requêtes)
- Historique des déploiements

**Firebase Console** :
- Nombre de voyages publiés
- Nombre de réservations
- Stockage utilisé

**WIX Analytics** :
- Clics sur le bouton "Voyages"
- Pages vues
- Taux de conversion

### Mises à jour automatiques

À chaque `git push` sur GitHub :
1. Railway détecte le changement
2. Rebuild automatique
3. Déploiement (2-3 minutes)
4. Sans downtime (zero-downtime deployment)

```bash
# Faire une modification
git add .
git commit -m "Ajout d'un nouveau voyage"
git push origin main

# Railway déploie automatiquement ✨
```

---

## 🐛 Dépannage

### Problème : "Site can't be reached"

**Solutions** :
1. Vérifier que Railway est bien déployé (statut "Active")
2. Vérifier les DNS dans WIX (enregistrement CNAME)
3. Attendre 30 minutes (propagation DNS)
4. Vider le cache DNS : `ipconfig /flushdns` (Windows) ou `sudo killall -HUP mDNSResponder` (macOS)

### Problème : "500 Internal Server Error"

**Solutions** :
1. Consulter les logs Railway
2. Vérifier les variables d'environnement (Firebase, Stripe)
3. Vérifier que `FIREBASE_PRIVATE_KEY` est bien formaté

### Problème : Stripe ne fonctionne pas

**Solutions** :
1. Vérifier que les clés Stripe sont correctes
2. Vérifier le mode (test vs production)
3. Consulter le dashboard Stripe pour les erreurs

### Problème : Les voyages n'apparaissent pas

**Solutions** :
1. Vérifier que le voyage est bien "publié" dans l'admin
2. Vérifier Firebase Console (`publishedTrips` collection)
3. Vider le cache du navigateur

---

## 📁 Fichiers créés

Voici tous les fichiers ajoutés à votre projet :

```
App/
├── DEPLOIEMENT-RAILWAY.md       ← Guide déploiement Railway
├── CONFIGURATION-DNS-WIX.md     ← Guide configuration DNS
├── INTEGRATION-WIX.md           ← Guide bouton WIX
├── DEPLOIEMENT-WIX-RAILWAY.md   ← Ce fichier (résumé)
├── runtime.txt                  ← Version Python pour Railway
├── Procfile                     ← Déjà existant ✅
└── requirements.txt             ← Déjà existant ✅
```

---

## ✅ Checklist complète

Avant de commencer :
- [x] Code sur GitHub : https://github.com/OldiBike/mototrip-planner
- [x] Fichier `.env` avec toutes les variables
- [x] Compte WIX actif avec oldibike.be
- [x] Guides de déploiement créés

Étape 1 - Railway :
- [ ] Compte Railway créé
- [ ] Repo GitHub connecté
- [ ] Variables d'environnement configurées
- [ ] Application déployée
- [ ] URL Railway testée

Étape 2 - DNS :
- [ ] Enregistrement CNAME ajouté dans WIX
- [ ] Domaine custom configuré dans Railway
- [ ] DNS propagé (voyages.oldibike.be accessible)
- [ ] Certificat SSL actif (🔒)

Étape 3 - WIX :
- [ ] Bouton ajouté sur le site
- [ ] Lien configuré vers voyages.oldibike.be
- [ ] Testé (desktop + mobile)
- [ ] Site WIX publié

Étape 4 - Test final :
- [ ] Créer un voyage test dans l'admin
- [ ] Le publier
- [ ] Vérifier qu'il apparaît sur voyages.oldibike.be
- [ ] Tester une réservation (mode test Stripe)

---

## 🎉 Résultat final

Une fois tout configuré, voici ce qui se passe :

### Du côté client

1. **Visite** `www.oldibike.be` (site WIX)
2. **Clique** sur "Découvrir nos voyages"
3. **Redirigé** vers `voyages.oldibike.be` (app Flask)
4. **Parcourt** la liste des voyages
5. **Sélectionne** un voyage qui l'intéresse
6. **Remplit** le formulaire de réservation
7. **Paie** via Stripe (sécurisé)
8. **Reçoit** email de confirmation

### Du côté admin (vous)

1. **Créez** vos voyages dans l'admin
2. **Publiez** quand vous êtes prêt
3. **Voyages disponibles** instantanément
4. **Gérez** les réservations depuis le dashboard
5. **Consultez** les statistiques
6. **Modifiez/Supprimez** à volonté

**🎯 Expérience fluide pour vous et vos clients !**

---

## 🚀 Prochaines étapes

Une fois le déploiement terminé :

1. **Tester en mode production**
   - Créer plusieurs voyages
   - Tester le processus de réservation complet
   - Vérifier les emails de confirmation

2. **Promouvoir sur les réseaux**
   - Facebook : Post avec lien vers voyages.oldibike.be
   - Instagram : Mettre le lien en bio
   - Newsletter : Annoncer les nouveaux voyages

3. **Optimiser le SEO**
   - Ajouter des meta descriptions
   - Optimiser les images
   - Créer un sitemap

4. **Analyser les performances**
   - Google Analytics
   - Railway metrics
   - Stripe dashboard

---

## 📞 Support et ressources

### Documentation officielle

- **Railway** : https://docs.railway.app
- **WIX** : https://support.wix.com
- **Flask** : https://flask.palletsprojects.com
- **Firebase** : https://firebase.google.com/docs
- **Stripe** : https://stripe.com/docs

### Communautés

- **Railway Discord** : https://discord.gg/railway
- **Flask Discord** : https://discord.gg/pallets

### Contact

**Problème avec ce guide ?**
- Consultez les logs Railway (Deployments → View Logs)
- Vérifiez les guides spécifiques (DEPLOIEMENT-RAILWAY.md, etc.)
- Contactez le support Railway ou WIX selon le problème

---

## 🎊 Conclusion

Vous disposez maintenant d'une **solution professionnelle** pour publier vos voyages moto :

✅ **Site vitrine** sur WIX (www.oldibike.be)  
✅ **Application dynamique** sur Railway (voyages.oldibike.be)  
✅ **Base de données** Firebase (scalable)  
✅ **Paiements sécurisés** Stripe  
✅ **Déploiements automatiques** via GitHub  
✅ **SSL/HTTPS** gratuit et automatique  
✅ **Monitoring** en temps réel  

**Tout est prêt pour lancer votre activité de voyages à moto ! 🏍️💨**

---

*Documentation créée le 15/11/2025*  
*Version 1.0*  
*OldiBike - Voyages moto en Europe*
