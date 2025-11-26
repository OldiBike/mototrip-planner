"""
Routes pour la gestion des POIs (Points d'Intérêt)
"""
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from app.services.firebase_service import FirebaseService
from app.config import Config

bp = Blueprint('pois', __name__, url_prefix='/admin')

def get_current_user_id():
    """Retourne l'userId actuel (fixe pour l'admin)"""
    return 'sam-user'

def require_admin():
    """Vérifie que l'utilisateur est connecté"""
    if not session.get('admin_logged_in'):
        return redirect(url_for('admin.login'))
    return None

# ============================================
# PAGES
# ============================================

@bp.route('/pois')
def list_pois():
    """Page de liste des POIs"""
    check = require_admin()
    if check:
        return check
    
    return render_template('admin/pois.html')

# ============================================
# API
# ============================================

@bp.route('/api/pois', methods=['GET'])
def get_pois():
    """Récupère la liste des POIs avec filtres optionnels"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        firebase = FirebaseService(Config.APP_ID)
        
        # Filtres optionnels
        partner_ids = request.args.getlist('partners')
        city = request.args.get('city')
        category = request.args.get('category')
        
        pois = firebase.get_pois(
            partner_ids=partner_ids if partner_ids else None,
            city=city,
            category=category
        )
        
        return jsonify({
            'success': True,
            'pois': pois
        })
    except Exception as e:
        print(f"Erreur lors de la récupération des POIs: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/pois/<poi_id>', methods=['GET'])
def get_poi(poi_id):
    """Récupère un POI spécifique"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        firebase = FirebaseService(Config.APP_ID)
        poi = firebase.get_poi(poi_id)
        
        if not poi:
            return jsonify({
                'success': False,
                'error': 'POI non trouvé'
            }), 404
        
        return jsonify({
            'success': True,
            'poi': poi
        })
    except Exception as e:
        print(f"Erreur lors de la récupération du POI: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/pois', methods=['POST'])
def create_poi():
    """Crée un nouveau POI avec upload de photos"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        # Récupère les données du formulaire (FormData)
        name = request.form.get('name')
        city = request.form.get('city')
        category = request.form.get('category')
        
        # Validation
        if not name or not city or not category:
            return jsonify({
                'success': False,
                'error': 'Champs requis manquants: name, city, category'
            }), 400
        
        firebase = FirebaseService(Config.APP_ID)
        
        # Parse partnerIds depuis JSON string
        import json
        partner_ids_str = request.form.get('partnerIds', '[]')
        partner_ids = json.loads(partner_ids_str) if partner_ids_str else []
        
        # Prépare les données du POI
        poi_data = {
            'name': name,
            'city': city,
            'category': category,
            'coordinates': {},  # Sera rempli plus tard avec géolocalisation
            'address': request.form.get('address', ''),
            'description': request.form.get('description', ''),
            'website': request.form.get('website', ''),
            'phone': request.form.get('phone', ''),
            'openingHours': request.form.get('openingHours', ''),
            'entryFee': request.form.get('entryFee'),
            'partnerIds': partner_ids,
            'photos': []
        }
        
        # Crée le POI d'abord
        poi_id = firebase.create_poi(poi_data)
        
        if not poi_id:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la création du POI'
            }), 500
        
        # Upload des photos si présentes
        photos = request.files.getlist('photos')
        uploaded_photos = []
        
        if photos:
            from datetime import datetime
            
            for photo in photos:
                if photo and photo.filename:
                    # Génère un nom de fichier unique
                    timestamp = int(datetime.now().timestamp() * 1000)
                    ext = photo.filename.rsplit('.', 1)[1].lower() if '.' in photo.filename else 'jpg'
                    filename = f"poi_{poi_id}_{timestamp}.{ext}"
                    storage_path = f"pois/{poi_id}/{filename}"
                    
                    # Upload vers Firebase Storage
                    photo_bytes = photo.read()
                    photo_url = firebase.upload_file_from_bytes(
                        photo_bytes,
                        storage_path,
                        content_type=photo.content_type or 'image/jpeg'
                    )
                    
                    if photo_url:
                        uploaded_photos.append(photo_url)
        
        # Met à jour le POI avec les URLs des photos
        if uploaded_photos:
            firebase.update_poi(poi_id, {'photos': uploaded_photos})
        
        return jsonify({
            'success': True,
            'poiId': poi_id,
            'message': 'POI créé avec succès',
            'photos_uploaded': len(uploaded_photos)
        })
            
    except Exception as e:
        print(f"Erreur lors de la création du POI: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/pois/<poi_id>', methods=['PUT'])
def update_poi(poi_id):
    """Met à jour un POI"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        data = request.get_json()
        
        firebase = FirebaseService(Config.APP_ID)
        
        # Prépare les données de mise à jour
        update_data = {}
        
        allowed_fields = ['name', 'city', 'category', 'coordinates', 'address', 
                         'description', 'website', 'phone', 'openingHours', 
                         'entryFee', 'partnerIds', 'photos']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({
                'success': False,
                'error': 'Aucune donnée à mettre à jour'
            }), 400
        
        success = firebase.update_poi(poi_id, update_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'POI mis à jour avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la mise à jour du POI'
            }), 500
            
    except Exception as e:
        print(f"Erreur lors de la mise à jour du POI: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/pois/<poi_id>', methods=['DELETE'])
def delete_poi(poi_id):
    """Supprime un POI"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        firebase = FirebaseService(Config.APP_ID)
        
        success = firebase.delete_poi(poi_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'POI supprimé avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la suppression du POI'
            }), 500
            
    except Exception as e:
        print(f"Erreur lors de la suppression du POI: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/pois/near', methods=['GET'])
def get_pois_near():
    """Récupère les POIs à proximité d'une ville"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        city = request.args.get('city')
        if not city:
            return jsonify({
                'success': False,
                'error': 'Paramètre city requis'
            }), 400
        
        radius_km = int(request.args.get('radius', 20))
        partner_ids = request.args.getlist('partners')
        
        firebase = FirebaseService(Config.APP_ID)
        
        pois = firebase.get_pois_near(
            city=city,
            radius_km=radius_km,
            partner_ids=partner_ids if partner_ids else None
        )
        
        return jsonify({
            'success': True,
            'pois': pois
        })
    except Exception as e:
        print(f"Erreur lors de la recherche de POIs à proximité: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
