# 🏨 Système de Gestion de la Banque de Données d'Hôtels

## 📋 Vue d'ensemble

Ce document décrit l'architecture complète du système de gestion centralisée des hôtels pour MotoTrip Planner.

### Objectifs
- ✅ Créer une banque de données réutilisable d'hôtels
- ✅ Éliminer la duplication des données
- ✅ Permettre aux clients d'évaluer les hôtels (notes + commentaires)
- ✅ Faciliter la création rapide de voyages

---

## 🗂️ Structure de données

### Collection Firebase : `hotels`

```javascript
{
  "hotel_abc123": {
    // Identification
    id: "hotel_abc123",
    name: "Hotel Ritz Paris",
    
    // Localisation
    city: "Paris",
    address: "15 Place Vendôme, 75001 Paris, France",
    googlePlaceId: "ChIJD7fiBh9u5kcRYJSMaMOCCwQ",  // Clé unique
    
    // Contact
    contact: {
      phone: "+33 1 43 16 30 30",
      email: "contact@ritzparis.com",
      website: "https://www.ritzparis.com"
    },
    
    // Prix par défaut
    defaultPricing: {
      priceDouble: 150.00,
      priceSolo: 200.00,
      currency: "EUR"
    },
    
    // Médias (photos Google Places)
    photos: [
      {
        url: "https://storage.googleapis.com/...",
        source: "google_places",
        storagePath: "users/sam-user/hotels/hotel_ritz_paris/photo_1.jpg",
        uploadedAt: Timestamp
      }
    ],
    
    // Évaluations clients
    ratings: {
      averageRating: 4.5,        // Moyenne calculée (0-5)
      totalRatings: 12,          // Nombre total d'avis
      lastRatingAt: Timestamp    // Dernière évaluation
    },
    
    // Statistiques d'utilisation
    usageStats: {
      usedInTrips: ["trip_1", "trip_3"],  // IDs des voyages
      usedCount: 5,                         // Nombre d'utilisations
      lastUsed: Timestamp                   // Dernière utilisation
    },
    
    // Métadonnées
    createdAt: Timestamp,
    createdBy: "sam-user",
    updatedAt: Timestamp
  }
}
```

### Sous-collection : `hotels/{hotelId}/reviews`

```javascript
{
  "review_xyz789": {
    id: "review_xyz789",
    
    // Qui a évalué
    customerId: "customer_123",
    customerName: "Jean Dupont",
    
    // Évaluation
    rating: 5,                    // 1-5 étoiles
    comment: "Excellent hôtel, très bien situé !",
    
    // Contexte
    tripId: "trip_456",           // Voyage concerné
    visitDate: "2024-08-15",      // Date de la visite
    
    // Métadonnées
    createdAt: Timestamp,
    updatedAt: Timestamp
  }
}
```

### Modification de la collection `days` (étapes)

```javascript
{
  "day_123": {
    dayName: "Jour 1",
    city: "Paris",
    
    // NOUVEAU : Référence à l'hôtel
    hotelId: "hotel_abc123",     // ID de l'hôtel dans la banque
    
    // OPTIONNEL : Override des prix pour cette étape spécifique
    priceOverride: {
      priceDouble: 160.00,       // Peut différer du prix par défaut
      priceSolo: 210.00
    },
    
    // Notes spécifiques à cette étape
    notes: "Demander chambre avec vue sur Tour Eiffel",
    
    // Autres champs existants
    nights: 1,
    gpxFile: "jour_1.gpx",
    hotelLink: "https://...",
    createdAt: Timestamp
  }
}
```

---

## 🔌 API Backend

### Routes Admin (`/admin/api/hotels`)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/admin/api/hotels` | Liste tous les hôtels |
| POST | `/admin/api/hotels` | Créer un nouvel hôtel |
| GET | `/admin/api/hotels/<hotel_id>` | Détails d'un hôtel |
| PUT | `/admin/api/hotels/<hotel_id>` | Modifier un hôtel |
| DELETE | `/admin/api/hotels/<hotel_id>` | Supprimer un hôtel |
| GET | `/admin/api/hotels/search?q=<query>` | Rechercher des hôtels |
| GET | `/admin/api/hotels/<hotel_id>/stats` | Stats d'utilisation |

