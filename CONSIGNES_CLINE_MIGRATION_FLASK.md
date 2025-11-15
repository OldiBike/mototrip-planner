# 🚀 CONSIGNES CLINE - Migration vers Flask/Railway

## 📋 Contexte du Projet

Tu vas transformer une application web HTML/JavaScript/Firebase (MotoTrip Planner) en une application Flask déployée sur Railway, tout en conservant l'interface actuelle et en ajoutant un système de publication de voyages pour les clients.

**Utilisateur unique** : L'app est pour un usage personnel (pas d'authentification complexe nécessaire).

---

## 🎯 Objectif Final

Créer une application Flask qui :
1. **Conserve** toutes les fonctionnalités actuelles de gestion de voyages
2. **Ajoute** un système de publication de voyages vers des pages client uniques
3. **Remplace** le système Wix CRM par un système maison pour les pages client
4. **Déploie** sur Railway avec PostgreSQL et intégration Stripe

---

## 📁 Architecture Cible

```
mototrip-planner/
├── app/
│   ├── __init__.py                 # Initialisation Flask
│   ├── config.py                   # Configuration (Firebase, Stripe, DB)
│   │
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── admin.py               # Routes admin (gestion voyages)
│   │   ├── client.py              # Routes pages client publiques
│   │   └── api.py                 # API (webhooks, verify code, etc.)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── firebase_service.py    # Interactions Firestore/Storage
│   │   ├── stripe_service.py      # Payment Links, webhooks
│   │   └── auth_service.py        # Auth simple pour l'admin
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   └── models.py              # Modèles SQLAlchemy si besoin
│   │
│   ├── templates/
│   │   ├── base.html              # Layout commun
│   │   │
│   │   ├── admin/
│   │   │   ├── login.html
│   │   │   ├── dashboard.html     # Interface de gestion (actuelle)
│   │   │   └── publish_modal.html
│   │   │
│   │   └── client/
│   │       ├── voyage_login.html  # Formulaire code 5 chiffres
│   │       ├── voyage_preview.html # Avant paiement (aperçu)
│   │       └── voyage_full.html   # Après paiement (tout débloqué)
│   │
│   ├── static/
│   │   ├── css/
│   │   │   └── styles.css        # TailwindCSS build
│   │   ├── js/
│   │   │   └── admin.js          # JS pour l'interface admin
│   │   └── images/
│   │
│   └── utils/
│       ├── __init__.py
│       └── helpers.py            # Fonctions utilitaires
│
├── migrations/                    # Flask-Migrate
├── requirements.txt
├── .env                          # Variables d'environnement
├── .gitignore
├── Procfile                      # Pour Railway
└── README.md
```

---

## 🔧 Stack Technique

### Backend
- **Flask** (Python 3.11+)
- **Flask-SQLAlchemy** (si besoin de DB relationnelle pour logs)
- **Flask-Migrate** (migrations DB)
- **Firebase Admin SDK** (Firestore + Storage)
- **Stripe Python SDK**
- **python-dotenv** (gestion .env)

