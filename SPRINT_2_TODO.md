# 🔍 Sprint 2 - Recherche intelligente avec filtres moto
**Durée estimée**: 1 semaine  
**Début**: 14/11/2025 13:36  
**Statut**: 🟡 En cours

---

## 🎯 Objectif du Sprint

Créer un système de recherche d'hôtels intelligent avec filtrage automatique selon les critères spécifiques pour les voyages à moto.

**Critère de succès**: Recherche d'hôtels fonctionnelle avec filtres moto appliqués automatiquement et interface utilisateur intuitive dans le dashboard admin.

---

## ✅ Checklist des tâches

### 1. Backend - Amélioration du service de recherche
- [ ] **Améliorer `search_hotels_by_region()` dans ratehawk_service.py**
  - Ajouter support pour recherche par nom de ville
  - Conversion ville → region_id via API RateHawk
  
- [ ] **Créer méthode `filter_hotels_for_moto()`**
  - Filtrer par note >= 8.0
  - Analyser amenities pour détecter parking
  - Vérifier petit-déjeuner dans les tarifs
  - Trier résultats (parking privé en premier)

- [ ] **Créer méthode `search_hotels_with_moto_filters()`**
  - Combiner recherche + filtrage automatique
  - Retourner hôtels avec badges (parking, breakfast, note)

---

### 2. Backend - Routes API avancées
- [ ] **Créer route `POST /api/hotels/search-moto-friendly`**
  - Paramètres: ville, checkin, checkout, chambres
  - Retour: Liste d'hôtels filtrés avec métadonnées
  
- [ ] **Créer route `GET /api/hotels/suggest-city`**
  - Autocomplétion de ville pour recherche
  - Retour: Liste de suggestions avec region_id

- [ ] **Créer route `POST /api/hotels/add-to-trip`**
  - Ajouter un hôtel sélectionné à un voyage existant
  - Intégration avec Firebase/Trip model

---

### 3. Frontend - Interface de recherche
- [ ] **Créer template `app/templates/admin/hotel_search.html`**
  - Formulaire de recherche (ville, dates, chambres)
  - Section d'affichage des résultats
  - Design cohérent avec dashboard existant

- [ ] **Créer composant de carte d'hôtel**
  - Photo de l'hôtel
  - Nom, note, prix
  - Badges: ✅ Parking privé, ✅ Petit-déjeuner, ⭐ Note
  - Bouton "Ajouter au voyage"
  - Bouton "Voir détails"

- [ ] **Créer modale de détails d'hôtel**
  - Galerie photos
  - Description complète
  - Équipements
  - Localisation (carte)
  - Liste des tarifs disponibles

---

### 4. Frontend - JavaScript interactions
- [ ] **Créer `app/static/js/hotel_search.js`**
  - Gestion du formulaire de recherche
  - Appels AJAX vers API
  - Affichage dynamique des résultats
  - Gestion des filtres additionnels (étoiles, prix)

- [ ] **Implémenter autocomplétion ville**
  - Suggestions en temps réel
  - Sélection avec clavier (↑↓ Enter)

- [ ] **Gestion d'ajout au voyage**
  - Sélection du voyage cible
  - Confirmation de l'ajout
  - Toast notification de succès

---

### 5. Intégration avec trips existants
- [ ] **Étendre le modèle de données Trip**
  - Ajouter support pour hotels_ratehawk
  - Structure: { ratehawk_id, city, name, price, etc. }

- [ ] **Créer méthode d'ajout d'hôtel dans trip**
  - Validation des dates
  - Éviter les doublons
  - Mise à jour Firebase

---

### 6. Tests et validation
- [ ] **Test 1: Recherche par ville**
  - Chercher "Paris" avec dates valides
  - Vérifier que les résultats sont filtrés
  - Valider les badges affichés

- [ ] **Test 2: Filtrage automatique**
  - Compter hôtels avant/après filtre
  - Vérifier qu'aucun hôtel < 8.0 n'apparaît
  - Valider l'ordre (parking privé en premier)

