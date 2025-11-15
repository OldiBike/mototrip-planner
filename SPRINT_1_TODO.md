# 📦 Sprint 1 - Fondations RateHawk API
**Durée estimée**: 1 semaine  
**Début**: 14/01/2025  
**Statut**: 🟡 En cours

---

## 🎯 Objectif du Sprint

Créer une base technique solide avec authentification RateHawk et validation de la connexion API.

**Critère de succès**: Appel API réussi avec récupération des données du test hotel.

---

## ✅ Checklist des tâches

### 1. Configuration de l'environnement
- [ ] **Ajouter credentials RateHawk dans `.env`**
  - `RATEHAWK_API_KEY_ID=67`
  - `RATEHAWK_API_KEY_TOKEN=b463e099-2d2a-4915-84ee-7b82ca66d2dd`
  - `RATEHAWK_BASE_URL=https://api-sandbox.worldota.net`
  
- [ ] **Mettre à jour `.env.example`**
  - Ajouter les variables RateHawk (sans valeurs)
  - Ajouter commentaires explicatifs

- [ ] **Mettre à jour `app/config.py`**
  - Ajouter les variables de configuration RateHawk
  - Valider que les credentials sont chargés

---

### 2. Création du service RateHawk
- [ ] **Créer `app/services/ratehawk_service.py`**
  - Classe `RateHawkService`
  - Méthode `__init__()` avec configuration
  - Méthode `_get_auth()` pour HTTP Basic Auth
  - Méthode `test_connection()` pour valider l'API
  - Méthode `_make_request()` générique avec gestion d'erreurs
  - Gestion des timeouts
  - Gestion du rate limiting (headers X-RateLimit-*)

**Structure attendue**:
```python
class RateHawkService:
    def __init__(self):
        """Initialisation avec credentials depuis config"""
        
    def _get_auth(self):
        """Retourne HTTPBasicAuth object"""
        
    def _make_request(self, method, endpoint, **kwargs):
        """Méthode générique pour appels API"""
        
    def test_connection(self):
        """Test de connexion basique"""
        
    def get_hotel_info(self, hotel_id):
        """Récupérer les infos d'un hôtel (pour test)"""
```

---

### 3. Création des routes de test
- [ ] **Créer `app/routes/hotels.py`**
  - Blueprint `hotels_bp`
  - Route `GET /api/hotels/test-connection`
  - Route `GET /api/hotels/test-hotel/<hotel_id>`
  - Gestion des réponses JSON
  - Gestion des erreurs HTTP

**Endpoints à créer**:
```python
@hotels_bp.route('/test-connection', methods=['GET'])
def test_connection():
    """Test si l'API RateHawk répond"""
    
@hotels_bp.route('/test-hotel/<hotel_id>', methods=['GET'])
def test_hotel(hotel_id):
    """Récupérer les infos du test hotel"""
```

---

### 4. Enregistrement du blueprint
- [ ] **Mettre à jour `app/__init__.py`**
  - Importer le nouveau blueprint hotels
  - Enregistrer avec `app.register_blueprint(hotels_bp)`

- [ ] **Mettre à jour `app/routes/__init__.py`**
  - Ajouter import du module hotels

---

### 5. Tests et validation
- [ ] **Test 1: Connexion API**
  - Lancer l'app Flask
  - Appeler `GET /api/hotels/test-connection`
  - Vérifier réponse 200 OK
  - Vérifier que l'authentification fonctionne

- [ ] **Test 2: Récupération test hotel**
  - Appeler `GET /api/hotels/test-hotel/test_hotel_do_not_book`
  - Vérifier les données reçues
  - Valider la structure JSON

- [ ] **Test 3: Gestion d'erreurs**
  - Tester avec credentials invalides
  - Tester avec hotel_id inexistant
  - Vérifier les messages d'erreur

---

### 6. Documentation
- [ ] **Mettre à jour `INTEGRATION_RATEHAWK.md`**
  - Cocher les tâches complétées du Sprint 1
  - Ajouter les problèmes rencontrés
  - Noter les décisions techniques

- [ ] **Créer `API_ENDPOINTS.md`** (optionnel)
  - Documenter les nouveaux endpoints
  - Exemples de requêtes/réponses

---

## 📝 Notes de développement

### Endpoints RateHawk testés
- [ ] `/api/b2b/v3/hotel/info/` - Récupération info hotel
- [ ] Autre endpoint pour test de connexion ?

### Décisions techniques
_À compléter pendant le développement_

### Problèmes rencontrés
_À documenter si nécessaire_

---

## 🧪 Plan de test

### Test manuel 1: Vérifier connexion
```bash
# Démarrer l'app
python app.py

# Dans un autre terminal ou navigateur
curl http://localhost:5001/api/hotels/test-connection
```

**Résultat attendu**:
```json
{
  "status": "success",
  "message": "RateHawk API connection successful",
  "api_version": "v3",
  "environment": "sandbox"
}
```

### Test manuel 2: Récupérer test hotel
```bash
curl http://localhost:5001/api/hotels/test-hotel/test_hotel_do_not_book
```

**Résultat attendu**:
```json
{
  "status": "success",
  "hotel": {
    "id": "test_hotel_do_not_book",
    "name": "...",
    "rating": ...,
    "address": "..."
  }
}
```

---

## 🚀 Déploiement

### Checklist avant commit
- [ ] Code testé localement
- [ ] Pas de credentials en dur dans le code
- [ ] `.env` dans `.gitignore`
- [ ] Documentation à jour
- [ ] Commentaires ajoutés si nécessaire

### Commit messages suggérés
```bash
git add .
git commit -m "feat(ratehawk): Add RateHawk API service with authentication"
git commit -m "feat(ratehawk): Add test endpoints for API validation"
git commit -m "docs(ratehawk): Add Sprint 1 documentation"
```

---

## 📊 Progression

**Total tâches**: 15  
**Complétées**: 0  
**En cours**: Configuration  
**Bloquées**: Aucune  

---

## ⏭️ Prochaines étapes (Sprint 2)

Une fois le Sprint 1 terminé :
1. Implémentation de la recherche d'hôtels
2. Ajout des filtres moto (rating, parking, breakfast)
3. Interface utilisateur dans le dashboard

---

**Dernière mise à jour**: 14/01/2025 10:08  
**Responsable**: Cline AI + OldiBike Team
