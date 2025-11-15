# Guide d'Intégration : Sélecteur d'Hôtels

## ✅ Ce qui a été implémenté

### 1. Backend (100% terminé)
- ✅ 15 méthodes Firebase pour CRUD hôtels + reviews
- ✅ 12 routes API `/admin/api/hotels/*` et `/api/hotels/*/reviews`
- ✅ Structure de données complète avec validation

### 2. Frontend Admin (95% terminé)
- ✅ Page "Banque d'Hôtels" (`/admin/hotels`)
- ✅ Formulaire modifié avec dropdown + option manuelle
- ✅ Script `hotel_selector.js` chargé automatiquement
- ✅ Menu "Hôtels" dans la navigation

---

## 🔧 Intégration finale dans dashboard.js

### Étape 1 : Appeler le reset au chargement de la modale

Dans la fonction qui ouvre la modale d'ajout d'étape (probablement `openAddDayModal` ou similaire), **ajouter** :

```javascript
function openAddDayModal() {
    // ... code existant ...
    
    // ⭐ NOUVEAU : Reset le sélecteur d'hôtels
    if (window.hotelSelector) {
        window.hotelSelector.reset();
    }
    
    // ... reste du code ...
}
```

### Étape 2 : Inclure hotelId lors de la sauvegarde

Dans la fonction qui sauvegarde une étape (probablement dans le handler du formulaire `#add-day-form`), **ajouter** :

```javascript
// Exemple de fonction de sauvegarde existante
async function saveDayToFirebase(dayData) {
    // Récupère les données du formulaire
    const hotelName = document.getElementById('day-hotel-name').value;
    const priceDouble = parseFloat(document.getElementById('day-price-double').value) || 0;
    const priceSolo = parseFloat(document.getElementById('day-price-solo').value) || 0;
    // ... autres champs ...
    
    // ⭐ NOUVEAU : Ajoute le hotelId si un hôtel de la banque a été sélectionné
    const selectedHotelId = window.hotelSelector ? window.hotelSelector.getSelectedHotelId() : null;
    
    const dayData = {
        dayName: document.getElementById('day-name').value,
        city: document.getElementById('day-city').value,
        hotelName: hotelName,
        priceDouble: priceDouble,
        priceSolo: priceSolo,
        nights: parseInt(document.getElementById('day-nights').value) || 1,
        gpxFile: document.getElementById('day-gpx-file').value || '',
        hotelLink: document.getElementById('day-hotel-link').value || '',
        // ⭐ NOUVEAU CHAMP
        hotelId: selectedHotelId  // null si saisie manuelle, sinon ID de l'hôtel
    };
    
    // Envoi à l'API
    const response = await fetch(`/admin/api/trips/${tripId}/days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dayData)
    });
    
    // ... reste du code ...
}
```

### Étape 3 : Pré-sélection en mode édition (optionnel)

Si vous modifiez une étape existante qui a un `hotelId`, **ajouter** :

```javascript
function openEditDayModal(day) {
    // ... code existant pour remplir les champs ...
    
    // ⭐ NOUVEAU : Si l'étape a un hotelId, pré-sélectionne l'hôtel
    if (day.hotelId && window.hotelSelector) {
        window.hotelSelector.preselect(day.hotelId);
    }
    
    // ... reste du code ...
}
```

---

## 📊 Fonctionnalités du sélecteur

### API JavaScript disponible

```javascript
// Reset complet (vide le dropdown et réactive la saisie manuelle)
window.hotelSelector.reset();

// Récupère l'ID de l'hôtel sélectionné (null si saisie manuelle)
const hotelId = window.hotelSelector.getSelectedHotelId();

// Pré-sélectionne un hôtel en mode édition
window.hotelSelector.preselect('hotel-id-123');

