"""
Routes pour la gestion des hôtels via l'API RateHawk
"""
from flask import Blueprint, jsonify, request
from app.services.ratehawk_service import get_ratehawk_service
import logging

# Configuration du logger
logger = logging.getLogger(__name__)

# Création du blueprint
bp = Blueprint('hotels', __name__, url_prefix='/api/hotels')


@bp.route('/test-connection', methods=['GET'])
def test_connection():
    """
    Test de connexion à l'API RateHawk
    
    Returns:
        JSON: Statut de la connexion
        
    Example:
        GET /api/hotels/test-connection
    """
    try:
        service = get_ratehawk_service()
        result = service.test_connection()
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 503  # Service Unavailable
            
    except Exception as e:
        logger.error(f"❌ Error in test_connection: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to initialize RateHawk service: {str(e)}'
        }), 500


@bp.route('/test-hotel/<hotel_id>', methods=['GET'])
def test_hotel(hotel_id):
    """
    Récupère les informations d'un hôtel spécifique (pour tests)
    
    Args:
        hotel_id (str): ID de l'hôtel (ex: test_hotel_do_not_book)
    
    Returns:
        JSON: Informations de l'hôtel
        
    Example:
        GET /api/hotels/test-hotel/test_hotel_do_not_book
    """
    try:
        service = get_ratehawk_service()
        result = service.get_hotel_info(hotel_id)
        
        if result['status'] == 'success':
            return jsonify(result), 200
        elif result['status'] == 'not_found':
            return jsonify(result), 404
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"❌ Error fetching hotel {hotel_id}: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@bp.route('/search/region', methods=['POST'])
def search_by_region():
    """
    Recherche d'hôtels dans une région
    
    Request body (JSON):
        {
            "region_id": "1234",
            "checkin": "2025-06-01",
            "checkout": "2025-06-02",
            "guests": [{"adults": 2}],
            "currency": "EUR"
        }
    
    Returns:
        JSON: Liste des hôtels disponibles
        
    Example:
        POST /api/hotels/search/region
    """
    try:
        data = request.get_json()
        
        # Validation des paramètres requis
        required_fields = ['region_id', 'checkin', 'checkout', 'guests']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        service = get_ratehawk_service()
        result = service.search_hotels_by_region(
            region_id=data['region_id'],
            checkin=data['checkin'],
            checkout=data['checkout'],
            guests=data['guests'],
            currency=data.get('currency', 'EUR')
        )
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"❌ Error in search_by_region: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@bp.route('/hotel/<hotel_id>/page', methods=['POST'])
def get_hotel_page(hotel_id):
    """
    Récupère la page détaillée d'un hôtel avec tous les tarifs
    
    Args:
        hotel_id (str): ID de l'hôtel
    
    Request body (JSON):
        {
            "checkin": "2025-06-01",
            "checkout": "2025-06-02",
            "guests": [{"adults": 2}],
            "currency": "EUR"
        }
    
    Returns:
        JSON: Page hôtel complète avec tarifs
        
    Example:
        POST /api/hotels/8473727/page
    """
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['checkin', 'checkout', 'guests']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        service = get_ratehawk_service()
        result = service.get_hotel_page(
            hotel_id=hotel_id,
            checkin=data['checkin'],
            checkout=data['checkout'],
            guests=data['guests'],
            currency=data.get('currency', 'EUR')
        )
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"❌ Error getting hotel page: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@bp.route('/prebook', methods=['POST'])
def prebook_rate():
    """
    Pré-réservation d'un tarif (vérification de disponibilité)
    
    Request body (JSON):
        {
            "rate_hash": "...",
            "rate_key": "...",
            "price_increase_percent": 0
        }
    
    Returns:
        JSON: Résultat de la pré-réservation
        
    Example:
        POST /api/hotels/prebook
    """
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['rate_hash', 'rate_key']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        service = get_ratehawk_service()
        result = service.prebook_rate(
            rate_hash=data['rate_hash'],
            rate_key=data['rate_key'],
            price_increase_percent=data.get('price_increase_percent', 0)
        )
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"❌ Error prebooking rate: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@bp.route('/suggest', methods=['GET'])
def suggest_location():
    """
    Autocomplétion DYNAMIQUE pour la recherche de villes/régions/hôtels
    
    Utilise 100% l'API RateHawk - AUCUN HARDCODE
    
    Query params:
        q (str): Texte de recherche
        lang (str): Langue (défaut: fr)
    
    Returns:
        JSON: Liste de suggestions (régions + hôtels)
        
    Example:
        GET /api/hotels/suggest?q=Gap
    """
    try:
        query = request.args.get('q', '').strip()
        language = request.args.get('lang', 'fr')
        
        if not query or len(query) < 2:
            return jsonify({
                'status': 'error',
                'message': 'Query must be at least 2 characters',
                'suggestions': []
            }), 400
        
        # Appel 100% DYNAMIQUE à l'API RateHawk
        service = get_ratehawk_service()
        result = service.suggest_location(query, language)
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"❌ Error in suggest_location: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'suggestions': []
        }), 500


@bp.route('/search-moto-friendly', methods=['POST'])
def search_moto_friendly():
    """
    Recherche d'hôtels avec filtres moto appliqués automatiquement
    
    Request body (JSON):
        {
            "city_or_region": "Paris" ou region_id,
            "checkin": "2025-06-01",
            "checkout": "2025-06-02",
            "guests": [{"adults": 2}],
            "min_rating": 8.0,
            "currency": "EUR"
        }
    
    Returns:
        JSON: Liste des hôtels filtrés avec badges et statistiques
        
    Example:
        POST /api/hotels/search-moto-friendly
    """
    try:
        data = request.get_json()
        
        # Validation des paramètres requis
        required_fields = ['city_or_region', 'checkin', 'checkout', 'guests']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'status': 'error',
                    'message': f'Missing required field: {field}'
                }), 400
        
        service = get_ratehawk_service()
        result = service.search_hotels_with_moto_filters(
            city_or_region=data['city_or_region'],
            checkin=data['checkin'],
            checkout=data['checkout'],
            guests=data['guests'],
            min_rating=data.get('min_rating', 8.0),
            currency=data.get('currency', 'EUR')
        )
        
        if result['status'] == 'success':
            return jsonify(result), 200
        else:
            return jsonify(result), 500
            
    except Exception as e:
        logger.error(f"❌ Error in search_moto_friendly: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@bp.route('/health', methods=['GET'])
def health_check():
    """
    Health check endpoint pour vérifier que le service est opérationnel
    
    Returns:
        JSON: Statut du service
        
    Example:
        GET /api/hotels/health
    """
    try:
        # Vérifier que le service peut être initialisé
        service = get_ratehawk_service()
        
        return jsonify({
            'status': 'healthy',
            'service': 'RateHawk Hotels API',
            'version': '1.0.0',
            'environment': 'sandbox' if 'sandbox' in service.base_url else 'production'
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 503
