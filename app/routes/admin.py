"""
Routes admin pour le dashboard et la gestion
"""
from flask import Blueprint, render_template, redirect, url_for, request, jsonify, session, current_app, abort
from functools import wraps
from werkzeug.security import check_password_hash
from app.services import FirebaseService
from app.utils import calculate_trip_costs, calculate_sale_prices

bp = Blueprint('admin', __name__, url_prefix='/admin')

# Credentials admin (en dur pour simplifier)
ADMIN_USERNAME = 'Sam'
ADMIN_PASSWORD_HASH = 'scrypt:32768:8:1$2EG3c09v85hTBDc2$0fcac06f249ff5da65a1aa8969090c13fe56354455c0c0895d8c719a1d3d56c9213c5c634dfff9c9b77373bad72aa4f1ae4f08e7c05d588645e60dc4fdee3724'  # $AMuel12xxpj


def get_firebase_service():
    """Récupère une instance du service Firebase"""
    app_id = current_app.config.get('APP_ID', 'default-app-id')
    return FirebaseService(app_id)


def get_current_user_id():
    """Retourne toujours le même userId fixe pour Sam"""
    return 'sam-user'


def login_required(f):
    """Décorateur pour protéger les routes admin"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('admin_logged_in'):
            if request.is_json:
                return jsonify({'error': 'Non authentifié'}), 401
            return redirect(url_for('admin.login'))
        return f(*args, **kwargs)
    return decorated_function


def require_user():
    """Décorateur pour vérifier qu'un utilisateur est connecté (API)"""
    user_id = get_current_user_id()
    if not user_id:
        return jsonify({'error': 'Non authentifié'}), 401
    return None


@bp.route('/dashboard')
@login_required
def dashboard():
    """Page dashboard admin - Vue principale en grille"""
    # Utilise toujours le userId fixe 'sam-user'
    user_id = get_current_user_id()
    
    # Récupère les données Firebase
    firebase = get_firebase_service()
    trips = firebase.get_user_trips(user_id)
    
    # Récupère la clé API Google Maps
    google_maps_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    if not google_maps_key:
        # Fallback sur la variable d'environnement ou valeur par défaut
        import os
        google_maps_key = os.getenv('GOOGLE_MAPS_API_KEY', 'AIzaSyDFNp_SRKMbOncczpg21uL_d0q2bRlpeeY')
    
    print(f"🔑 Google Maps API Key chargée: {google_maps_key[:20]}..." if google_maps_key else "❌ Aucune clé API")
    
    return render_template('admin/dashboard.html',
                         trips=trips,
                         user_id=user_id,
                         google_maps_key=google_maps_key)


@bp.route('/dashboard-old')
@login_required
def dashboard_old():
    """Ancien dashboard pour la construction de voyages (utilisé en iframe)"""
    user_id = get_current_user_id()
    
    # Récupère les données Firebase
    firebase = get_firebase_service()
    trips = firebase.get_user_trips(user_id)
    
    # Récupère la clé API Google Maps
    google_maps_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
    if not google_maps_key:
        import os
        google_maps_key = os.getenv('GOOGLE_MAPS_API_KEY', 'AIzaSyDFNp_SRKMbOncczpg21uL_d0q2bRlpeeY')
    
    # Récupère le trip_id depuis les paramètres
    selected_trip_id = request.args.get('trip', None)
    
    # Utilise l'ancien template de dashboard pour la construction
    return render_template('admin/dashboard_OLD_BACKUP.html',
                         trips=trips,
                         user_id=user_id,
                         google_maps_key=google_maps_key,
                         selected_trip_id=selected_trip_id)


@bp.route('/hotels/search')
@login_required
def hotel_search():
    """Page de recherche d'hôtels moto-friendly"""
    return render_template('admin/hotel_search.html')


