# Implémentation Phases 3 & 4 - Système Hôtels

## ✅ Phase 3 : Interface Client Reviews (TERMINÉ)

### Ce qui a été implémenté

#### 1. Routes API Client (app/routes/bookings.py)

Ajout de 3 nouvelles routes pour les reviews d'hôtels :

```python
# Liste des hôtels d'une réservation
@bp.route('/<booking_id>/hotels')
def booking_hotels(booking_id)

# Ajouter/Consulter une review
@bp.route('/<booking_id>/hotels/<hotel_id>/reviews', methods=['GET', 'POST'])
def manage_hotel_review(booking_id, hotel_id)

# Modifier/Supprimer une review
@bp.route('/<booking_id>/hotels/<hotel_id>/reviews/<review_id>', methods=['PUT', 'DELETE'])
def update_delete_hotel_review(booking_id, hotel_id, review_id)
```

**Fonctionnalités** :
- ✅ Récupération des hôtels du voyage depuis les étapes
- ✅ Vérification des droits d'accès utilisateur
- ✅ Validation des notes (1-5 étoiles)
- ✅ Prévention des doublons (1 review par client/hôtel/voyage)
- ✅ Recalcul automatique de la moyenne des notes
- ✅ Sécurité : vérification que l'utilisateur modifie uniquement ses propres avis

#### 2. Template Client (app/templates/bookings/hotels_review.html)

**Interface complète d'évaluation** :
- ✅ Système d'étoiles interactif (survol + clic)
- ✅ Formulaire de commentaire avec validation
- ✅ Affichage de la note moyenne de l'hôtel
- ✅ Visualisation des avis existants
- ✅ Édition/Suppression des propres avis
- ✅ Design responsive avec Bootstrap 5
- ✅ Feedback visuel (animations, états hover)

**JavaScript inclus** :
- ✅ Gestion des étoiles cliquables
- ✅ Soumission AJAX des reviews
- ✅ Édition inline des avis
- ✅ Confirmation de suppression
- ✅ Gestion des erreurs et messages

#### 3. Lien dans la page de réservation (app/templates/bookings/detail.html)

Ajout d'un bouton **"Évaluer les hôtels"** dans la section des détails du voyage :

```html
<a href="{{ url_for('bookings.booking_hotels', booking_id=booking.booking_id) }}" 
   class="btn btn-outline-primary">
    <i class="bi bi-star"></i> Évaluer les hôtels
</a>
```

### Workflow complet

1. **Client accède à sa réservation** → `/bookings/<booking_id>`
2. **Clique sur "Évaluer les hôtels"** → `/bookings/<booking_id>/hotels`
3. **Voit tous les hôtels** du voyage avec possibilité de noter
4. **Sélectionne 1-5 étoiles** et ajoute un commentaire
5. **Soumet l'avis** → Enregistré dans Firebase
6. **Note moyenne recalculée** automatiquement
7. **Peut modifier/supprimer** son propre avis

---

## 🔧 Phase 4 : Lier Photos aux Hôtels (EN COURS)

### Objectif

Actuellement, les photos sont liées aux **étapes** (`linkedDayId`).  
On veut les lier aux **hôtels de la banque** (`hotelId`) pour :
- Réutiliser les photos entre voyages
- Centraliser la gestion des photos par hôtel
- Afficher les photos sur la page détails de l'hôtel

### Structure de données à modifier

#### Avant (structure actuelle)
```javascript
// Collection: users/{userId}/media
{
  type: "hotel",
  hotelName: "Hotel Le Colombier",
  linkedDayId: "day-123",
  linkedTripId: "trip-abc",
  downloadURL: "https://...",
  source: "google_places",
  uploadedAt: Timestamp
}
```