### Routes Client (`/api/hotels`)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/hotels/<hotel_id>` | Voir un hôtel (public) |
| POST | `/api/hotels/<hotel_id>/reviews` | Ajouter une évaluation |
| GET | `/api/hotels/<hotel_id>/reviews` | Lire les évaluations |
| PUT | `/api/hotels/<hotel_id>/reviews/<review_id>` | Modifier son avis |
| DELETE | `/api/hotels/<hotel_id>/reviews/<review_id>` | Supprimer son avis |

---

## 🖥️ Interfaces Utilisateur

### 1. Page Admin "Banque d'Hôtels"

**URL**: `/admin/hotels`

**Fonctionnalités**:
- Liste de tous les hôtels avec recherche et filtres
- Tri par : nom, ville, note, utilisation
- Actions : Modifier, Supprimer, Voir détails
- Statistiques globales : nombre d'hôtels, villes, note moyenne

### 2. Modale "Nouvel Hôtel"

**Champs du formulaire**:
```
- Nom de l'hôtel *
- Ville *
- Adresse complète *
- Téléphone
- Email
- Site web
- Prix double par défaut *
- Prix solo par défaut *
☑️ Télécharger automatiquement 5 photos Google
```

### 3. Formulaire "Ajout d'étape" modifié

**Deux modes**:

**Mode A : Sélection depuis la banque**
```
Hôtel : [🔍 Rechercher dans la banque____▼]
  Suggestions:
  • Hotel Ritz Paris (Paris) ⭐4.8 - 150€/200€
  • Logis Atrium (Épinal) ⭐4.2 - 80€/120€
  
Prix pour cette étape (optionnel):
  Double: [____€] Solo: [____€]
  (laissez vide pour utiliser les prix par défaut)
```

**Mode B : Créer un nouvel hôtel**
```
☑️ Créer un nouvel hôtel et l'ajouter à la banque
  [Formulaire complet comme modale "Nouvel Hôtel"]
```

### 4. Espace Client - Évaluation

**Après le voyage** (dans "Mes Voyages"):
```
┌────────────────────────────────────┐
│ Voyage Alpes 10 jours - Terminé   │
│ Du 10/08/2024 au 20/08/2024       │
├────────────────────────────────────┤
│ 📝 Évaluez vos hébergements:       │
│                                    │
│ Jour 1 - Hotel Ritz Paris         │
│ ⭐⭐⭐⭐⭐ [Votre note]            │
│ 💬 [Votre commentaire_________]    │
│ [Envoyer]                          │
│                                    │
│ Jour 2 - Logis Atrium             │
│ ⭐⭐⭐⭐☆ [Déjà noté ✅]          │
└────────────────────────────────────┘
```

---

## 🔄 Workflows

### Workflow 1 : Admin crée un voyage

```mermaid
1. Admin crée nouveau voyage
   ↓
2. Admin ajoute étape "Jour 1"
   ↓
3. Admin recherche "Ritz" dans la banque
   ↓
4. Système affiche : "Hotel Ritz Paris ⭐4.8 (12 avis) - 150€/200€"
   ↓
5. Admin sélectionne → Prix et photos pré-chargés
   ↓
6. Admin peut override les prix si besoin
   ↓
7. ✅ Étape créée avec hotelId="hotel_abc123"
```

### Workflow 2 : Admin crée un nouvel hôtel

```mermaid
1. Admin sur page "Banque d'Hôtels"
   ↓
2. Clic sur "➕ Nouvel hôtel"
   ↓
3. Remplit formulaire (nom, ville, adresse, prix...)
   ↓
4. Saisit nom avec autocomplétion Google Places
   ↓
5. ☑️ Télécharger photos Google (si disponibles)
   ↓
6. Système télécharge 5 photos → Firebase Storage
   ↓
7. ✅ Hôtel créé dans collection "hotels"
   ↓
8. Peut maintenant être utilisé dans n'importe quel voyage
```

### Workflow 3 : Client évalue un hôtel

```mermaid
1. Client termine son voyage
   ↓
2. Email automatique : "Évaluez votre expérience"
   ↓
3. Client se connecte à son espace
   ↓
4. Va dans "Mes Voyages" → Sélectionne le voyage terminé
   ↓
5. Section "Évaluez vos hébergements" apparaît
   ↓
6. Client note chaque hôtel (1-5 ⭐) + commentaire
   ↓
7. Clic "Envoyer l'évaluation"
   ↓
8. ✅ Avis enregistré dans hotels/{id}/reviews
   ↓
9. Moyenne recalculée automatiquement
   ↓
10. Admin voit nouvelle note lors de prochaine utilisation
```

---

