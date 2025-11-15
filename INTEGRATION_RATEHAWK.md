# 🏍️ Intégration API RateHawk - MotoTrip Planner
# Documentation et suivi du projet

## 📊 Vue d'ensemble du projet

### Contexte
Application interne **OldiBike** pour planification de voyages à moto avec gestion automatique des hébergements.

### Objectifs
- 🎯 Automatiser la recherche d'hôtels avec critères spécifiques moto
- ⏱️ Réduire le temps de planification de **3h à 30min** par voyage
- 📸 Améliorer la présentation client avec galerie photos professionnelle
- 💰 Optimiser les marges avec calcul automatique des prix

### Contact RateHawk
- **Responsable**: Maria
- **Email support**: apisupport@ratehawk.com
- **Statut**: Phase d'intégration (Sandbox)

---

## 🔑 Informations API RateHawk

### Credentials Sandbox
```
API Key ID (Username): 67
API Access Token (Password): b463e099-2d2a-4915-84ee-7b82ca66d2dd
Base URL: https://api-sandbox.worldota.net
Authentification: HTTP Basic Auth
```

### Hotel de test
- **HID**: `8473727`
- **ID**: `test_hotel_do_not_book`
- ⚠️ **Important**: Les réservations sur cet hôtel sont réelles avec responsabilités financières !

