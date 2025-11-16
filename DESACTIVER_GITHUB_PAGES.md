# 🚫 Désactiver GitHub Pages - Version Statique Obsolète

## ⚠️ Problème Actuel

**URL:** https://oldibike.github.io/mototrip-planner/  
**Problème:** Affiche l'ancienne version statique de l'application (avant migration Flask)

Cette version ne doit **PLUS être accessible** car vous utilisez maintenant Railway pour l'hébergement.

---

## ✅ Solution : Désactiver GitHub Pages

### Étape 1: Désactiver dans les Settings GitHub

1. **Aller sur GitHub** : https://github.com/OldiBike/mototrip-planner
2. Cliquer sur **"Settings"** (onglet en haut)
3. Dans le menu latéral gauche, cliquer sur **"Pages"**
4. Sous **"Source"**, sélectionner **"None"** au lieu de "main" ou "gh-pages"
5. Cliquer sur **"Save"**

✅ **Résultat** : https://oldibike.github.io/mototrip-planner/ retournera une erreur 404

---

### Étape 2: Supprimer la branche gh-pages (si elle existe)

Vérifiez si une branche `gh-pages` existe:

```bash
# Lister toutes les branches
git branch -a

# Si vous voyez "remotes/origin/gh-pages", supprimez-la:
git push origin --delete gh-pages
```

---

### Étape 3: Supprimer les fichiers statiques obsolètes (optionnel)

Si vous n'avez plus besoin de ces fichiers, vous pouvez les supprimer:

```bash
# Supprimer les anciens fichiers HTML statiques
git rm index.html Tripplanner.html
git rm DEPLOIEMENT-GITHUB.md

# Commit
git commit -m "chore: Suppression fichiers statiques obsolètes (migration vers Flask/Railway)"

# Push
git push origin main
```

⚠️ **Attention**: Ne faites ceci que si vous êtes sûr de ne plus en avoir besoin!

---

## 🔄 Rediriger les visiteurs vers la nouvelle URL

### Option A: Laisser une page de redirection sur GitHub Pages

Si vous voulez rediriger automatiquement les visiteurs vers Railway:

1. **Créer un fichier `index.html` minimal** dans la racine:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="refresh" content="0;url=https://voyages.oldibike.be/">
    <title>Redirection...</title>
</head>
<body>
    <p>Redirection vers <a href="https://voyages.oldibike.be/">la nouvelle version</a>...</p>
    <script>
        window.location.href = 'https://voyages.oldibike.be/';
    </script>
</body>
</html>
```

2. **Commit et push**:

```bash
git add index.html
git commit -m "feat: Redirection automatique vers Railway"
git push origin main
```

3. **Réactiver GitHub Pages** (Settings > Pages > Source: main)

✅ Les visiteurs seront automatiquement redirigés vers `https://voyages.oldibike.be/`

---

### Option B: Désactiver complètement (recommandé)

Si personne n'utilise l'URL GitHub Pages, **désactivez-la complètement** (Option 1).

---

## 📊 Résumé des URLs

| URL | Statut | Action |
|-----|--------|--------|
| `http://127.0.0.1:5000/` | ✅ Local dev | Garder |
| `https://oldibike.github.io/mototrip-planner/` | ❌ Obsolète | **DÉSACTIVER** |
| `https://voyages.oldibike.be/` | ✅ Production | URL principale |

---

## 🎯 Recommandation

**Désactivez GitHub Pages complètement** et utilisez uniquement:
- **Local**: `http://127.0.0.1:5000/` pour le développement
- **Production**: `https://voyages.oldibike.be/` pour l'application en ligne

---

**Date:** 16/11/2025  
**Statut:** À faire immédiatement pour éviter la confusion
