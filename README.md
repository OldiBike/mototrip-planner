# MotoTrip Planner 🏍️

Application web pour organiser et gérer vos voyages à moto, développée par **OldiBike**.

## 🎯 Fonctionnalités

### Gestion des Voyages
- ✅ Création et gestion de plusieurs voyages
- ✅ Organisation par étapes/jours
- ✅ Copier/Déplacer des étapes entre voyages

### Informations Hôtels
- ✅ Séparation Ville / Nom de l'hôtel
- ✅ **Extraction automatique depuis URL RateHawk**
- ✅ Détection de doublons de ville
- ✅ Indicateur de nuits multiples
- ✅ Lien direct vers la réservation

### Calculateur de Prix 💰
- ✅ Calcul automatique des coûts (Double/Solo)
- ✅ Prix par personne pour chambre double
- ✅ Saisie du prix de vente par personne
- ✅ **Calcul automatique de la marge en €/%**
- ✅ Prix de vente total avec marge

### Autres
- ✅ Gestion des fichiers GPX (Kurviger)
- ✅ Outil d'adaptation de voyage
- ✅ Interface moderne et responsive
- ✅ Sauvegarde en temps réel (Firebase)

## 🚀 Utilisation

1. Ouvrez l'application : [https://votre-username.github.io/mototrip-planner](https://votre-username.github.io/mototrip-planner)
2. L'authentification se fait automatiquement
3. Créez votre premier voyage
4. Ajoutez des étapes en collant les URLs RateHawk

## 🛠️ Technologies

- HTML5 / TailwindCSS
- JavaScript (ES6)
- Firebase (Firestore + Auth)
- Font Awesome

## 📝 Structure des données

Chaque voyage contient :
- Nom du jour/étape
- Ville
- Nom de l'hôtel
- Prix chambre double
- Prix solo
- Nombre de nuits
- Fichier GPX
- Lien vers la réservation

## 🔒 Sécurité

- Authentification anonyme Firebase
- Données privées par utilisateur
- Règles Firestore sécurisées

## 📄 Licence

© 2025 OldiBike - Tous droits réservés

## 🤝 Contact

Pour toute question : [votre-email@exemple.com](mailto:votre-email@exemple.com)