### Documentation officielle
- 📖 [Sandbox Integration Guide](https://docs.emergingtravel.com/docs/sandbox/sandbox-integration-guide/)
- 📖 [Best Practices](https://docs.emergingtravel.com/docs/sandbox/sandbox-best-practices-for-apiv3/)
- 📖 [API Authorization](https://docs.emergingtravel.com/docs/fundamentals/authorization/)
- 📋 [Pre-Certification Checklist](https://docs.google.com/document/d/1TWCBnOQ1GygM-5R8wHJG4kLvf_READL8cUoCi3tWsrE/edit?usp=sharing)

---

## 🏍️ Critères obligatoires pour les voyages moto

### Critères automatiques
✅ **Parking sécurisé** : Privé uniquement (pas de parking public dans la rue)  
✅ **Petit-déjeuner inclus** : Obligatoire pour départ matinal  
✅ **Note minimum** : 8.0/10 pour garantir la qualité  

### Workflow de vérification parking
1. API RateHawk indique "parking disponible"
2. Vérification manuelle sur Google Maps (type de parking)
3. Validation dans base de données interne (badge "Validé OldiBike")

---

## 🎯 Roadmap d'implémentation

### ✅ Phase 0 - Planification (COMPLÉTÉ)
- [x] Analyse des besoins OldiBike
- [x] Étude de la documentation RateHawk
- [x] Architecture technique définie
- [x] Création fichiers de contexte

### 📦 Sprint 1 - Fondations (Semaine 1)
**Objectif**: Base technique solide avec test de connexion

- [ ] Configuration credentials dans `.env`
- [ ] Création du service `app/services/ratehawk_service.py`
- [ ] Implémentation authentification HTTP Basic Auth
- [ ] Endpoint de test de connexion
- [ ] Premier appel API validé (test avec hotel de test)
- [ ] Gestion des erreurs de base

**Livrables**:
- Service fonctionnel avec authentification
- Test de connexion réussi
- Documentation des endpoints utilisés

---

### 🔍 Sprint 2 - Recherche intelligente (Semaine 2)
**Objectif**: Recherche d'hôtels avec filtres moto automatiques

- [ ] Endpoint `/api/hotels/search` (backend)
- [ ] Implémentation recherche par ville/région
- [ ] Filtrage automatique par note >= 8.0
- [ ] Détection parking dans amenities
- [ ] Vérification petit-déjeuner inclus
- [ ] Interface de recherche dans dashboard admin
- [ ] Affichage résultats avec badges visuels
- [ ] Bouton "Ajouter au voyage"

**Livrables**:
- Recherche fonctionnelle avec critères moto
- Interface utilisateur intuitive
- Tests avec villes réelles

---

### 🗺️ Sprint 3 - Automatisation GPX (Semaine 3)
**Objectif**: Analyse automatique d'itinéraire

- [ ] Upload de fichiers GPX
- [ ] Parsing et extraction des waypoints
- [ ] Géolocalisation des points d'étape
- [ ] Recherche automatique multi-étapes
- [ ] Détection étapes sans hôtels disponibles
- [ ] Suggestions d'alternatives (villes proches)
- [ ] Interface de validation/ajustement

**Livrables**:
- Parser GPX fonctionnel
- Recherche automatique sur itinéraire complet
- Suggestions intelligentes

---

### 📸 Sprint 4 - Galerie Photos & Publication (Semaine 4)
**Objectif**: Photos professionnelles et export enrichi

- [ ] Récupération photos haute qualité via API
- [ ] Modale de sélection avant publication
- [ ] Interface galerie par hôtel (checkboxes)
- [ ] Prévisualisation des photos sélectionnées
- [ ] Export voyage avec photos choisies
- [ ] Calcul automatique des prix avec marge
- [ ] Intégration au workflow de publication existant

**Livrables**:
- Galerie de sélection photos
- Export professionnel avec visuels
- Calcul marge automatique

---

### ⭐ Sprint 5 - Base d'hôtels validés (Optionnel)
**Objectif**: Base de données d'hôtels moto-friendly certifiés

- [ ] Modèle `VerifiedHotel` dans base de données
- [ ] Interface de validation parking
- [ ] Intégration Google Maps (ouverture automatique)
- [ ] Badge "Validé OldiBike" dans résultats
- [ ] Notes et feedback par hôtel
- [ ] Historique des validations
- [ ] Export liste hôtels validés

**Livrables**:
- Base de données enrichie
- Workflow de validation
- Badges dans interface

---

## 🏗️ Architecture technique

### Structure des nouveaux fichiers

```
app/
├── services/
│   └── ratehawk_service.py              # Service principal API RateHawk
│
├── routes/
│   └── hotels.py                        # Routes pour gestion hôtels
│
├── models/
│   └── verified_hotel.py                # Modèle hôtels validés
│
├── templates/
│   └── admin/
│       ├── hotel_search.html            # Interface recherche
│       ├── hotel_results.html           # Affichage résultats
│       └── photo_selector_modal.html    # Galerie photos
│
└── static/
    └── js/
        └── hotel_search.js              # Interactions frontend
```

### Endpoints API à créer

#### Backend Flask
```python
# app/routes/hotels.py

GET  /api/hotels/test-connection          # Test connexion API
POST /api/hotels/search                   # Recherche avec filtres moto
GET  /api/hotels/<hotel_id>               # Détails d'un hôtel
GET  /api/hotels/<hotel_id>/photos        # Photos d'un hôtel
POST /api/hotels/<hotel_id>/verify        # Marquer parking comme vérifié
POST /api/hotels/analyze-gpx              # Analyser itinéraire GPX
GET  /api/hotels/verified                 # Liste hôtels validés OldiBike
```

### Endpoints RateHawk à utiliser

#### Obligatoires (Certification required)
1. **Search by Region**: `/api/b2b/v3/search/serp/region/`
   - Recherche tous les hôtels dans une région
   - Filtre par dates, nombre de chambres

2. **Retrieve Hotelpage**: `/api/b2b/v3/search/hp/` ✅ REQUIS
   - Détails complets d'un hôtel
   - Tous les tarifs disponibles
   - Cache: 1 heure max

3. **Prebook**: `/api/b2b/v3/hotel/prebook/` ✅ REQUIS
   - Vérification disponibilité avant réservation
   - Gestion price_increase_percent
   - Recherche de tarifs alternatifs

#### Optionnels (Recommandés)
4. **Hotel Content**: `/api/b2b/v3/hotel/info/`
   - Contenu statique (photos, description)
   - Pour hôtels non présents dans dump

5. **Hotel Dump**: `/api/b2b/v3/hotel/info/dump/`
   - Téléchargement hebdomadaire
   - Base de données locale des hôtels

---

## 📝 Workflow utilisateur

### ❌ Workflow ACTUEL (manuel)
```
1. ✏️ Créer itinéraire dans Kurviger              [30 min]
2. 🔍 Rechercher hôtels manuellement par ville    [2h]
   - Ouvrir RateHawk
   - Filtrer par critères
   - Vérifier chaque parking sur Google Maps
3. 📋 Copier-coller infos dans MotoTrip Planner   [15 min]
4. 💰 Calculer les marges manuellement            [15 min]
5. 📸 Télécharger photos si nécessaire            [Variable]

⏱️ TEMPS TOTAL: ~3 heures par voyage
```

### ✅ Workflow FUTUR (automatisé)
```
1. ✏️ Créer itinéraire dans Kurviger              [30 min]
2. 📤 Uploader GPX dans MotoTrip Planner          [1 min]
3. 🤖 Système recherche automatiquement           [automatique]
   ✅ Critères moto appliqués
   ✅ Filtrage par note/parking/petit-déj
4. 👀 Valider ou ajuster les suggestions          [5-10 min]
5. 📸 Sélectionner photos pour publication        [5 min]
6. 💰 Marges calculées automatiquement            [automatique]

⏱️ TEMPS TOTAL: ~30-40 minutes par voyage

🎯 GAIN: 2h20 par voyage (80% de réduction)
```

---

## 🔧 Points techniques importants

### Authentification HTTP Basic Auth
```python
import requests
from requests.auth import HTTPBasicAuth

# Configuration
API_KEY_ID = "67"
API_KEY_TOKEN = "b463e099-2d2a-4915-84ee-7b82ca66d2dd"
BASE_URL = "https://api-sandbox.worldota.net"

# Authentification
auth = HTTPBasicAuth(API_KEY_ID, API_KEY_TOKEN)
response = requests.get(f"{BASE_URL}/api/b2b/v3/...", auth=auth)
```

### Gestion des filtres moto

#### 1. Note minimum (8.0/10)
```python
# Filtrage côté client après récupération
hotels = [h for h in results if h.get('rating', 0) >= 8.0]
```

#### 2. Parking sécurisé
```python
# Analyser le champ "amenities" ou "facilities"
has_parking = 'parking' in hotel.get('amenities', [])
parking_type = hotel.get('parking_type', 'unknown')  # private/public

# Badge conditionnel
if parking_type == 'private':
    badge = "✅ Parking privé"
else:
    badge = "⚠️ Parking à vérifier"
```

#### 3. Petit-déjeuner inclus
```python
# Vérifier dans les détails du tarif
has_breakfast = rate.get('meal') in ['breakfast', 'breakfast_buffet']
```

### Rate Limiting
```python
# Headers de réponse à surveiller
X-RateLimit-SecondsNumber: 1         # Période en secondes
X-RateLimit-RequestsNumber: 10       # Max requêtes par période
X-RateLimit-Remaining: 9             # Requêtes restantes
X-RateLimit-Reset: "2025-01-14T08:54:11"  # Expiration
```

**Stratégie**: Implémenter un cache local pour éviter les requêtes répétées.

### Timeouts recommandés
```python
TIMEOUT_SEARCH = 30      # Recherche d'hôtels
TIMEOUT_HOTEL_PAGE = 20  # Page hôtel détaillée
TIMEOUT_PREBOOK = 60     # Pré-réservation
TIMEOUT_BOOKING = 120    # Réservation finale
```

---

## 💾 Modèles de données

### Extension du modèle Trip existant
```python
# Nouveau champ dans la structure trip
hotel_data = {
    'ratehawk_id': 'hotel_12345',           # ID RateHawk
    'city': 'Annecy',
    'hotel_name': 'Hôtel Le Chamois',
    'rating': 8.9,
    'stars': 3,
    'has_parking': True,
    'parking_type': 'private_secured',      # private_secured, private_open, public
    'parking_verified': False,               # Validation manuelle OldiBike
    'has_breakfast': True,
    'photos_urls': ['url1', 'url2', 'url3'],
    'selected_photos': ['url1', 'url3'],    # Photos choisies pour publication
    'price_double': 85.00,
    'price_solo': 110.00,
    'your_margin_percent': 15,
    'your_margin_euro': 12.75,
    'price_double_with_margin': 97.75,
    'price_solo_with_margin': 122.75,
    'ratehawk_booking_url': 'https://...',
    'address': '123 Rue du Lac, Annecy',
    'latitude': 45.8992,
    'longitude': 6.1294
}
```

### Nouveau modèle VerifiedHotel
```python
# app/models/verified_hotel.py
class VerifiedHotel(db.Model):
    """Hôtels moto-friendly validés manuellement par OldiBike"""
    __tablename__ = 'verified_hotels'
    
    id = db.Column(db.Integer, primary_key=True)
    ratehawk_id = db.Column(db.String(100), unique=True, nullable=False)
    hotel_name = db.Column(db.String(200), nullable=False)
    city = db.Column(db.String(100), nullable=False)
    
    # Parking
    parking_type = db.Column(db.String(50))  # 'private_secured', 'private_open', 'public'
    parking_verified = db.Column(db.Boolean, default=False)
    parking_notes = db.Column(db.Text)  # "Box fermé, 10 places, accès code"
    google_maps_url = db.Column(db.String(500))
    
    # Validation
    verified_by = db.Column(db.String(100))  # Nom de l'utilisateur
    verified_date = db.Column(db.DateTime)
    
    # Feedback
    internal_rating = db.Column(db.Float)  # Note interne OldiBike
    client_feedback = db.Column(db.Text)  # Retours clients
    last_used_date = db.Column(db.DateTime)  # Dernière utilisation
    use_count = db.Column(db.Integer, default=0)  # Nb fois utilisé
    
    # Recommandations
    recommended = db.Column(db.Boolean, default=True)
    reason_not_recommended = db.Column(db.Text)
```

---

## 📊 Suivi de progression

### Sprint actuel: **Sprint 1 - Fondations**
**Début**: 14/01/2025  
**Fin prévue**: 21/01/2025  
**Statut**: 🟡 En cours

#### Tâches complétées
- [x] Analyse des besoins
- [x] Planification complète
- [x] Création fichier de contexte

#### Tâches en cours
- [ ] Configuration credentials `.env`
- [ ] Création service RateHawk

#### Problèmes rencontrés
_Aucun pour l'instant_

#### Notes importantes
_À compléter au fur et à mesure de l'avancement_

---

## 🧪 Plan de tests

### Phase Sandbox (tests obligatoires)
- [ ] ✅ Connexion API validée
- [ ] ✅ Recherche par région fonctionnelle
- [ ] ✅ Filtres moto appliqués correctement
- [ ] ✅ Photos haute qualité récupérées
- [ ] ✅ Prix cohérents avec site RateHawk
- [ ] ✅ Gestion d'erreurs robuste
- [ ] ✅ Rate limiting respecté

### Tests avec hotel de test
- [ ] Recherche du test_hotel_do_not_book
- [ ] Récupération page hôtel
- [ ] Pré-réservation (sans aller jusqu'au booking !)
- [ ] Vérification des données

### Avant passage en production
- [ ] 📋 Remplir Pre-certification Checklist complet
- [ ] 📧 Envoyer checklist à Maria (apisupport@ratehawk.com)
- [ ] ✅ Validation par équipe RateHawk
- [ ] 🔑 Réception clés API Production
- [ ] 🚀 Migration vers production

---

## 📈 Métriques de succès

### Objectifs chiffrés
| Métrique | Avant | Objectif | Mesure |
|----------|-------|----------|--------|
| Temps de planification | 3h | 30min | ⏱️ Chronomètre |
| Taux de filtrage auto | 0% | >90% | 📊 Nb hôtels filtrés auto |
| Photos automatiques | 0% | 100% | 📸 Tous les hôtels |
| Calcul marge auto | 0% | 100% | 💰 Tous les prix |
| Vérifications parking | 100% manuel | 50% auto | 🅿️ Badge validé |

### ROI estimé
```
10 voyages/an × 2.5h gagnées = 25 heures/an
25h × taux horaire = Économie directe

+ Bénéfices indirects:
  - Moins d'erreurs de réservation
  - Présentation client plus professionnelle
  - Optimisation des marges
  - Base de données d'hôtels qualifiés
```

---

## 🚨 Risques et mitigations

### Risque 1: API Rate Limiting
**Impact**: Recherches bloquées  
**Probabilité**: Moyenne  
**Mitigation**: 
- Implémenter cache local
- Afficher warning si proche de la limite
- Queue de requêtes si nécessaire

### Risque 2: Filtres pas assez précis
**Impact**: Hôtels non adaptés aux motos  
**Probabilité**: Faible  
**Mitigation**:
- Tests approfondis en phase Sandbox
- Base de données de vérification manuelle
- Feedback utilisateur intégré

### Risque 3: Parsing GPX complexe
**Impact**: Étapes mal détectées  
**Probabilité**: Moyenne  
**Mitigation**:
- Tests avec vrais fichiers Kurviger
- Interface de correction manuelle
- Documentation utilisateur claire

---

## 🔄 Changelog

### [Version 0.1.0] - 14/01/2025
- 📝 Création du fichier de contexte
- 🎯 Planification complète du projet
- 📋 Roadmap définie sur 5 sprints
- 🏗️ Architecture technique documentée

---

## 📞 Support et questions

### Questions fréquentes

**Q: Puis-je tester avec de vrais hôtels ?**  
R: Oui, mais uniquement avec `test_hotel_do_not_book` en Sandbox. Les réservations sont réelles !

**Q: Quand puis-je passer en production ?**  
R: Après certification complète (Pre-certification Checklist + validation RateHawk)

**Q: Les prix sont-ils en temps réel ?**  
R: Oui, via l'endpoint Hotelpage (cache max 1h recommandé)

**Q: Puis-je faire des réservations réelles ?**  
R: En Sandbox: NON (sauf test_hotel). En Production: OUI après certification.

### Contact
- 💬 Support RateHawk: apisupport@ratehawk.com
- 👤 Contact: Maria
- 📧 Réponse sous: 24-48h ouvrées

---

**Dernière mise à jour**: 14/01/2025 10:06  
**Maintenu par**: Cline AI + Équipe OldiBike  
**Version**: 0.1.0