@bp.route('/api/trips', methods=['GET'])
def get_trips():
    """API: Récupère tous les voyages de l'utilisateur"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        trips = firebase.get_user_trips(user_id)
        return jsonify({'success': True, 'trips': trips})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips', methods=['POST'])
def create_trip():
    """API: Crée un nouveau voyage"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    data = request.get_json()
    
    if not data or not data.get('name'):
        return jsonify({'error': 'Le nom du voyage est requis'}), 400
    
    firebase = get_firebase_service()
    
    try:
        trip_id = firebase.create_trip(user_id, data['name'])
        if trip_id:
            return jsonify({'success': True, 'trip_id': trip_id})
        else:
            return jsonify({'error': 'Erreur lors de la création'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>', methods=['GET'])
def get_trip(trip_id):
    """API: Récupère un voyage spécifique"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        trip = firebase.get_trip(user_id, trip_id)
        if trip:
            return jsonify({'success': True, 'trip': trip})
        else:
            return jsonify({'error': 'Voyage non trouvé'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>', methods=['PUT'])
def update_trip(trip_id):
    """API: Met à jour un voyage"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    data = request.get_json()
    firebase = get_firebase_service()
    
    try:
        success = firebase.update_trip(user_id, trip_id, data)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>', methods=['DELETE'])
def delete_trip(trip_id):
    """API: Supprime un voyage"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_trip(user_id, trip_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>/days', methods=['GET'])
def get_days(trip_id):
    """API: Récupère toutes les étapes d'un voyage"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        days = firebase.get_trip_days(user_id, trip_id)
        
        # Calcule les coûts
        costs = calculate_trip_costs(days)
        
        # Récupère le prix de vente du voyage
        trip = firebase.get_trip(user_id, trip_id)
        sale_price_pp = trip.get('salePricePerPerson', 0) if trip else 0
        
        # Calcule les prix de vente
        sale_prices = calculate_sale_prices(costs, sale_price_pp)
        
        return jsonify({
            'success': True,
            'days': days,
            'costs': costs,
            'sale_prices': sale_prices
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>/days', methods=['POST'])
def create_day(trip_id):
    """API: Crée une nouvelle étape"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    data = request.get_json()
    
    # Validation
    required_fields = ['dayName', 'city', 'hotelName']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    # Prépare les données
    day_data = {
        'dayName': data['dayName'],
        'city': data['city'],
        'hotelName': data['hotelName'],
        'priceDouble': float(data.get('priceDouble', 0)),
        'priceSolo': float(data.get('priceSolo', 0)),
        'nights': int(data.get('nights', 1)),
        'gpxFile': data.get('gpxFile', ''),
        'hotelLink': data.get('hotelLink', '')
    }
    
    firebase = get_firebase_service()
    
    try:
        day_id = firebase.create_day(user_id, trip_id, day_data)
        if day_id:
            return jsonify({'success': True, 'day_id': day_id})
        else:
            return jsonify({'error': 'Erreur lors de la création'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>/days/<day_id>', methods=['PUT'])
def update_day(trip_id, day_id):
    """API: Met à jour une étape"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    data = request.get_json()
    firebase = get_firebase_service()
    
    try:
        success = firebase.update_day(user_id, trip_id, day_id, data)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>/days/<day_id>', methods=['DELETE'])
def delete_day(trip_id, day_id):
    """API: Supprime une étape"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_day(user_id, trip_id, day_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Page de connexion admin"""
    # Si déjà connecté, redirection vers dashboard
    if session.get('admin_logged_in'):
        return redirect(url_for('admin.dashboard'))
    
    if request.method == 'POST':
        email = request.form.get('username')  # Le champ s'appelle username mais on attend un email
        password = request.form.get('password')
        remember = request.form.get('remember')
        
        # Vérifie avec Firebase
        firebase = get_firebase_service()
        user = firebase.get_user_by_email(email.lower().strip())
        
        if user and check_password_hash(user.password_hash, password):
            # Vérifie que c'est un admin
            if user.role == 'admin':
                # Connexion réussie
                session['admin_logged_in'] = True
                session['admin_username'] = user.name
                session['admin_email'] = user.email
                session['admin_user_id'] = user.id
                
                # Remember me (session permanente)
                if remember:
                    session.permanent = True
                
                return redirect(url_for('admin.dashboard'))
            else:
                return render_template('admin/login.html', error='Accès réservé aux administrateurs')
        else:
            # Échec de connexion
            return render_template('admin/login.html', error='Login ou mot de passe incorrect')
    
    return render_template('admin/login.html')


@bp.route('/logout')
def logout():
    """Déconnexion admin"""
    session.pop('admin_logged_in', None)
    session.pop('admin_username', None)
    return redirect(url_for('admin.login'))


@bp.route('/bookings')
@login_required
def bookings():
    """Page de gestion des réservations"""
    return render_template('admin/bookings.html')


@bp.route('/hotels')
@login_required
def hotels():
    """Page de gestion de la banque d'hôtels"""
    return render_template('admin/hotels.html')


@bp.route('/customers')
@login_required
def customers():
    """Page de gestion des clients"""
    return render_template('admin/customers.html')


@bp.route('/customers/<customer_id>')
@login_required
def customer_details(customer_id):
    """Page de détails d'un client"""
    firebase = get_firebase_service()
    
    # Récupère le client
    customer = firebase.get_customer(customer_id)
    if not customer:
        abort(404)
    
    # Récupère les voyages assignés
    assigned_trips = firebase.get_customer_trip_assignments(customer_id)
    
    # Récupère les vouchers
    vouchers = firebase.get_customer_vouchers(customer_id)
    
    # Récupère les fichiers GPX
    gpx_files = firebase.get_customer_gpx_files(customer_id)
    
    # Récupère tous les voyages disponibles pour l'assignation
    user_id = get_current_user_id()
    available_trips = firebase.get_user_trips(user_id)
    
    # Calcule la durée de chaque voyage (en jours)
    for trip in available_trips:
        days = firebase.get_trip_days(user_id, trip['id'])
        total_nights = sum(day.get('nights', 1) for day in days)
        trip['duration'] = total_nights if total_nights > 0 else len(days)
    
    return render_template('admin/customer_detail.html', 
                         customer=customer, 
                         assigned_trips=assigned_trips,
                         vouchers=vouchers,
                         gpx_files=gpx_files,
                         available_trips=available_trips)


# ============================================
# API ROUTES - GESTION DES RÉSERVATIONS
# ============================================

@bp.route('/api/bookings', methods=['GET'])
@login_required
def api_get_bookings():
    """API: Récupère toutes les réservations"""
    firebase = get_firebase_service()
    
    try:
        bookings = firebase.get_all_bookings()
        return jsonify({'success': True, 'bookings': bookings})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - GESTION DES CLIENTS
# ============================================

@bp.route('/api/customers', methods=['GET'])
@login_required
def api_get_customers():
    """API: Récupère tous les clients"""
    firebase = get_firebase_service()
    
    try:
        customers = firebase.get_customers()
        
        # Ajoute le nombre de voyages assignés à chaque client
        for customer in customers:
            trip_count = len(firebase.get_customer_trip_assignments(customer['id']))
            customer['tripCount'] = trip_count
        
        return jsonify({'success': True, 'customers': customers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers', methods=['POST'])
@login_required
def api_create_customer():
    """API: Crée un nouveau client"""
    data = request.get_json()
    
    # Validation
    required_fields = ['name', 'email', 'phone']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    firebase = get_firebase_service()
    
    try:
        customer_data = {
            'name': data['name'],
            'email': data['email'],
            'phone': data['phone'],
            'address': data.get('address', '')
        }
        
        customer_id = firebase.create_customer(customer_data)
        if customer_id:
            return jsonify({'success': True, 'customer_id': customer_id})
        else:
            return jsonify({'error': 'Erreur lors de la création du client'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>', methods=['GET'])
@login_required
def api_get_customer(customer_id):
    """API: Récupère un client spécifique"""
    firebase = get_firebase_service()
    
    try:
        customer = firebase.get_customer(customer_id)
        if customer:
            return jsonify({'success': True, 'customer': customer})
        else:
            return jsonify({'error': 'Client non trouvé'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>', methods=['PUT'])
@login_required
def api_update_customer(customer_id):
    """API: Met à jour un client"""
    data = request.get_json()
    firebase = get_firebase_service()
    
    try:
        # Filtre les champs autorisés
        allowed_fields = ['name', 'email', 'phone', 'address']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        success = firebase.update_customer(customer_id, update_data)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>', methods=['DELETE'])
@login_required
def api_delete_customer(customer_id):
    """API: Supprime un client"""
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_customer(customer_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - VOYAGES ASSIGNÉS
# ============================================

@bp.route('/api/customers/<customer_id>/trips', methods=['GET'])
@login_required
def api_get_customer_trips(customer_id):
    """API: Récupère les voyages assignés à un client"""
    firebase = get_firebase_service()
    
    try:
        trips = firebase.get_customer_trip_assignments(customer_id)
        return jsonify({'success': True, 'trips': trips})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>/trips', methods=['POST'])
@login_required
def api_assign_trip_to_customer(customer_id):
    """API: Assigne un voyage à un client"""
    data = request.get_json()
    
    # Validation
    required_fields = ['tripId', 'tripName', 'startDate', 'endDate']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    firebase = get_firebase_service()
    
    try:
        trip_data = {
            'tripId': data['tripId'],
            'tripName': data['tripName'],
            'startDate': data['startDate'],
            'endDate': data['endDate']
        }
        
        assignment_id = firebase.assign_trip_to_customer(customer_id, trip_data)
        if assignment_id:
            return jsonify({'success': True, 'assignment_id': assignment_id})
        else:
            return jsonify({'error': 'Erreur lors de l\'assignation'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>/trips/<assignment_id>', methods=['DELETE'])
@login_required
def api_unassign_trip_from_customer(customer_id, assignment_id):
    """API: Retire un voyage assigné à un client"""
    firebase = get_firebase_service()
    
    try:
        success = firebase.unassign_trip_from_customer(customer_id, assignment_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors du retrait du voyage'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - VOUCHERS
# ============================================

@bp.route('/api/customers/<customer_id>/vouchers', methods=['GET'])
@login_required
def api_get_customer_vouchers(customer_id):
    """API: Récupère les vouchers d'un client"""
    firebase = get_firebase_service()
    
    try:
        vouchers = firebase.get_customer_vouchers(customer_id)
        return jsonify({'success': True, 'vouchers': vouchers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>/vouchers', methods=['POST'])
@login_required
def api_upload_voucher(customer_id):
    """API: Upload un voucher pour un client"""
    
    # Vérifie qu'un fichier a été envoyé
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    # Récupère l'ID d'assignation optionnel
    assignment_id = request.form.get('assignmentId', None)
    
    firebase = get_firebase_service()
    
    try:
        # Lit le contenu du fichier
        file_bytes = file.read()
        
        # Détermine le type de contenu
        content_type = file.content_type or 'application/pdf'
        
        # Upload le fichier
        result = firebase.upload_customer_voucher(
            customer_id=customer_id,
            file_bytes=file_bytes,
            file_name=file.filename,
            assignment_id=assignment_id,
            content_type=content_type
        )
        
        if result:
            return jsonify({
                'success': True,
                'voucher': result
            })
        else:
            return jsonify({'error': 'Erreur lors de l\'upload du voucher'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur upload voucher: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>/vouchers/<voucher_id>', methods=['DELETE'])
@login_required
def api_delete_voucher(customer_id, voucher_id):
    """API: Supprime un voucher"""
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_customer_voucher(customer_id, voucher_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression du voucher'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - FICHIERS GPX
# ============================================

@bp.route('/api/customers/<customer_id>/gpx', methods=['GET'])
@login_required
def api_get_customer_gpx_files(customer_id):
    """API: Récupère les fichiers GPX d'un client"""
    firebase = get_firebase_service()
    
    try:
        gpx_files = firebase.get_customer_gpx_files(customer_id)
        return jsonify({'success': True, 'gpxFiles': gpx_files})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>/gpx', methods=['POST'])
@login_required
def api_upload_gpx_file(customer_id):
    """API: Upload un fichier GPX pour un client"""
    
    # Vérifie qu'un fichier a été envoyé
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'Nom de fichier vide'}), 400
    
    # Vérifie l'extension du fichier
    if not file.filename.lower().endswith('.gpx'):
        return jsonify({'error': 'Seuls les fichiers .gpx sont acceptés'}), 400
    
    # Récupère l'ID d'assignation optionnel
    assignment_id = request.form.get('assignmentId', None)
    
    firebase = get_firebase_service()
    
    try:
        # Lit le contenu du fichier
        file_bytes = file.read()
        
        # Upload le fichier
        result = firebase.upload_customer_gpx_file(
            customer_id=customer_id,
            file_bytes=file_bytes,
            file_name=file.filename,
            assignment_id=assignment_id
        )
        
        if result:
            return jsonify({
                'success': True,
                'gpxFile': result
            })
        else:
            return jsonify({'error': 'Erreur lors de l\'upload du fichier GPX'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur upload GPX: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/customers/<customer_id>/gpx/<gpx_id>', methods=['DELETE'])
@login_required
def api_delete_gpx_file(customer_id, gpx_id):
    """API: Supprime un fichier GPX"""
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_customer_gpx_file(customer_id, gpx_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression du fichier GPX'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# ROUTES DE PUBLICATION
# ============================================

@bp.route('/api/trips/<trip_id>/publish', methods=['POST'])
def publish_trip(trip_id):
    """API: Publie un voyage pour le rendre accessible aux clients"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    data = request.get_json()
    firebase = get_firebase_service()
    
    # Récupère le voyage
    trip = firebase.get_trip(user_id, trip_id)
    if not trip:
        return jsonify({'error': 'Voyage non trouvé'}), 404
    
    # Récupère les étapes
    days = firebase.get_trip_days(user_id, trip_id)
    if not days:
        return jsonify({'error': 'Le voyage doit avoir au moins une étape'}), 400
    
    # Récupère le slug ou génère-le
    slug = data.get('slug', '').strip()
    if not slug:
        # Génère un slug depuis le nom du voyage
        import re
        slug = re.sub(r'[^a-z0-9]+', '-', trip.get('name', '').lower()).strip('-')
        if not slug:
            slug = f'voyage-{trip_id}'
    
    # Vérifie que le slug est valide (URL-safe)
    import re
    if not re.match(r'^[a-z0-9\-]+$', slug):
        return jsonify({'error': 'Le slug doit contenir uniquement des lettres, chiffres et tirets'}), 400
    
    # Vérifie que le slug n'existe pas déjà
    if firebase.check_slug_exists(slug):
        return jsonify({'error': 'Ce slug est déjà utilisé'}), 409
    
    # Prépare les données du voyage publié
    published_data = {
        'tripId': trip_id,
        'userId': user_id,
        'slug': slug,
        'title': trip.get('name', 'Voyage sans titre'),
        'description': data.get('description', ''),
        'pricePerPerson': float(data.get('pricePerPerson', trip.get('salePricePerPerson', 0))),
        'isActive': data.get('isActive', True),
        'days': days,  # Copie des étapes
        'stats': {
            'views': 0,
            'checkouts': 0
        }
    }
    
    # Publie le voyage
    try:
        success = firebase.create_published_trip(slug, published_data)
        if success:
            # Met à jour le voyage original avec le slug
            firebase.update_trip(user_id, trip_id, {'publishedSlug': slug})
            return jsonify({
                'success': True,
                'slug': slug,
                'url': f'/voyageperso/{slug}'
            })
        else:
            return jsonify({'error': 'Erreur lors de la publication'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>/unpublish', methods=['DELETE'])
def unpublish_trip(trip_id):
    """API: Dépublie un voyage"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    # Récupère le voyage pour obtenir le slug
    trip = firebase.get_trip(user_id, trip_id)
    if not trip:
        return jsonify({'error': 'Voyage non trouvé'}), 404
    
    slug = trip.get('publishedSlug')
    if not slug:
        return jsonify({'error': 'Ce voyage n\'est pas publié'}), 400
    
    try:
        # Supprime le voyage publié
        success = firebase.delete_published_trip(slug)
        if success:
            # Retire le slug du voyage original
            firebase.update_trip(user_id, trip_id, {'publishedSlug': None})
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la dépublication'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/published-trips', methods=['GET'])
def get_published_trips():
    """API: Récupère tous les voyages publiés de l'utilisateur"""
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        # Récupère tous les voyages de l'utilisateur
        trips = firebase.get_user_trips(user_id)
        
        # Filtre ceux qui sont publiés
        published = [t for t in trips if t.get('publishedSlug')]
        
        return jsonify({
            'success': True,
            'publishedTrips': published
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# TÉLÉCHARGEMENT PHOTOS GOOGLE PLACES
# ============================================

@bp.route('/api/download-place-photo', methods=['POST'])
def download_place_photo():
    """
    API: Télécharge une photo Google Places côté serveur (contourne CORS)
    et l'upload vers Firebase Storage
    """
    error = require_user()
    if error:
        return error
    
    user_id = get_current_user_id()
    data = request.get_json()
    
    photo_url = data.get('photoUrl')
    hotel_name = data.get('hotelName')
    day_id = data.get('dayId')
    file_index = data.get('fileIndex', 0)
    
    if not photo_url or not hotel_name or not day_id:
        return jsonify({'error': 'Paramètres manquants'}), 400
    
    import requests
    from datetime import datetime
    import traceback
    
    firebase = get_firebase_service()
    
    try:
        # Vérifie que Firebase Storage est disponible
        firebase_storage = firebase.get_storage()
        if firebase_storage is None:
            error_msg = "Firebase Storage n'est pas initialisé"
            current_app.logger.error(error_msg)
            return jsonify({'error': error_msg}), 500
        
        # Télécharge la photo depuis Google
        current_app.logger.info(f"Téléchargement photo depuis: {photo_url}")
        response = requests.get(photo_url, timeout=30)
        response.raise_for_status()
        current_app.logger.info(f"Photo téléchargée: {len(response.content)} bytes")
        
        # Prépare les métadonnées
        timestamp = int(datetime.now().timestamp() * 1000)
        file_name = f"{timestamp}_google_places_{file_index + 1}.jpg"
        hotel_slug = hotel_name.lower().replace(' ', '_')
        hotel_slug = ''.join(c for c in hotel_slug if c.isalnum() or c == '_')
        
        storage_path = f"users/{user_id}/media/hotels/{hotel_slug}/{file_name}"
        current_app.logger.info(f"Upload vers: {storage_path}")
        
        # Upload vers Firebase Storage
        blob = firebase_storage.blob(storage_path)
        blob.upload_from_string(
            response.content,
            content_type='image/jpeg'
        )
        blob.make_public()
        download_url = blob.public_url
        current_app.logger.info(f"Upload réussi: {download_url}")
        
        # PHASE 4: Récupère le hotelId depuis l'étape si disponible
        trip_id = data.get('tripId')  # Devrait être fourni par le client
        hotel_id = None
        if trip_id:
            trip = firebase.get_trip(user_id, trip_id)
            if trip and trip.get('days'):
                for day in trip['days']:
                    if day.get('id') == day_id:
                        hotel_id = day.get('hotelId')
                        break
        
        # Enregistre dans Firestore
        media_data = {
            'type': 'hotel',
            'fileName': f'google_places_{file_index + 1}.jpg',
            'storagePath': storage_path,
            'downloadURL': download_url,
            'hotelName': hotel_name,
            'hotelId': hotel_id,  # PHASE 4: Lien vers la banque d'hôtels
            'linkedDayId': day_id,
            'fileSize': len(response.content),
            'source': 'google_places',
            'uploadedAt': firebase.get_server_timestamp()
        }
        
        # Ajoute à la collection media
        firebase.add_media(user_id, media_data)
        
        return jsonify({
            'success': True,
            'downloadURL': download_url,
            'fileName': file_name
        })
        
    except requests.exceptions.RequestException as e:
        error_msg = f"Erreur téléchargement photo: {str(e)}"
        current_app.logger.error(error_msg)
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = f"Erreur upload Firebase: {str(e)}"
        current_app.logger.error(error_msg)
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': error_msg}), 500


@bp.route('/api/hotels/<hotel_name>/photos/count', methods=['GET'])
@login_required
def check_hotel_photos_exist(hotel_name):
    """API: Vérifie si des photos existent déjà pour un hôtel"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        # Récupère les photos existantes pour cet hôtel
        photos = firebase.get_hotel_photos(user_id, hotel_name)
        
        return jsonify({
            'success': True,
            'count': len(photos),
            'exists': len(photos) > 0
        })
    except Exception as e:
        current_app.logger.error(f"Erreur vérification photos hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trips/<trip_id>/days/<day_id>/fetch-google-photos', methods=['POST'])
@login_required
def fetch_google_photos_for_hotel(trip_id, day_id):
    """
    API: Télécharge automatiquement les photos Google Places pour un hôtel
    Récupère jusqu'à 5 photos depuis Google Places API
    """
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        # Récupère l'étape pour obtenir les infos de l'hôtel
        day = firebase.get_day(user_id, trip_id, day_id)
        if not day:
            return jsonify({'error': 'Étape non trouvée'}), 404
        
        hotel_name = day.get('hotelName')
        place_id = request.json.get('placeId') if request.json else None
        
        if not hotel_name:
            return jsonify({'error': 'Nom d\'hôtel manquant'}), 400
        
        # Vérifie si des photos existent déjà
        existing_photos = firebase.get_hotel_photos(user_id, hotel_name)
        if len(existing_photos) > 0:
            return jsonify({
                'success': True,
                'message': f'{len(existing_photos)} photo(s) déjà existante(s) pour cet hôtel',
                'photos_downloaded': 0,
                'skipped': True
            })
        
        # Si pas de place_id, recherche l'hôtel sur Google
        if not place_id:
            import requests
            google_api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
            
            # Recherche de l'hôtel
            search_url = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
            search_params = {
                'input': hotel_name,
                'inputtype': 'textquery',
                'fields': 'place_id',
                'key': google_api_key
            }
            
            search_response = requests.get(search_url, params=search_params, timeout=10)
            search_data = search_response.json()
            
            if search_data.get('status') != 'OK' or not search_data.get('candidates'):
                return jsonify({
                    'success': False,
                    'message': 'Hôtel non trouvé sur Google Maps',
                    'photos_downloaded': 0
                })
            
            place_id = search_data['candidates'][0]['place_id']
        
        # Récupère les détails de l'hôtel incluant les photos
        import requests
        google_api_key = current_app.config.get('GOOGLE_MAPS_API_KEY')
        
        details_url = 'https://maps.googleapis.com/maps/api/place/details/json'
        details_params = {
            'place_id': place_id,
            'fields': 'name,photos',
            'key': google_api_key
        }
        
        details_response = requests.get(details_url, params=details_params, timeout=10)
        details_data = details_response.json()
        
        if details_data.get('status') != 'OK':
            return jsonify({
                'success': False,
                'message': 'Impossible de récupérer les détails de l\'hôtel',
                'photos_downloaded': 0
            })
        
        photos_data = details_data.get('result', {}).get('photos', [])
        
        if not photos_data:
            return jsonify({
                'success': True,
                'message': 'Aucune photo disponible pour cet hôtel sur Google',
                'photos_downloaded': 0
            })
        
        # Limite à 5 photos maximum
        photos_to_download = photos_data[:5]
        downloaded_count = 0
        
        firebase_storage = firebase.get_storage()
        if firebase_storage is None:
            return jsonify({'error': 'Firebase Storage non disponible'}), 500
        
        # PHASE 4: Récupère le hotelId depuis l'étape si disponible
        hotel_id = day.get('hotelId')
        
        # Télécharge chaque photo
        from datetime import datetime
        for idx, photo in enumerate(photos_to_download):
            photo_reference = photo.get('photo_reference')
            if not photo_reference:
                continue
            
            # Construit l'URL de la photo (maxwidth=1600 pour haute qualité)
            photo_url = f'https://maps.googleapis.com/maps/api/place/photo?maxwidth=1600&photo_reference={photo_reference}&key={google_api_key}'
            
            try:
                # Télécharge la photo
                photo_response = requests.get(photo_url, timeout=30)
                photo_response.raise_for_status()
                
                # Prépare le stockage
                timestamp = int(datetime.now().timestamp() * 1000)
                file_name = f"{timestamp}_google_{idx + 1}.jpg"
                hotel_slug = hotel_name.lower().replace(' ', '_')
                hotel_slug = ''.join(c for c in hotel_slug if c.isalnum() or c == '_')
                
                storage_path = f"users/{user_id}/media/hotels/{hotel_slug}/{file_name}"
                
                # Upload vers Firebase Storage
                blob = firebase_storage.blob(storage_path)
                blob.upload_from_string(
                    photo_response.content,
                    content_type='image/jpeg'
                )
                blob.make_public()
                download_url = blob.public_url
                
                # Enregistre dans Firestore
                media_data = {
                    'type': 'hotel',
                    'fileName': file_name,
                    'storagePath': storage_path,
                    'downloadURL': download_url,
                    'hotelName': hotel_name,
                    'hotelId': hotel_id,  # PHASE 4: Lien vers la banque d'hôtels
                    'linkedDayId': day_id,
                    'fileSize': len(photo_response.content),
                    'source': 'google_places_auto',
                    'uploadedAt': firebase.get_server_timestamp()
                }
                
                firebase.add_media(user_id, media_data)
                downloaded_count += 1
                
                current_app.logger.info(f"Photo {idx + 1}/{len(photos_to_download)} téléchargée pour {hotel_name}")
                
            except Exception as e:
                current_app.logger.error(f"Erreur téléchargement photo {idx + 1}: {str(e)}")
                continue
        
        return jsonify({
            'success': True,
            'message': f'{downloaded_count} photo(s) téléchargée(s) avec succès',
            'photos_downloaded': downloaded_count,
            'hotel_name': hotel_name
        })
        
    except requests.exceptions.RequestException as e:
        current_app.logger.error(f"Erreur API Google: {str(e)}")
        return jsonify({'error': f'Erreur API Google: {str(e)}'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur téléchargement photos Google: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - STATISTIQUES DASHBOARD
# ============================================

@bp.route('/api/dashboard/stats', methods=['GET'])
@login_required
def api_get_dashboard_stats():
    """API: Récupère les statistiques du dashboard"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        # Statistiques des voyages
        trip_stats = firebase.get_trip_stats(user_id)
        
        # Nombre de clients
        customers = firebase.get_customers()
        customer_count = len(customers)
        
        # Nombre de nouvelles demandes
        new_requests_count = firebase.count_new_trip_requests(user_id)
        
        return jsonify({
            'success': True,
            'stats': {
                'trips': trip_stats,
                'customers': customer_count,
                'newRequests': new_requests_count
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - DEMANDES DE VOYAGES
# ============================================

@bp.route('/api/trip-requests', methods=['GET'])
@login_required
def api_get_trip_requests():
    """API: Récupère toutes les demandes de voyages"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    # Paramètre de filtrage optionnel
    status = request.args.get('status', None)
    
    try:
        requests = firebase.get_trip_requests(user_id, status)
        return jsonify({'success': True, 'requests': requests})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trip-requests', methods=['POST'])
@login_required
def api_create_trip_request():
    """API: Crée une nouvelle demande de voyage (encodage manuel)"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    # Validation des champs requis
    required_fields = ['customerInfo', 'tripDetails']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    # Validation des infos client
    customer_info = data['customerInfo']
    if not customer_info.get('name') or not customer_info.get('email'):
        return jsonify({'error': 'Nom et email du client requis'}), 400
    
    # Validation des détails du voyage
    trip_details = data['tripDetails']
    if not trip_details.get('duration') or not trip_details.get('region'):
        return jsonify({'error': 'Durée et région requis'}), 400
    
    firebase = get_firebase_service()
    
    try:
        request_data = {
            'source': 'manual',
            'status': 'new',
            'customerInfo': customer_info,
            'tripDetails': trip_details,
            'sourceTrip': data.get('sourceTrip', None)
        }
        
        request_id = firebase.create_trip_request(user_id, request_data)
        if request_id:
            return jsonify({'success': True, 'request_id': request_id})
        else:
            return jsonify({'error': 'Erreur lors de la création de la demande'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trip-requests/<request_id>', methods=['GET'])
@login_required
def api_get_trip_request(request_id):
    """API: Récupère une demande spécifique"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        trip_request = firebase.get_trip_request(user_id, request_id)
        if trip_request:
            return jsonify({'success': True, 'request': trip_request})
        else:
            return jsonify({'error': 'Demande non trouvée'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trip-requests/<request_id>/status', methods=['PUT'])
@login_required
def api_update_trip_request_status(request_id):
    """API: Met à jour le statut d'une demande"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    status = data.get('status')
    if not status or status not in ['new', 'processing', 'completed', 'rejected']:
        return jsonify({'error': 'Statut invalide'}), 400
    
    firebase = get_firebase_service()
    
    try:
        success = firebase.update_trip_request(user_id, request_id, {'status': status})
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trip-requests/<request_id>/create-trip', methods=['POST'])
@login_required
def api_create_trip_from_request(request_id):
    """API: Crée un voyage depuis une demande"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        # Récupère la demande
        trip_request = firebase.get_trip_request(user_id, request_id)
        if not trip_request:
            return jsonify({'error': 'Demande non trouvée'}), 404
        
        customer_info = trip_request.get('customerInfo', {})
        trip_details = trip_request.get('tripDetails', {})
        
        # Crée le nom du voyage
        region = trip_details.get('region', 'Voyage')
        duration = trip_details.get('duration', '')
        customer_name = customer_info.get('name', 'Client')
        trip_name = f"{region} - {duration}j - {customer_name}"
        
        # Crée le voyage
        trip_id = firebase.create_trip(user_id, trip_name)
        if not trip_id:
            return jsonify({'error': 'Erreur lors de la création du voyage'}), 500
        
        # Cherche ou crée le client
        customer_email = customer_info.get('email')
        customers = firebase.get_customers()
        existing_customer = next((c for c in customers if c.get('email') == customer_email), None)
        
        if existing_customer:
            customer_id = existing_customer['id']
        else:
            # Crée un nouveau client
            customer_data = {
                'name': customer_info.get('name'),
                'email': customer_info.get('email'),
                'phone': customer_info.get('phone', ''),
                'address': customer_info.get('address', '')
            }
            customer_id = firebase.create_customer(customer_data)
        
        # Assigne le voyage au client si on a un customer_id
        if customer_id:
            # Calcule les dates approximatives
            from datetime import datetime, timedelta
            start_date_str = trip_details.get('startDate')
            if start_date_str:
                try:
                    start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
                    end_date = start_date + timedelta(days=int(duration))
                    
                    assignment_data = {
                        'tripId': trip_id,
                        'tripName': trip_name,
                        'startDate': start_date_str,
                        'endDate': end_date.isoformat()
                    }
                    firebase.assign_trip_to_customer(customer_id, assignment_data)
                except:
                    pass
        
        # Met à jour la demande
        firebase.update_trip_request(user_id, request_id, {
            'status': 'completed',
            'linkedTripId': trip_id,
            'linkedCustomerId': customer_id
        })
        
        return jsonify({
            'success': True,
            'trip_id': trip_id,
            'customer_id': customer_id
        })
    except Exception as e:
        current_app.logger.error(f"Erreur création voyage depuis demande: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trip-requests/<request_id>', methods=['DELETE'])
@login_required
def api_delete_trip_request(request_id):
    """API: Supprime une demande de voyage"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_trip_request(user_id, request_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/trip-requests/new-count', methods=['GET'])
@login_required
def api_get_new_trip_requests_count():
    """API: Compte les nouvelles demandes (pour polling)"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        count = firebase.count_new_trip_requests(user_id)
        return jsonify({'success': True, 'count': count})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTE PUBLIQUE - DEMANDE DE VOYAGE
# ============================================

@bp.route('/api/public/trip-request', methods=['POST'])
def api_public_create_trip_request():
    """API PUBLIQUE: Soumet une demande de voyage depuis un formulaire public"""
    data = request.get_json()
    
    # Validation des champs requis
    required_fields = ['customerInfo', 'tripDetails']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    # On utilise toujours l'userId fixe de Sam pour les demandes publiques
    user_id = 'sam-user'
    firebase = get_firebase_service()
    
    try:
        request_data = {
            'source': 'public_form',
            'status': 'new',
            'customerInfo': data['customerInfo'],
            'tripDetails': data['tripDetails'],
            'sourceTrip': data.get('sourceTrip', None)  # Le slug du voyage qui a inspiré
        }
        
        request_id = firebase.create_trip_request(user_id, request_data)
        if request_id:
            return jsonify({
                'success': True,
                'message': 'Votre demande a bien été envoyée ! Nous vous contacterons prochainement.',
                'request_id': request_id
            })
        else:
            return jsonify({'error': 'Erreur lors de l\'envoi de la demande'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur création demande publique: {str(e)}")
        return jsonify({'error': 'Erreur lors de l\'envoi de la demande'}), 500


# ============================================
# API ROUTES - GESTION DES HÔTELS
# ============================================

@bp.route('/api/hotels', methods=['GET'])
@login_required
def api_get_hotels():
    """API: Récupère tous les hôtels de la banque"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        hotels = firebase.get_hotels(user_id)
        return jsonify({'success': True, 'hotels': hotels})
    except Exception as e:
        current_app.logger.error(f"Erreur récupération hôtels: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/search', methods=['GET'])
@login_required
def api_search_hotels():
    """API: Recherche des hôtels"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    query = request.args.get('q', '')
    city = request.args.get('city', None)
    
    try:
        hotels = firebase.search_hotels(user_id, query, city)
        return jsonify({'success': True, 'hotels': hotels})
    except Exception as e:
        current_app.logger.error(f"Erreur recherche hôtels: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels', methods=['POST'])
@login_required
def api_create_hotel():
    """API: Crée un nouvel hôtel"""
    user_id = get_current_user_id()
    data = request.get_json()
    
    # Validation des champs requis
    required_fields = ['name', 'city']
    for field in required_fields:
        if not data.get(field):
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    firebase = get_firebase_service()
    
    try:
        # Vérifie si l'hôtel existe déjà (par Google Place ID)
        google_place_id = data.get('googlePlaceId')
        if google_place_id:
            existing = firebase.get_hotel_by_google_place_id(user_id, google_place_id)
            if existing:
                return jsonify({
                    'error': 'Cet hôtel existe déjà dans la banque',
                    'existing_hotel': existing
                }), 409
        
        hotel_id = firebase.create_hotel(user_id, data)
        
        if hotel_id:
            hotel = firebase.get_hotel(user_id, hotel_id)
            return jsonify({'success': True, 'hotel_id': hotel_id, 'hotel': hotel})
        else:
            return jsonify({'error': 'Erreur lors de la création de l\'hôtel'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur création hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>', methods=['GET'])
@login_required
def api_get_hotel(hotel_id):
    """API: Récupère un hôtel spécifique"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        hotel = firebase.get_hotel(user_id, hotel_id)
        if hotel:
            # Récupère aussi les reviews
            reviews = firebase.get_hotel_reviews(user_id, hotel_id)
            hotel['reviews'] = reviews
            return jsonify({'success': True, 'hotel': hotel})
        else:
            return jsonify({'error': 'Hôtel non trouvé'}), 404
    except Exception as e:
        current_app.logger.error(f"Erreur récupération hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>', methods=['PUT'])
@login_required
def api_update_hotel(hotel_id):
    """API: Met à jour un hôtel"""
    user_id = get_current_user_id()
    data = request.get_json()
    firebase = get_firebase_service()
    
    try:
        success = firebase.update_hotel(user_id, hotel_id, data)
        if success:
            hotel = firebase.get_hotel(user_id, hotel_id)
            return jsonify({'success': True, 'hotel': hotel})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur MAJ hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>', methods=['DELETE'])
@login_required
def api_delete_hotel(hotel_id):
    """API: Supprime un hôtel"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        success = firebase.delete_hotel(user_id, hotel_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Impossible de supprimer l\'hôtel (peut-être utilisé dans des voyages)'}), 400
    except Exception as e:
        current_app.logger.error(f"Erreur suppression hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>/stats', methods=['GET'])
@login_required
def api_get_hotel_stats(hotel_id):
    """API: Récupère les statistiques d'un hôtel"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        hotel = firebase.get_hotel(user_id, hotel_id)
        if not hotel:
            return jsonify({'error': 'Hôtel non trouvé'}), 404
        
        stats = {
            'usageStats': hotel.get('usageStats', {}),
            'ratings': hotel.get('ratings', {}),
            'totalReviews': hotel.get('ratings', {}).get('totalRatings', 0)
        }
        
        return jsonify({'success': True, 'stats': stats})
    except Exception as e:
        current_app.logger.error(f"Erreur stats hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>/photos', methods=['GET'])
@login_required
def api_get_hotel_photos(hotel_id):
    """API: Récupère les photos d'un hôtel par son ID (PHASE 4)"""
    user_id = get_current_user_id()
    firebase = get_firebase_service()
    
    try:
        photos = firebase.get_hotel_photos_by_id(user_id, hotel_id)
        return jsonify({'success': True, 'photos': photos, 'count': len(photos)})
    except Exception as e:
        current_app.logger.error(f"Erreur récupération photos hôtel: {str(e)}")
        return jsonify({'error': str(e)}), 500


# ============================================
# API ROUTES - REVIEWS D'HÔTELS (CLIENT)
# ============================================

@bp.route('/api/hotels/<hotel_id>/reviews', methods=['GET'])
def api_get_hotel_reviews(hotel_id):
    """API: Récupère les reviews d'un hôtel (public)"""
    # Pour l'instant, on utilise le user_id fixe
    user_id = 'sam-user'
    firebase = get_firebase_service()
    
    try:
        reviews = firebase.get_hotel_reviews(user_id, hotel_id)
        return jsonify({'success': True, 'reviews': reviews})
    except Exception as e:
        current_app.logger.error(f"Erreur récupération reviews: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>/reviews', methods=['POST'])
def api_add_hotel_review(hotel_id):
    """API: Ajoute une review pour un hôtel (client)"""
    data = request.get_json()
    
    # Validation
    required_fields = ['customerId', 'customerName', 'rating']
    for field in required_fields:
        if field not in data:
            return jsonify({'error': f'Le champ {field} est requis'}), 400
    
    # Valide la note (1-5)
    rating = int(data.get('rating', 0))
    if rating < 1 or rating > 5:
        return jsonify({'error': 'La note doit être entre 1 et 5'}), 400
    
    # Pour l'instant, on utilise le user_id fixe
    user_id = 'sam-user'
    firebase = get_firebase_service()
    
    try:
        # Vérifie si le client a déjà noté cet hôtel
        existing = firebase.get_customer_review_for_hotel(user_id, hotel_id, data['customerId'])
        if existing:
            return jsonify({
                'error': 'Vous avez déjà évalué cet hôtel',
                'existing_review': existing
            }), 409
        
        review_id = firebase.add_hotel_review(user_id, hotel_id, data)
        
        if review_id:
            review = firebase.get_hotel_review(user_id, hotel_id, review_id)
            return jsonify({'success': True, 'review_id': review_id, 'review': review})
        else:
            return jsonify({'error': 'Erreur lors de l\'ajout de l\'avis'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur ajout review: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>/reviews/<review_id>', methods=['PUT'])
def api_update_hotel_review(hotel_id, review_id):
    """API: Met à jour une review"""
    data = request.get_json()
    
    # Pour l'instant, on utilise le user_id fixe
    user_id = 'sam-user'
    firebase = get_firebase_service()
    
    try:
        # Vérifie que la review existe et appartient au client
        review = firebase.get_hotel_review(user_id, hotel_id, review_id)
        if not review:
            return jsonify({'error': 'Avis non trouvé'}), 404
        
        # TODO: Vérifier que c'est bien le client qui a créé l'avis
        
        success = firebase.update_hotel_review(user_id, hotel_id, review_id, data)
        if success:
            updated_review = firebase.get_hotel_review(user_id, hotel_id, review_id)
            return jsonify({'success': True, 'review': updated_review})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur MAJ review: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/api/hotels/<hotel_id>/reviews/<review_id>', methods=['DELETE'])
def api_delete_hotel_review(hotel_id, review_id):
    """API: Supprime une review"""
    # Pour l'instant, on utilise le user_id fixe
    user_id = 'sam-user'
    firebase = get_firebase_service()
    
    try:
        # Vérifie que la review existe
        review = firebase.get_hotel_review(user_id, hotel_id, review_id)
        if not review:
            return jsonify({'error': 'Avis non trouvé'}), 404
        
        # TODO: Vérifier que c'est bien le client qui a créé l'avis
        
        success = firebase.delete_hotel_review(user_id, hotel_id, review_id)
        if success:
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression'}), 500
    except Exception as e:
        current_app.logger.error(f"Erreur suppression review: {str(e)}")
        return jsonify({'error': str(e)}), 500