## 📊 Calculs automatiques

### Moyenne des notes

```python
def calculate_average_rating(hotel_id):
    reviews = get_hotel_reviews(hotel_id)
    if not reviews:
        return 0
    
    total = sum(review['rating'] for review in reviews)
    average = total / len(reviews)
    
    # Mise à jour de l'hôtel
    update_hotel(hotel_id, {
        'ratings.averageRating': round(average, 1),
        'ratings.totalRatings': len(reviews),
        'ratings.lastRatingAt': now()
    })
    
    return average
```

### Stats d'utilisation

```python
def increment_hotel_usage(hotel_id, trip_id):
    # Lors de l'ajout d'une étape avec cet hôtel
    hotel = get_hotel(hotel_id)
    
    used_in_trips = hotel.get('usageStats.usedInTrips', [])
    if trip_id not in used_in_trips:
        used_in_trips.append(trip_id)
    
    update_hotel(hotel_id, {
        'usageStats.usedInTrips': used_in_trips,
        'usageStats.usedCount': len(used_in_trips),
        'usageStats.lastUsed': now()
    })
```

---

## 🎨 Design des interfaces

### Carte Hôtel (Admin)

```
┌──────────────────────────────────────────┐
│ 🏨 Hotel Ritz Paris          ⭐⭐⭐⭐⭐ │
│ 📍 Paris - 15 Place Vendôme            │
│ 💰 150€ (double) | 200€ (solo)         │
│ 📸 5 photos | 🔄 Utilisé 3x dans voyages│
│ ⭐ 4.8/5 (12 avis clients)             │
│                                         │
│ [✏️ Modifier] [👁️ Détails] [🗑️ Supprimer]│
└──────────────────────────────────────────┘
```

### Badge Note (partout)

```html
<span class="hotel-rating">
  ⭐ 4.8 <span class="text-gray-500">(12 avis)</span>
</span>
```

---

## 🔒 Sécurité & Permissions

### Admin
- ✅ CRUD complet sur tous les hôtels
- ✅ Voir toutes les évaluations
- ❌ Ne peut PAS modifier/supprimer les avis clients

### Client
- ✅ Voir les hôtels des voyages auxquels ils participent
- ✅ Évaluer les hôtels de leurs voyages terminés
- ✅ Modifier/supprimer leurs propres avis
- ❌ Ne peut PAS voir/modifier les autres avis

---

## 📈 Évolutions futures possibles

- 🌟 Système de favoris (Admin marque ses hôtels préférés)
- 🔔 Alertes si note d'un hôtel chute
- 📊 Statistiques avancées (hôtels les plus utilisés, par ville, etc.)
- 🗺️ Carte interactive des hôtels
- 💬 Réponses admin aux avis clients
- 🏷️ Tags/catégories (moto-friendly, petit-déjeuner inclus, etc.)
- 💾 Export CSV/Excel de la banque d'hôtels

---

## ✅ Checklist d'implémentation

### Phase 1 : Backend (3-4h)
- [ ] Créer méthodes CRUD hotels dans firebase_service.py
- [ ] Créer méthodes reviews dans firebase_service.py
- [ ] Créer routes API /admin/api/hotels/* dans admin.py
- [ ] Créer routes API /api/hotels/* pour clients
- [ ] Tester toutes les routes avec Postman/curl

### Phase 2 : Frontend Admin (3h)
- [ ] Créer page app/templates/admin/hotels.html
- [ ] Créer app/static/js/hotels.js
- [ ] Implémenter liste + recherche + filtres
- [ ] Modale "Nouvel hôtel" avec formulaire
- [ ] Modifier formulaire ajout d'étape (sélection depuis banque)
- [ ] Adapter téléchargement photos Google pour nouveaux hôtels

### Phase 3 : Frontend Client (2h)
- [ ] Ajouter section "Évaluez vos hébergements" dans trips/detail.html
- [ ] Interface de notation (5 étoiles cliquables)
- [ ] Formulaire de commentaire
- [ ] Affichage des notes moyennes

### Phase 4 : Tests & Validation (1h)
- [ ] Tester création d'hôtel avec photos Google
- [ ] Tester sélection d'hôtel dans nouvelle étape
- [ ] Tester évaluation par client
- [ ] Vérifier calcul des moyennes
- [ ] Tester stats d'utilisation

---

## 🎯 Date de mise à jour
Document créé le : 15/11/2024
Dernière mise à jour : 15/11/2024
Version : 1.0
