# Dashboard Optimisation - Documentation

## 📋 Objectifs

Transformer le dashboard admin actuel en un système professionnel, visuellement clair et user-friendly, même avec des dizaines de voyages.

## ✨ Fonctionnalités Implémentées

### 1. Backend - Services Firebase

**Fichier:** `app/services/firebase_service.py`

Nouvelles méthodes ajoutées :

#### Gestion des Demandes de Voyages (Trip Requests)
- `get_trip_requests(user_id, status)` - Récupère les demandes avec filtrage optionnel
- `get_trip_request(user_id, request_id)` - Récupère une demande spécifique
- `create_trip_request(user_id, request_data)` - Crée une nouvelle demande
- `update_trip_request(user_id, request_id, data)` - Met à jour une demande
- `delete_trip_request(user_id, request_id)` - Supprime une demande
- `count_new_trip_requests(user_id)` - Compte les nouvelles demandes non lues

#### Statistiques Dashboard
- `get_trip_stats(user_id)` - Calcule les stats des voyages par statut
  - Total des voyages
  - Demandés (sans étapes)
  - En construction (avec étapes, non publiés)
  - Publiés

### 2. Backend - Routes API

**Fichier:** `app/routes/admin.py`

#### API Statistiques Dashboard
- `GET /api/dashboard/stats` - Récupère toutes les statistiques

#### API Demandes de Voyages
- `GET /api/trip-requests` - Liste toutes les demandes (avec filtrage par statut)
- `POST /api/trip-requests` - Crée une demande manuelle (encodage admin)
- `GET /api/trip-requests/<id>` - Détails d'une demande
- `PUT /api/trip-requests/<id>/status` - Change le statut
- `POST /api/trip-requests/<id>/create-trip` - Crée un voyage depuis la demande
- `DELETE /api/trip-requests/<id>` - Supprime une demande
- `GET /api/trip-requests/new-count` - Compte pour polling

#### API Publique (sans authentification)
- `POST /api/public/trip-request` - Soumet une demande depuis un formulaire public

## 🗂️ Modèle de Données

### Trip Request (Demande de Voyage)

```javascript
{
  id: "auto-generated",
  requestDate: Timestamp,
  status: "new" | "processing" | "completed" | "rejected",
  source: "public_form" | "manual",
  
  customerInfo: {
    name: String,
    email: String,
    phone: String (optional),
    address: String (optional)
  },
  
  tripDetails: {
    duration: Number (jours),
    region: String,
    startDate: ISO Date String,
    persons: Number,
    kmPerDay: Number,
    comments: String
  },
  
  sourceTrip: String (slug du voyage qui a inspiré - optional),
  linkedTripId: String (quand completed - optional),
  linkedCustomerId: String (quand completed - optional)
}
```

### Trip Stats

```javascript
{
  total: Number,        // Total des voyages
  requested: Number,    // Voyages sans étapes (🟡)
  draft: Number,        // Avec étapes mais non publiés (🔵)
  published: Number     // Publiés et actifs (🟢)
}
```

## 🎨 Frontend à Implémenter

### 1. Dashboard Principal Restructuré

#### A. Cartes de Statistiques (en haut)
```html
┌────────────┬────────────┬────────────┬────────────┐
│   Total    │ Demandés   │En Construct│  Publiés   │
│     15     │     3      │     8      │     4      │
└────────────┴────────────┴────────────┴────────────┘
```

#### B. Navigation par Onglets
- **Voyages** - Gestion des voyages (vue principale)
- **Demandes (badge)** - Nouvelles demandes de voyages
- **Clients** - Gestion des clients

#### C. Vue Voyages - Filtres
- Tous
- Demandés (🟡 sans étapes)
- En construction (🔵 avec étapes)
- Publiés (🟢)

#### D. Vue en Grille (Cards)
Chaque carte de voyage affiche :
- Nom du voyage
- Badge de statut (🟡🔵🟢)
- Nombre d'étapes
- Prix par personne
- Actions rapides (Éditer, Publier, Supprimer)

### 2. Section Demandes

#### A. Liste des Demandes
```html
┌──────────────────────────────────────────┐
│ [+ Nouvelle demande manuelle]            │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ 🆕 Jean Dupont - Alpes 7 jours     │  │
│ │ 📅 14/11/2025 | 👥 2 pers          │  │
│ │ [Détails] [Créer voyage] [✓]       │  │
│ └────────────────────────────────────┘  │
│                                          │
│ ┌────────────────────────────────────┐  │
│ │ ⏳ Marie M. - En cours              │  │
│ │ [Détails] [Lier]                    │  │
│ └────────────────────────────────────┘  │
└──────────────────────────────────────────┘
```

#### B. Modale Détails Demande
- Infos client (nom, email, tel)
- Détails voyage demandé
- Commentaires
- Actions (Créer voyage, Marquer traitée, Supprimer)

#### C. Modale Encodage Manuel
Formulaire avec :
- Nom client
- Email
- Téléphone
- Durée (jours)
- Région
- Date départ
- Nombre de personnes
- KM/jour
- Commentaires

### 3. Formulaire Public

À ajouter dans `app/templates/client/trip.html` (voyage publié) :

```html
<!-- Section en bas de page -->
<section class="request-custom-trip">
  <h2>✨ Demander un voyage sur mesure</h2>
  <button>Faire une demande</button>
</section>

<!-- Modale avec formulaire -->
<div class="modal">
  <form>
    <input name="name" placeholder="Votre nom">
    <input name="email" type="email" placeholder="Email">
    <input name="phone" placeholder="Téléphone">
    <input name="duration" type="number" placeholder="Durée (jours)">
    <input name="region" placeholder="Région souhaitée">
    <input name="startDate" type="date" placeholder="Date départ">
    <input name="persons" type="number" placeholder="Nb personnes">
    <input name="kmPerDay" type="number" placeholder="KM/jour">
    <textarea name="comments" placeholder="Vos souhaits..."></textarea>
    <button type="submit">Envoyer ma demande</button>
  </form>
</div>
```

### 4. Système de Notifications

#### Polling (dashboard.js)
```javascript
// Toutes les 30 secondes
setInterval(async () => {
  const response = await fetch('/api/trip-requests/new-count');
  const data = await response.json();
  updateBadge(data.count);
}, 30000);
```

#### Affichage
- Badge rouge sur l'onglet "Demandes" avec le nombre
- Toast notification quand nouvelle demande détectée
- Son optionnel (paramétrable)

## 🔄 Workflow Complet

```
1. Client soumet demande (web) OU Admin encode manuellement
         ↓
2. Badge rouge apparaît sur "Demandes (X)"
         ↓
3. Admin consulte → Marque "En traitement"
         ↓
4. Admin clique "Créer voyage depuis demande"
         ↓
5. Système crée :
   - Voyage avec nom auto
   - Client (ou trouve existant)
   - Assigne voyage au client
   - Marque demande "Complétée"
         ↓
6. Admin ajoute les étapes au voyage
         ↓
7. Admin publie le voyage
         ↓
8. Voyage accessible aux clients
```

## 📱 Responsive Design

- Mobile : Vue liste compacte
- Tablet : Grille 2 colonnes
- Desktop : Grille 3-4 colonnes

## 🎯 Prochaines Étapes

1. ✅ Backend complet (Firebase + API)
2. ⏳ Frontend dashboard restructuré
3. ⏳ Section demandes
4. ⏳ Formulaire public
5. ⏳ Système notifications
6. ⏳ Tests

## 📊 Performance

- Pagination des voyages (20 par page)
- Lazy loading des images
- Cache des statistiques (1 minute)
- Optimisation des requêtes Firestore
