"""
Routes pour la gestion des partenaires
"""
from flask import Blueprint, render_template, request, jsonify, session, redirect, url_for
from app.services.firebase_service import FirebaseService
from app.config import Config

bp = Blueprint('partners', __name__, url_prefix='/admin')

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

@bp.route('/partners')
def list_partners():
    """Page de liste des partenaires"""
    check = require_admin()
    if check:
        return check
    
    return render_template('admin/partners.html')

# ============================================
# API
# ============================================

@bp.route('/api/partners', methods=['GET'])
def get_partners():
    """Récupère la liste des partenaires"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        firebase = FirebaseService(Config.APP_ID)
        
        active_only = request.args.get('active_only', 'true').lower() == 'true'
        partners = firebase.get_partners(active_only=active_only)
        
        return jsonify({
            'success': True,
            'partners': partners
        })
    except Exception as e:
        print(f"Erreur lors de la récupération des partenaires: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/partners/<partner_id>', methods=['GET'])
def get_partner(partner_id):
    """Récupère un partenaire spécifique"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        firebase = FirebaseService(Config.APP_ID)
        partner = firebase.get_partner(partner_id)
        
        if not partner:
            return jsonify({
                'success': False,
                'error': 'Partenaire non trouvé'
            }), 404
        
        return jsonify({
            'success': True,
            'partner': partner
        })
    except Exception as e:
        print(f"Erreur lors de la récupération du partenaire: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/partners', methods=['POST'])
def create_partner():
    """Crée un nouveau partenaire"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'slug']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Champ requis manquant: {field}'
                }), 400
        
        firebase = FirebaseService(Config.APP_ID)
        
        # Prépare les données du partenaire
        partner_data = {
            'partnerId': data.get('slug'),  # Utilise le slug comme ID
            'name': data.get('name'),
            'slug': data.get('slug'),
            'description': data.get('description', ''),
            'logo': data.get('logo', ''),
            'website': data.get('website', ''),
            'color': data.get('color', '#3B82F6'),
            'badgeIcon': data.get('badgeIcon', ''),
            'isActive': data.get('isActive', True),
            'displayConfig': data.get('displayConfig', {})
        }
        
        partner_id = firebase.create_partner(partner_data)
        
        if partner_id:
            return jsonify({
                'success': True,
                'partnerId': partner_id,
                'message': 'Partenaire créé avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la création du partenaire'
            }), 500
            
    except Exception as e:
        print(f"Erreur lors de la création du partenaire: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/partners/<partner_id>', methods=['PUT'])
def update_partner(partner_id):
    """Met à jour un partenaire"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        data = request.get_json()
        
        firebase = FirebaseService(Config.APP_ID)
        
        # Prépare les données de mise à jour
        update_data = {}
        
        allowed_fields = ['name', 'description', 'logo', 'website', 'color', 
                         'badgeIcon', 'isActive', 'displayConfig']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        if not update_data:
            return jsonify({
                'success': False,
                'error': 'Aucune donnée à mettre à jour'
            }), 400
        
        success = firebase.update_partner(partner_id, update_data)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Partenaire mis à jour avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la mise à jour du partenaire'
            }), 500
            
    except Exception as e:
        print(f"Erreur lors de la mise à jour du partenaire: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@bp.route('/api/partners/<partner_id>', methods=['DELETE'])
def delete_partner(partner_id):
    """Supprime un partenaire"""
    check = require_admin()
    if check:
        return jsonify({'error': 'Non autorisé'}), 401
    
    try:
        firebase = FirebaseService(Config.APP_ID)
        
        success = firebase.delete_partner(partner_id)
        
        if success:
            return jsonify({
                'success': True,
                'message': 'Partenaire supprimé avec succès'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Erreur lors de la suppression du partenaire'
            }), 500
            
    except Exception as e:
        print(f"Erreur lors de la suppression du partenaire: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500