#### Après (structure proposée)
```javascript
// Collection: users/{userId}/media
{
  type: "hotel",
  hotelName: "Hotel Le Colombier",
  hotelId: "hotel-xyz",  // ⭐ NOUVEAU : Lien vers la banque d'hôtels
  linkedDayId: "day-123",  // Conservé pour retrouver le voyage d'origine
  linkedTripId: "trip-abc",
  downloadURL: "https://...",
  source: "google_places",
  uploadedAt: Timestamp
}
```

### Modifications à faire

#### 1. Modifier l'upload de photos (app/routes/admin.py)

**Dans la fonction `download_place_photo()`** :
```python
# Ligne ~1100
@bp.route('/api/download-place-photo', methods=['POST'])
def download_place_photo():
    # ... code existant ...
    
    # ⭐ NOUVEAU : Récupère le hotelId depuis l'étape
    trip = firebase.get_trip(user_id, trip_id)
    hotel_id = None
    if trip and trip.get('days'):
        for day in trip['days']:
            if day.get('id') == day_id:
                hotel_id = day.get('hotelId')
                break
    
    # Enregistre dans Firestore
    media_data = {
        'type': 'hotel',
        'fileName': file_name,
        'storagePath': storage_path,
        'downloadURL': download_url,
        'hotelName': hotel_name,
        'hotelId': hotel_id,  # ⭐ AJOUTÉ
        'linkedDayId': day_id,
        'fileSize': len(response.content),
        'source': 'google_places',
        'uploadedAt': firebase.get_server_timestamp()
    }
```

**Dans la fonction `fetch_google_photos_for_hotel()`** :
```python
# Ligne ~1250 environ
@bp.route('/api/trips/<trip_id>/days/<day_id>/fetch-google-photos', methods=['POST'])
def fetch_google_photos_for_hotel(trip_id, day_id):
    # ... code existant ...
    
    # ⭐ NOUVEAU : Récupère le hotelId depuis l'étape
    trip = firebase.get_trip(user_id, trip_id)
    hotel_id = None
    if trip and trip.get('days'):
        for day in trip['days']:
            if day.get('id') == day_id:
                hotel_id = day.get('hotelId')
                break
    
    # Dans la boucle de téléchargement des photos
    for idx, photo in enumerate(photos_to_download):
        # ... téléchargement ...
        
        media_data = {
            'type': 'hotel',
            'fileName': file_name,
            'storagePath': storage_path,
            'downloadURL': download_url,
            'hotelName': hotel_name,
            'hotelId': hotel_id,  # ⭐ AJOUTÉ
            'linkedDayId': day_id,
            'fileSize': len(photo_response.content),
            'source': 'google_places_auto',
            'uploadedAt': firebase.get_server_timestamp()
        }
```

#### 2. Modifier la recherche de photos (app/services/firebase_service.py)

**Ajouter une méthode pour récupérer les photos par hotelId** :
```python
def get_hotel_photos_by_id(self, user_id: str, hotel_id: str) -> List[Dict]:
    """Récupère toutes les photos d'un hôtel par son ID"""
    try:
        media_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media')
        media = media_ref.where('type', '==', 'hotel').where('hotelId', '==', hotel_id).stream()
        
        result = []
        for medium in media:
            media_data = medium.to_dict()
            media_data['id'] = medium.id
            result.append(media_data)
        
        return result
    except Exception as e:
        print(f"Erreur récupération photos par hotelId: {e}")
        return []
```

#### 3. Afficher les photos sur la page hôtel (app/templates/admin/hotels.html)

Dans la modale de détails d'un hôtel, ajouter une section photos :
```html
<!-- Dans le modal de détails -->
<div class="modal-body">
    <!-- Infos existantes... -->
    
    <!-- ⭐ NOUVELLE SECTION -->
    <h6 class="mt-4">Photos de l'hôtel</h6>
    <div id="hotel-photos-gallery" class="row">
        <!-- Galerie de photos chargée dynamiquement -->
    </div>
</div>
```

