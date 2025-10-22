# 📦 Guide de Déploiement sur GitHub Pages

## Étape 1 : Créer un compte GitHub (si nécessaire)

1. Allez sur https://github.com
2. Cliquez sur "Sign up"
3. Créez votre compte (utilisez un nom professionnel)

## Étape 2 : Créer un nouveau repository

1. Une fois connecté, cliquez sur le **+** en haut à droite
2. Sélectionnez **"New repository"**
3. Configurez votre repository :
   - **Repository name** : `mototrip-planner` (ou un nom de votre choix)
   - **Description** : "Application web pour gérer mes voyages à moto"
   - **Visibilité** : Cochez **Public** (gratuit)
   - **Ne cochez PAS** "Add a README file" (on l'a déjà)
4. Cliquez sur **"Create repository"**

## Étape 3 : Uploader vos fichiers

Vous avez maintenant 3 fichiers prêts dans votre dossier :
- `index.html` (votre application)
- `README.md` (documentation)
- `.gitignore` (fichiers à ignorer)

### Option A : Via l'interface web (plus simple)

1. Sur la page de votre repository, cliquez sur **"Add file"** → **"Upload files"**
2. Glissez-déposez les 3 fichiers :
   - `index.html`
   - `README.md`
   - `.gitignore`
3. En bas de la page, dans "Commit changes" :
   - Message : "Initial commit - Application MotoTrip Planner"
4. Cliquez sur **"Commit changes"**

### Option B : Via Git (si vous connaissez)

```bash
cd /Users/oldibox/Library/CloudStorage/OneDrive-Personnel/OldiBike/App
git init
git add index.html README.md .gitignore
git commit -m "Initial commit - Application MotoTrip Planner"
git branch -M main
git remote add origin https://github.com/VOTRE-USERNAME/mototrip-planner.git
git push -u origin main
```

## Étape 4 : Activer GitHub Pages

1. Dans votre repository, cliquez sur **"Settings"** (en haut)
2. Dans le menu de gauche, cliquez sur **"Pages"**
3. Dans la section "Build and deployment" :
   - **Source** : Sélectionnez "Deploy from a branch"
   - **Branch** : Sélectionnez "main" puis "/ (root)"
   - Cliquez sur **"Save"**

## Étape 5 : Accéder à votre application 🎉

1. Attendez 1-2 minutes (GitHub prépare votre site)
2. Rafraîchissez la page "Settings > Pages"
3. Vous verrez un bandeau vert avec votre URL :
   ```
   Your site is live at https://VOTRE-USERNAME.github.io/mototrip-planner/
   ```
4. Cliquez sur **"Visit site"**

## 🔧 Mettre à jour votre application

Quand vous modifiez l'application :

1. Allez sur votre repository GitHub
2. Cliquez sur le fichier `index.html`
3. Cliquez sur l'icône ✏️ (Edit)
4. Collez le nouveau code
5. En bas : "Update index.html"
6. Cliquez sur **"Commit changes"**
7. Attendez 1-2 minutes → votre site sera mis à jour !

## 🎨 Personnaliser le README

Éditez le fichier `README.md` pour :
- Remplacer `votre-username` par votre vrai username GitHub
- Ajouter votre email de contact
- Ajouter des captures d'écran (optionnel)

## ⚠️ Important : Sécurité Firebase

✅ Vos données sont protégées même si l'app est publique car :
- Firebase utilise l'authentification anonyme
- Vos règles Firestore limitent l'accès par `userId`
- Chaque visiteur aura ses propres données isolées

## 🆘 Problèmes courants

### Le site affiche "404"
- Vérifiez que le fichier s'appelle bien `index.html`
- Attendez 5 minutes après l'activation de Pages

### L'app ne charge pas
- Ouvrez la console du navigateur (F12)
- Vérifiez qu'il n'y a pas d'erreurs Firebase

### Les données ne se sauvegardent pas
- Vérifiez vos règles Firebase dans la console Firebase

## 📞 Support

Si vous avez besoin d'aide :
- Documentation GitHub Pages : https://pages.github.com
- Documentation Firebase : https://firebase.google.com/docs

---

✨ Votre application est maintenant accessible partout dans le monde ! ✨