- [ ] **Test 3: Ajout au voyage**
  - Créer un voyage test
  - Ajouter un hôtel depuis recherche
  - Vérifier dans Firebase

- [ ] **Test 4: Interface responsive**
  - Tester sur mobile/tablette
  - Vérifier l'affichage des cartes
  - Valider les interactions tactiles

---

## 📝 Notes de développement

### Structure de données pour résultats filtrés
```json
{
  "status": "success",
  "total_found": 45,
  "total_filtered": 12,
  "filter_stats": {
    "rejected_low_rating": 20,
    "rejected_no_parking": 10,
    "rejected_no_breakfast": 3
  },
  "hotels": [
    {
      "id": "hotel_123",
      "name": "Hôtel Le Central",
      "city": "Annecy",
      "rating": 8.9,
      "stars": 3,
      "price_min": 85.00,
      "currency": "EUR",
      "badges": {
        "parking_private": true,
        "breakfast_included": true,
        "high_rating": true,
        "verified_oldibike": false
      },
      "photo_url": "https://...",
      "address": "123 Rue du Lac"
    }
  ]
}
```

### Critères de tri
1. **Priorité 1**: Parking privé sécurisé
2. **Priorité 2**: Note (du plus haut au plus bas)
3. **Priorité 3**: Prix (du moins cher au plus cher)

---

## 🎨 Design de l'interface

### Formulaire de recherche
```
┌─────────────────────────────────────────────────────────┐
│ 🔍 Recherche d'hôtels pour motos                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Ville ou région                                          │
│ [Paris_________________] 🔍                              │
│   💡 Annecy, Beaune, Lyon...                            │
│                                                          │
│ Check-in        Check-out        Chambres               │
│ [15/06/2025]    [16/06/2025]    [2 doubles ▼]          │
│                                                          │
│ ✅ Critères moto appliqués automatiquement :             │
│   • Parking sécurisé                                    │
│   • Petit-déjeuner inclus                               │
│   • Note ≥ 8.0/10                                       │
│                                                          │
│ [Rechercher des hôtels]                                 │
└─────────────────────────────────────────────────────────┘
```

### Carte d'hôtel
```
┌─────────────────────────────────────────────────────────┐
│ [Photo]  🏨 Hôtel Le Central            ⭐ 8.9/10       │
│          📍 Centre-ville Annecy         ★★★             │
│                                                          │
│          ✅ Parking privé couvert                        │
│          ✅ Petit-déjeuner inclus                        │
│          💰 À partir de 85€/nuit                         │
│                                                          │
│          [Voir détails] [Ajouter au voyage →]           │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Plan de test

### Test manuel 1: Recherche basique
```bash
curl -X POST http://localhost:5001/api/hotels/search-moto-friendly \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Annecy",
    "checkin": "2025-06-15",
    "checkout": "2025-06-16",
    "rooms": [{"adults": 2}]
  }'
```

**Résultat attendu**: Liste d'hôtels filtrés avec badges

### Test manuel 2: Interface web
1. Ouvrir http://localhost:5001/admin/dashboard
2. Cliquer sur "Rechercher hôtels"
3. Entrer "Annecy" + dates futures
4. Cliquer "Rechercher"
5. Vérifier l'affichage des résultats
6. Cliquer "Ajouter au voyage" sur un hôtel
7. Vérifier l'ajout dans Firebase

---

## 📊 Progression

**Total tâches**: 22  
**Complétées**: 0  
**En cours**: Préparation  
**Bloquées**: Aucune  

---

## ⏭️ Prochaines étapes (Sprint 3)

Une fois le Sprint 2 terminé :
1. Upload et analyse de fichiers GPX
2. Extraction automatique des waypoints
3. Recherche multi-étapes le long de l'itinéraire
4. Suggestions d'alternatives si pas d'hôtels

---

**Dernière mise à jour**: 14/11/2025 13:36  
**Responsable**: Cline AI + OldiBike Team