JavaScript pour charger les photos :
```javascript
async function showHotelDetails(hotelId) {
    // ... code existant ...
    
    // ⭐ NOUVEAU : Charge les photos
    const photosResponse = await fetch(`/admin/api/hotels/${hotelId}/photos`);
    const photosData = await photosResponse.json();
    
    const gallery = document.getElementById('hotel-photos-gallery');
    gallery.innerHTML = '';
    
    if (photosData.photos && photosData.photos.length > 0) {
        photosData.photos.forEach(photo => {
            const col = document.createElement('div');
            col.className = 'col-md-4 mb-3';
            col.innerHTML = `
                <img src="${photo.downloadURL}" 
                     class="img-fluid rounded" 
                     alt="Photo de l'hôtel">
            `;
            gallery.appendChild(col);
        });
    } else {
        gallery.innerHTML = '<p class="text-muted">Aucune photo disponible</p>';
    }
}
```

#### 4. Ajouter la route API pour les photos (app/routes/admin.py)

```python
@bp.route('/api/hotels/<hotel_id>/photos', methods=['GET'])
@login_required
def api_get_hotel_photos(hotel_id):
    """API: Récupère les photos d'un hôtel"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        photos = firebase.get_hotel_photos_by_id(user_id, hotel_id)
        return jsonify({'success': True, 'photos': photos})
    except Exception as e:
        current_app.logger.error(f"Erreur récupération photos hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500
```

---

## 📊 Résumé des fichiers modifiés

### Phase 3 (✅ Terminé)
- ✅ `app/routes/bookings.py` - 3 nouvelles routes reviews
- ✅ `app/templates/bookings/hotels_review.html` - Interface d'évaluation
- ✅ `app/templates/bookings/detail.html` - Lien "Évaluer les hôtels"

### Phase 4 (⚠️ À compléter)
- ⚠️ `app/routes/admin.py` - Ajouter hotelId dans upload photos (2 fonctions)
- ⚠️ `app/services/firebase_service.py` - Méthode get_hotel_photos_by_id()
- ⚠️ `app/routes/admin.py` - Route GET /api/hotels/<hotel_id>/photos
- ⚠️ `app/templates/admin/hotels.html` - Section galerie photos
- ⚠️ `app/static/js/hotels.js` - Chargement photos dans modal

---

## 🎯 Prochaines étapes

1. **Compléter Phase 4** :
   - Modifier les 2 fonctions d'upload de photos
   - Ajouter la méthode Firebase pour récupérer photos par hotelId
   - Créer la route API pour les photos
   - Ajouter la galerie dans le modal détails hôtel

2. **Tests** :
   - Tester l'ajout d'un avis client
   - Vérifier le recalcul des moyennes
   - Tester la modification/suppression d'avis
   - Vérifier que hotelId est bien enregistré dans les photos
   - Tester l'affichage de la galerie

3. **Bonus (optionnel)** :
   - Ajouter les stats d'utilisation des hôtels
   - Afficher le nombre de reviews sur la page admin hôtels
   - Export des reviews en CSV
   - Système de modération des avis

---

## 🐛 Points d'attention

### Erreurs JavaScript dans hotels_review.html
Les erreurs VSCode sur la ligne 96 sont dues aux templates Jinja2 dans le JavaScript.  
**Solution** : Ignorer ces erreurs ou extraire le JS dans un fichier séparé.

### Rétrocompatibilité
Les anciennes photos sans `hotelId` continueront de fonctionner car on garde `linkedDayId`.

### Performance
Si beaucoup de photos, envisager :
- Pagination de la galerie
- Lazy loading des images
- Thumbnails au lieu de full-size

---

## 📞 Support

Pour toute question sur l'implémentation :
1. Consulter `HOTEL_INTEGRATION_GUIDE.md` pour la Phase 1-2
2. Consulter ce fichier pour les Phases 3-4
3. Vérifier les logs console (F12) pour le debugging
4. Tester les routes API avec Postman/curl

**Date de création** : 15/11/2025  
**Status** : Phase 3 terminée ✅ | Phase 4 en cours ⚠️