// Recharge les hôtels depuis l'API (si nouveaux hôtels ajoutés)
await window.hotelSelector.reload();
```

### Comportement automatique

1. **Sélection d'un hôtel** :
   - Pré-remplit nom, prix double, prix solo
   - Désactive le champ "Nom de l'hôtel" (grisé)

2. **Saisie manuelle** :
   - Laisser le dropdown vide
   - Remplir manuellement le nom et les prix

3. **Changement d'avis** :
   - Changer le dropdown réinitialise les champs
   - Modifier manuellement le nom réinitialise le dropdown

---

## 🔍 Structure de données

### Étape avec hôtel de la banque
```json
{
  "dayName": "Jour 1",
  "city": "Colmar",
  "hotelName": "Hotel Le Colombier",
  "hotelId": "abc123",  // ⭐ NOUVEAU : ID de l'hôtel dans la banque
  "priceDouble": 85.00,
  "priceSolo": 120.00,
  "nights": 1,
  "gpxFile": "jour-1.gpx",
  "hotelLink": "https://ratehawk.com/..."
}
```

### Étape avec saisie manuelle
```json
{
  "dayName": "Jour 2",
  "city": "Strasbourg",
  "hotelName": "Mon Hôtel Custom",
  "hotelId": null,  // ⭐ null = saisie manuelle
  "priceDouble": 90.00,
  "priceSolo": 130.00,
  "nights": 1,
  "gpxFile": "",
  "hotelLink": ""
}
```

---

## 📈 Futures améliorations possibles

### Phase 3 : Interface Client (À faire)
- Interface d'évaluation des hôtels (5 étoiles + commentaire)
- Affichage des notes moyennes dans l'espace client
- Système de gestion des avis

### Phase 4 : Intégration Photos (À faire)
- Lier les photos aux hôtels (pas aux étapes)
- Adapter le téléchargement Google Places pour nouveaux hôtels
- Galerie photos par hôtel dans la page détails

### Stats d'utilisation (Bonus)
Actuellement, la banque d'hôtels a un champ `usageStats.usedCount`.

**Pour le mettre à jour automatiquement** :
```python
# Dans firebase_service.py, méthode create_day
def create_day(self, user_id, trip_id, day_data):
    # ... code existant ...
    
    # ⭐ Si hotelId présent, incrémenter les stats
    if day_data.get('hotelId'):
        self.increment_hotel_usage(user_id, day_data['hotelId'])
    
    return day_id

# Dans firebase_service.py, méthode delete_day
def delete_day(self, user_id, trip_id, day_id):
    # Récupère l'étape avant suppression
    day = self.get_day(user_id, trip_id, day_id)
    
    # ... suppression ...
    
    # ⭐ Si hotelId présent, décrémenter les stats
    if day and day.get('hotelId'):
        self.decrement_hotel_usage(user_id, day['hotelId'])
```

---

## ✅ Checklist de vérification

- [x] Backend : Routes API hôtels fonctionnelles
- [x] Frontend : Page "Banque d'Hôtels" accessible
- [x] Frontend : Formulaire avec dropdown
- [x] Frontend : Script hotel_selector.js chargé
- [x] Frontend : Menu "Hôtels" dans la navigation
- [x] **TERMINÉ** : Modifier sauvegarde étape (ajouter hotelId)
- [x] **TERMINÉ** : Intégration reset du sélecteur dans openAddDayModal
- [x] **TERMINÉ** : Intégration hotelId dans saveDayForm
- [x] **TERMINÉ** : Fonction openEditDayModal avec pré-sélection d'hôtel
- [ ] **OPTIONNEL** : Implémenter mise à jour stats d'utilisation (bonus)

---

## 🚀 Pour tester

1. Aller sur `/admin/hotels` et ajouter un hôtel
2. Créer ou modifier un voyage
3. Ajouter une étape
4. Sélectionner un hôtel dans le dropdown
5. Vérifier que les prix sont pré-remplis
6. Sauvegarder et vérifier que `hotelId` est bien enregistré

---

## 📞 Support

En cas de problème :
1. Ouvrir la console développeur (F12)
2. Chercher les messages `🏨` du hotel_selector
3. Vérifier que l'API `/admin/api/hotels` répond correctement
4. S'assurer que `window.hotelSelector` est défini

Bon développement ! 🎉