### Frontend
- **Jinja2** (templates)
- **TailwindCSS** (via CDN pour l'instant)
- **Font Awesome** (icônes)
- **JavaScript Vanilla** (pour interactivité admin)

### Base de données
- **Firestore** (principale - voyages, étapes, médias)
- **PostgreSQL** (optionnel - logs, published trips, codes d'accès)

### Déploiement
- **Railway** (hosting)
- **PostgreSQL Railway addon** (si DB relationnelle nécessaire)

---

## 📝 Étapes de Migration (Par Ordre)

### ÉTAPE 1 : Setup Projet Flask

**Objectif** : Créer la structure de base du projet Flask

**Actions** :
1. Créer la structure de dossiers complète
2. Initialiser le projet Flask dans `app/__init__.py`
3. Créer `requirements.txt` avec toutes les dépendances :
   ```
   Flask==3.0.0
   Flask-SQLAlchemy==3.1.1
   Flask-Migrate==4.0.5
   python-dotenv==1.0.0
   firebase-admin==6.3.0
   stripe==7.7.0
   gunicorn==21.2.0
   psycopg2-binary==2.9.9
   ```
4. Créer `.env.example` avec les variables nécessaires :
   ```
   FLASK_SECRET_KEY=your-secret-key
   FIREBASE_CREDENTIALS_PATH=path/to/serviceAccountKey.json
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   DATABASE_URL=postgresql://...
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD_HASH=...
   ```
5. Créer `.gitignore` adapté

**Validation** : `flask run` démarre sans erreur

---

### ÉTAPE 2 : Configuration Firebase

**Objectif** : Connecter Flask à Firebase (Firestore + Storage)

**Actions** :
1. Créer `app/config.py` avec configuration Firebase :
   ```python
   import os
   from firebase_admin import credentials, initialize_app
   
   class Config:
       SECRET_KEY = os.getenv('FLASK_SECRET_KEY')
       FIREBASE_CREDENTIALS = credentials.Certificate(
           os.getenv('FIREBASE_CREDENTIALS_PATH')
       )
       # ... autres configs
   ```

2. Créer `app/services/firebase_service.py` :
   ```python
   from firebase_admin import firestore, storage
   
   class FirebaseService:
       def __init__(self):
           self.db = firestore.client()
           self.bucket = storage.bucket()
       
       def get_trips(self, user_id):
           # Récupérer les voyages depuis Firestore
           pass
       
       def get_days(self, user_id, trip_id):
           # Récupérer les étapes d'un voyage
           pass
       
       # ... autres méthodes
   ```

3. Initialiser Firebase dans `app/__init__.py`

**Validation** : Connexion à Firestore réussie, lecture de données OK

---

### ÉTAPE 3 : Migration Interface Admin (Dashboard)

**Objectif** : Recréer l'interface actuelle en templates Jinja2

**Actions** :
1. Créer `templates/base.html` :
   - Header avec logo OldiBike
   - TailwindCSS via CDN
   - Font Awesome
   - Block pour le contenu

2. Créer `templates/admin/dashboard.html` :
   - **Copier** la structure HTML de `index.html` actuel
   - **Remplacer** les appels Firebase par des appels API Flask
   - **Transformer** les sections en templates Jinja2 :
     ```jinja2
     {% extends "base.html" %}
     {% block content %}
     <!-- Grille principale -->
     <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
         <!-- Colonne 1: Voyages -->
         <div>
             {% for trip in trips %}
             <div class="trip-card" data-id="{{ trip.id }}">
                 {{ trip.name }}
             </div>
             {% endfor %}
         </div>
         
         <!-- Colonne 2: Détails -->
         <div>
             {% if selected_trip %}
             <!-- Calculateur de coût -->
             <!-- Liste des étapes -->
             {% for day in days %}
             <!-- ... -->
             {% endfor %}
             {% endif %}
         </div>
     </div>
     {% endblock %}
     ```

3. Créer `static/js/admin.js` :
   - **Copier** tout le JavaScript de `index.html`
   - **Adapter** les fonctions pour utiliser les routes Flask au lieu de Firebase direct
   - Exemple :
     ```javascript
     // Avant (Firebase)
     await addDoc(collection(db, path), data);
     
     // Après (Flask API)
     await fetch('/api/trips', {
         method: 'POST',
         body: JSON.stringify(data)
     });
     ```

4. Créer `app/routes/admin.py` :
   ```python
   from flask import Blueprint, render_template, session
   
   admin_bp = Blueprint('admin', __name__)
   
   @admin_bp.route('/dashboard')
   def dashboard():
       # Vérifier auth
       # Charger les voyages depuis Firestore
       trips = firebase_service.get_trips(user_id)
       return render_template('admin/dashboard.html', trips=trips)
   ```

**Validation** : Interface admin identique à l'actuelle, toutes les fonctionnalités marchent

---

### ÉTAPE 4 : Système de Publication de Voyages

**Objectif** : Ajouter un bouton "Publier pour un client" qui génère une page unique

**Actions** :
1. **Modifier** `templates/admin/dashboard.html` :
   - Ajouter un bouton "Publier pour un client" dans l'interface voyage
   ```html
   <button id="publish-trip-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md">
       <i class="fas fa-paper-plane mr-2"></i>Publier pour un client
   </button>
   ```

2. **Créer** `templates/admin/publish_modal.html` :
   ```html
   <div id="publish-modal" class="modal hidden">
       <div class="modal-content">
           <h3>Publier le voyage pour un client</h3>
           <form id="publish-form">
               <input type="text" name="client_name" placeholder="Nom du client" required>
               <input type="email" name="client_email" placeholder="Email (optionnel)">
               <input type="number" name="price_per_person" placeholder="Prix de vente par personne" required>
               <button type="submit">Générer la page client</button>
           </form>
       </div>
   </div>
   ```

3. **Créer** la route de publication dans `app/routes/api.py` :
   ```python
   @api_bp.route('/api/publish-trip', methods=['POST'])
   def publish_trip():
       # 1. Récupérer les données du formulaire
       trip_id = request.json['trip_id']
       client_name = request.json['client_name']
       price_pp = request.json['price_per_person']
       
       # 2. Générer un slug unique
       slug = generate_slug(client_name, trip_name)  # ex: jean-dupont-alpes-2025
       
       # 3. Générer un code d'accès à 5 chiffres
       access_code = generate_code(5)
       
       # 4. Créer un Payment Link Stripe
       stripe_link = stripe_service.create_payment_link(
           trip_id=trip_id,
           amount=price_pp * 2,  # Prix total double
           metadata={'slug': slug}
       )
       
       # 5. Sauvegarder dans Firestore (ou PostgreSQL)
       firebase_service.create_published_trip({
           'slug': slug,
           'access_code': access_code,
           'trip_id': trip_id,
           'client_name': client_name,
           'price_per_person': price_pp,
           'stripe_payment_link': stripe_link.url,
           'payment_status': 'pending',
           'created_at': datetime.now()
       })
       
       # 6. Retourner les infos à afficher dans la modale
       return jsonify({
           'url': f'https://oldibike.be/voyageperso/{slug}',
           'access_code': access_code,
           'stripe_link': stripe_link.url
       })
   ```

4. **Afficher** la modale de confirmation avec les infos :
   ```html
   <div class="success-message">
       <h4>✅ Voyage publié !</h4>
       <p><strong>URL du client :</strong></p>
       <a href="{{ url }}" target="_blank">{{ url }}</a>
       <p><strong>Code d'accès :</strong> {{ access_code }}</p>
       <p><strong>Lien de paiement Stripe :</strong></p>
       <a href="{{ stripe_link }}" target="_blank">Payer</a>
   </div>
   ```

**Validation** : Clic sur "Publier" génère une URL unique + code + lien Stripe

---

### ÉTAPE 5 : Pages Client Dynamiques

**Objectif** : Créer les templates pour les pages client accessibles via URL

**Actions** :
1. **Créer** `app/routes/client.py` :
   ```python
   @client_bp.route('/voyageperso/<slug>')
   def voyage_client(slug):
       # 1. Récupérer les données du voyage publié
       published_trip = firebase_service.get_published_trip_by_slug(slug)
       
       if not published_trip:
           abort(404)
       
       # 2. Vérifier si le code a été validé (session)
       code_validated = session.get(f'code_validated_{slug}', False)
       
       # 3. Vérifier le statut de paiement
       payment_status = published_trip['payment_status']  # 'pending' ou 'paid'
       
       # 4. Charger les données du voyage depuis Firestore
       trip_data = firebase_service.get_trip(published_trip['trip_id'])
       days = firebase_service.get_days(user_id, published_trip['trip_id'])
       
       # 5. Choisir le template selon l'état
       if not code_validated:
           return render_template('client/voyage_login.html', slug=slug)
       elif payment_status == 'pending':
           return render_template('client/voyage_preview.html',
                                  trip=trip_data,
                                  days=days,
                                  stripe_link=published_trip['stripe_payment_link'])
       else:
           # Charger aussi les médias, GPX, etc.
           media = firebase_service.get_trip_media(trip_id)
           return render_template('client/voyage_full.html',
                                  trip=trip_data,
                                  days=days,
                                  media=media)
   ```

2. **Créer** `templates/client/voyage_login.html` :
   ```html
   {% extends "base.html" %}
   {% block content %}
   <div class="max-w-md mx-auto mt-20">
       <div class="bg-white p-8 rounded-lg shadow-lg">
           <h2 class="text-2xl font-bold mb-4">Accès Client</h2>
           <form id="code-form" method="POST" action="/api/verify-code">
               <input type="hidden" name="slug" value="{{ slug }}">
               <label>Code d'accès (5 chiffres) :</label>
               <input type="text" name="code" maxlength="5" pattern="\d{5}" required
                      class="w-full px-3 py-2 border rounded-md text-2xl text-center font-mono">
               <button type="submit" class="w-full bg-blue-600 text-white py-2 rounded-md mt-4">
                   Valider
               </button>
           </form>
       </div>
   </div>
   {% endblock %}
   ```

3. **Créer** `templates/client/voyage_preview.html` :
   ```html
   {% extends "base.html" %}
   {% block content %}
   <div class="container mx-auto p-8">
       <h1 class="text-3xl font-bold">{{ trip.name }}</h1>
       <p class="text-gray-600 mb-6">Aperçu du voyage</p>
       
       <!-- Afficher un résumé des étapes (limité) -->
       {% for day in days %}
       <div class="border p-4 rounded-lg mb-4 bg-gray-50">
           <h3 class="font-semibold">{{ day.dayName }}</h3>
           <p class="text-gray-600">🏨 {{ day.hotelName }}</p>
           <p class="text-sm text-gray-500">📍 {{ day.city }}</p>
           <!-- Pas de prix, pas de GPX, pas de photos -->
       </div>
       {% endfor %}
       
       <!-- Bouton de paiement -->
       <div class="bg-blue-50 p-6 rounded-lg mt-8">
           <h3 class="text-xl font-bold mb-4">🔒 Débloquer le contenu complet</h3>
           <p class="mb-4">Après paiement, vous aurez accès à :</p>
           <ul class="list-disc list-inside mb-6">
               <li>Tous les fichiers GPX</li>
               <li>Photos des hôtels et points d'intérêt</li>
               <li>Détails complets de chaque étape</li>
           </ul>
           <a href="{{ stripe_link }}" target="_blank" 
              class="block w-full bg-green-600 text-white py-3 rounded-md text-center font-bold">
               💳 Payer maintenant
           </a>
       </div>
   </div>
   {% endblock %}
   ```

4. **Créer** `templates/client/voyage_full.html` :
   ```html
   {% extends "base.html" %}
   {% block content %}
   <div class="container mx-auto p-8">
       <h1 class="text-3xl font-bold">{{ trip.name }}</h1>
       <p class="text-green-600 font-semibold mb-6">✅ Voyage débloqué - Accès complet</p>
       
       <!-- Afficher TOUTES les étapes avec TOUS les détails -->
       {% for day in days %}
       <div class="border p-6 rounded-lg mb-6 bg-white shadow">
           <h3 class="text-xl font-bold">{{ day.dayName }}</h3>
           <p class="text-gray-700">🏨 {{ day.hotelName }}</p>
           <p class="text-gray-600">📍 {{ day.city }}</p>
           
           <!-- Fichier GPX -->
           {% if day.gpxFile %}
           <a href="{{ url_for('client.download_gpx', day_id=day.id) }}" 
              class="text-blue-600 hover:underline">
               📥 Télécharger GPX : {{ day.gpxFile }}
           </a>
           {% endif %}
           
           <!-- Lien hôtel -->
           {% if day.hotelLink %}
           <a href="{{ day.hotelLink }}" target="_blank" class="text-blue-600 hover:underline">
               🔗 Voir l'hôtel
           </a>
           {% endif %}
       </div>
       {% endfor %}
       
       <!-- Galerie de photos -->
       <div class="mt-8">
           <h2 class="text-2xl font-bold mb-4">📸 Photos du voyage</h2>
           <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
               {% for photo in media %}
               <img src="{{ photo.downloadURL }}" alt="{{ photo.fileName }}" 
                    class="w-full h-48 object-cover rounded-lg">
               {% endfor %}
           </div>
       </div>
   </div>
   {% endblock %}
   ```

**Validation** : URL `/voyageperso/test-slug` affiche correctement selon l'état (code/paiement)

---

### ÉTAPE 6 : Vérification Code d'Accès

**Objectif** : Implémenter la validation du code à 5 chiffres

**Actions** :
1. **Créer** la route API dans `app/routes/api.py` :
   ```python
   @api_bp.route('/api/verify-code', methods=['POST'])
   def verify_code():
       slug = request.form['slug']
       code = request.form['code']
       
       # Vérifier le code dans Firestore
       published_trip = firebase_service.get_published_trip_by_slug(slug)
       
       if not published_trip:
           return jsonify({'error': 'Voyage introuvable'}), 404
       
       if published_trip['access_code'] != code:
           return jsonify({'error': 'Code incorrect'}), 403
       
       # Stocker dans la session
       session[f'code_validated_{slug}'] = True
       
       # Rediriger vers la page du voyage
       return redirect(url_for('client.voyage_client', slug=slug))
   ```

**Validation** : Code correct → accès à la page, code incorrect → erreur

---

### ÉTAPE 7 : Intégration Stripe Webhooks

**Objectif** : Déverrouiller le contenu après paiement validé

**Actions** :
1. **Créer** `app/services/stripe_service.py` :
   ```python
   import stripe
   
   class StripeService:
       def __init__(self, secret_key):
           stripe.api_key = secret_key
       
       def create_payment_link(self, trip_id, amount, metadata):
           """Créer un Payment Link Stripe"""
           price = stripe.Price.create(
               unit_amount=int(amount * 100),  # En centimes
               currency='eur',
               product_data={'name': f'Voyage - {metadata["trip_name"]}'}
           )
           
           payment_link = stripe.PaymentLink.create(
               line_items=[{'price': price.id, 'quantity': 1}],
               metadata=metadata
           )
           
           return payment_link
       
       def verify_webhook(self, payload, sig_header, webhook_secret):
           """Vérifier la signature du webhook"""
           try:
               event = stripe.Webhook.construct_event(
                   payload, sig_header, webhook_secret
               )
               return event
           except ValueError:
               return None
   ```

2. **Créer** la route webhook dans `app/routes/api.py` :
   ```python
   @api_bp.route('/api/stripe-webhook', methods=['POST'])
   def stripe_webhook():
       payload = request.data
       sig_header = request.headers.get('Stripe-Signature')
       
       # Vérifier la signature
       event = stripe_service.verify_webhook(
           payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET')
       )
       
       if not event:
           return jsonify({'error': 'Invalid signature'}), 400
       
       # Traiter l'événement
       if event['type'] == 'checkout.session.completed':
           session = event['data']['object']
           slug = session['metadata']['slug']
           
           # Mettre à jour le statut de paiement dans Firestore
           firebase_service.update_published_trip(slug, {
               'payment_status': 'paid',
               'paid_at': datetime.now()
           })
       
       return jsonify({'status': 'success'}), 200
   ```

3. **Configurer** le webhook dans Stripe Dashboard :
   - URL : `https://ton-app.up.railway.app/api/stripe-webhook`
   - Événements : `checkout.session.completed`

**Validation** : Paiement Stripe → webhook reçu → page débloquée automatiquement

---

### ÉTAPE 8 : Migration des Données Firestore

**Objectif** : Adapter la structure Firestore existante si nécessaire

**Actions** :
1. **Vérifier** la structure actuelle dans Firestore :
   ```
   artifacts/{appId}/users/{userId}/trips/{tripId}/days/{dayId}
   artifacts/{appId}/users/{userId}/trips/{tripId}/media/{mediaId}
   ```

2. **Ajouter** une nouvelle collection pour les voyages publiés :
   ```
   artifacts/{appId}/publishedTrips/{slug}
       ├── slug: "jean-dupont-alpes-2025"
       ├── access_code: "12345"
       ├── trip_id: "{tripId}"
       ├── user_id: "{userId}"
       ├── client_name: "Jean Dupont"
       ├── price_per_person: 1200
       ├── stripe_payment_link: "https://..."
       ├── payment_status: "pending" | "paid"
       ├── created_at: Timestamp
       └── paid_at: Timestamp (si payé)
   ```

3. **Créer** un script de migration pour les 2 voyages existants si besoin

**Validation** : Structure Firestore compatible avec Flask

---

### ÉTAPE 9 : Authentification Admin Simple

**Objectif** : Protéger l'interface admin par login

**Actions** :
1. **Créer** `app/services/auth_service.py` :
   ```python
   from werkzeug.security import check_password_hash
   
   class AuthService:
       def __init__(self):
           self.username = os.getenv('ADMIN_USERNAME')
           self.password_hash = os.getenv('ADMIN_PASSWORD_HASH')
       
       def verify_login(self, username, password):
           return (username == self.username and 
                   check_password_hash(self.password_hash, password))
   ```

2. **Créer** `templates/admin/login.html` :
   ```html
   <form method="POST" action="/login">
       <input type="text" name="username" placeholder="Username" required>
       <input type="password" name="password" placeholder="Password" required>
       <button type="submit">Connexion</button>
   </form>
   ```

3. **Protéger** les routes admin :
   ```python
   from functools import wraps
   
   def login_required(f):
       @wraps(f)
       def decorated_function(*args, **kwargs):
           if 'user_id' not in session:
               return redirect(url_for('admin.login'))
           return f(*args, **kwargs)
       return decorated_function
   
   @admin_bp.route('/dashboard')
   @login_required
   def dashboard():
       # ...
   ```

**Validation** : Accès /dashboard redirige vers /login si non connecté

---

### ÉTAPE 10 : Déploiement sur Railway

**Objectif** : Déployer l'application Flask sur Railway

**Actions** :
1. **Créer** `Procfile` :
   ```
   web: gunicorn app:app
   ```

2. **Créer** `app.py` (point d'entrée) :
   ```python
   from app import create_app
   
   app = create_app()
   
   if __name__ == '__main__':
       app.run()
   ```

3. **Initialiser** Git et pousser sur GitHub :
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Flask migration"
   git remote add origin https://github.com/ton-repo.git
   git push -u origin main
   ```

4. **Créer** un nouveau projet Railway :
   - Connecter le repo GitHub
   - Ajouter PostgreSQL addon (si nécessaire)
   - Configurer les variables d'environnement :
     - `FLASK_SECRET_KEY`
     - `FIREBASE_CREDENTIALS` (contenu JSON du serviceAccountKey)
     - `STRIPE_SECRET_KEY`
     - `STRIPE_WEBHOOK_SECRET`
     - `ADMIN_USERNAME`
     - `ADMIN_PASSWORD_HASH`
     - `DATABASE_URL` (auto-généré par Railway)

5. **Configurer** le domaine personnalisé :
   - Dans Railway : Settings → Domains
   - Ajouter `app.oldibike.be`
   - Chez Wix DNS :
     ```
     Type: CNAME
     Nom: app
     Valeur: ton-app.up.railway.app
     ```

**Validation** : `app.oldibike.be` accessible, application fonctionne

---

### ÉTAPE 11 : Tests et Validation Finale

**Objectif** : Vérifier que tout fonctionne correctement

**Tests à effectuer** :
1. ✅ Login admin fonctionne
2. ✅ Dashboard affiche les voyages
3. ✅ CRUD voyages/étapes fonctionne
4. ✅ Upload médias fonctionne
5. ✅ Système de médias (cols/routes + hôtels) fonctionne
6. ✅ Publication d'un voyage génère URL + code + lien Stripe
7. ✅ Page client affiche l'aperçu avant paiement
8. ✅ Validation du code à 5 chiffres fonctionne
9. ✅ Paiement Stripe déclenche le webhook
10. ✅ Page client débloquée après paiement
11. ✅ Téléchargement GPX fonctionne
12. ✅ Galerie photos fonctionne
13. ✅ Site oldibike.be (Wix) reste fonctionnel

---

## 🚨 Points d'Attention Critiques

### ⚠️ Ne PAS casser le site Wix
- Le site `oldibike.be` doit rester **100% fonctionnel**
- Seul le sous-domaine `app.oldibike.be` pointe vers Railway
- Tester la configuration DNS avant de la valider

### ⚠️ Sécurité
- **Secrets** : Ne JAMAIS commiter les clés API en dur
- **CORS** : Configurer correctement pour éviter les erreurs cross-origin
- **Sessions** : Utiliser un `SECRET_KEY` fort
- **Stripe** : Toujours vérifier la signature des webhooks

### ⚠️ Performance
- **Cache** : Utiliser Flask-Caching pour les données Firestore
- **Pagination** : Limiter le nombre d'étapes affichées d'un coup
- **Images** : Compresser les images avant upload (côté client)

### ⚠️ UX
- **Loading states** : Afficher des spinners pendant les chargements
- **Error handling** : Messages d'erreur clairs pour l'utilisateur
- **Responsive** : Vérifier que tout fonctionne sur mobile

---

## 📚 Ressources et Documentation

### Flask
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Jinja2 Templates](https://jinja.palletsprojects.com/)
- [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/)

### Firebase
- [Firebase Admin SDK Python](https://firebase.google.com/docs/admin/setup)
- [Firestore Python](https://firebase.google.com/docs/firestore/quickstart)

### Stripe
- [Stripe Python SDK](https://stripe.com/docs/api)
- [Payment Links](https://stripe.com/docs/payment-links)
- [Webhooks](https://stripe.com/docs/webhooks)

### Railway
- [Railway Documentation](https://docs.railway.app/)
- [Python Deployment](https://docs.railway.app/guides/python)

---

## 🎯 Checklist Finale pour Cline

Avant de considérer la migration terminée, vérifie que :

- [ ] La structure Flask complète est créée
- [ ] Firebase (Firestore + Storage) est connecté
- [ ] L'interface admin est fonctionnelle (identique à l'actuelle)
- [ ] Toutes les fonctionnalités CRUD marchent
- [ ] Le système de médias (photos) fonctionne
- [ ] Le bouton "Publier pour un client" est opérationnel
- [ ] Les pages client sont accessibles via URL unique
- [ ] Le code à 5 chiffres fonctionne
- [ ] L'intégration Stripe (Payment Links + Webhooks) est complète
- [ ] Le déverrouillage après paiement fonctionne
- [ ] L'authentification admin est sécurisée
- [ ] Le projet est déployé sur Railway
- [ ] Le domaine `app.oldibike.be` pointe vers Railway
- [ ] Le site `oldibike.be` (Wix) reste intact
- [ ] Tous les tests sont passés ✅

---

## 💡 Conseils pour Cline

1. **Procède par étapes** : Ne saute pas d'étape, même si ça semble facile
2. **Teste fréquemment** : Après chaque étape, vérifie que ça marche
3. **Conserve l'existant** : Ne perds AUCUNE fonctionnalité actuelle
4. **Documente** : Ajoute des commentaires dans le code pour les modifications importantes
5. **Backup** : Garde une copie de l'app HTML originale avant de tout changer
6. **Git** : Commit régulièrement avec des messages clairs

Bon courage ! 🚀
