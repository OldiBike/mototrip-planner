"""
Routes pour les clients (visualisation des voyages publiés)
"""
from flask import Blueprint, render_template, abort, current_app, request, jsonify
import json

from app.services.firebase_service import FirebaseService

bp = Blueprint('client', __name__)

@bp.route('/voyageperso/<slug>')
def view_published_trip(slug):
    """
    Affiche un voyage publié pour les clients
    
    Args:
        slug: Le slug unique du voyage publié (URL-friendly)
    
    Returns:
        Template HTML avec les détails du voyage
    """
    try:
        firebase_service = FirebaseService()
        
        # Récupérer le voyage publié depuis Firebase
        trip_data = firebase_service.get_published_trip(slug)
        
        if not trip_data:
            abort(404)
        
        # Vérifier si le voyage est actif
        if not trip_data.get('isActive', False):
            abort(404)  # Ne pas afficher les voyages inactifs
        
        # Calculer la distance totale
        total_distance = sum(
            day.get('distance', 0) 
            for day in trip_data.get('days', [])
        )
        
        # Préparer les données pour le template
        trip = {
            'title': trip_data.get('title', ''),
            'description': trip_data.get('description', ''),
            'pricePerPerson': trip_data.get('pricePerPerson', 0),
            'days': trip_data.get('days', []),
            'slug': slug
        }
        
        # Convertir les données en JSON pour JavaScript
        trip_json = json.dumps(trip)
        
        # Récupérer la clé API Google Maps depuis la config
        google_maps_key = current_app.config.get('GOOGLE_MAPS_API_KEY', '')
        
        return render_template(
            'client/trip.html',
            trip=trip,
            trip_json=trip_json,
            total_distance=total_distance,
            google_maps_key=google_maps_key
        )
        
    except Exception as e:
        current_app.logger.error(f"Error loading published trip {slug}: {str(e)}")
        abort(404)


@bp.route('/voyages')
def list_published_trips():
    """
    Liste tous les voyages publiés et actifs
    (Peut être implémenté plus tard si besoin d'une page catalogue)
    """
    try:
        firebase_service = FirebaseService()
        
        # Récupérer tous les voyages publiés
        all_trips = firebase_service.get_all_published_trips()
        
        # Filtrer uniquement les voyages actifs
        active_trips = [
            trip for trip in all_trips 
            if trip.get('isActive', False)
        ]
        
        return render_template(
            'client/trips_list.html',
            trips=active_trips
        )
        
    except Exception as e:
        current_app.logger.error(f"Error loading published trips: {str(e)}")
        return render_template('client/trips_list.html', trips=[])


@bp.route('/voyageperso/<slug>/checkout', methods=['POST'])
def create_checkout_session(slug):
    """Crée une session Stripe Checkout pour un voyage"""
    try:
        from app.services.stripe_service import StripeService
        from app.services.firebase_service import FirebaseService
        
        firebase_service = FirebaseService()
        
        # Récupère le voyage publié
        trip_data = firebase_service.get_published_trip(slug)
        
        if not trip_data or not trip_data.get('isActive', False):
            return jsonify({'error': 'Voyage non disponible'}), 404
        
        # Récupère les données du formulaire
        data = request.get_json()
        quantity = int(data.get('quantity', 1))
        customer_email = data.get('email')
        
        # Crée la session Stripe
        stripe_service = StripeService()
        session_data = stripe_service.create_checkout_session(
            trip_slug=slug,
            trip_title=trip_data.get('title'),
            price_per_person=trip_data.get('pricePerPerson', 0),
            quantity=quantity,
            customer_email=customer_email
        )
        
        return jsonify({
            'success': True,
            'checkout_url': session_data['checkout_url']
        })
        
    except Exception as e:
        current_app.logger.error(f"Error creating checkout session: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/voyageperso/<slug>/success')
def payment_success(slug):
    """Page de confirmation après paiement réussi"""
    session_id = request.args.get('session_id')
    
    if not session_id:
        abort(400)
    
    try:
        from app.services.stripe_service import StripeService
        from app.services.firebase_service import FirebaseService
        
        stripe_service = StripeService()
        firebase_service = FirebaseService()
        
        # Récupère les détails de la session
        session = stripe_service.retrieve_session(session_id)
        
        # Récupère le voyage
        trip_data = firebase_service.get_published_trip(slug)
        
        if not trip_data:
            abort(404)
        
        return render_template(
            'client/success.html',
            trip=trip_data,
            session=session
        )
        
    except Exception as e:
        current_app.logger.error(f"Error on success page: {str(e)}")
        abort(500)


@bp.route('/voyageperso/<slug>/cancel')
def payment_cancel(slug):
    """Page affichée si le paiement est annulé"""
    try:
        from app.services.firebase_service import FirebaseService
        
        firebase_service = FirebaseService()
        trip_data = firebase_service.get_published_trip(slug)
        
        if not trip_data:
            abort(404)
        
        return render_template(
            'client/cancel.html',
            trip=trip_data
        )
        
    except Exception as e:
        current_app.logger.error(f"Error on cancel page: {str(e)}")
        abort(500)


@bp.errorhandler(404)
def not_found(error):
    """Gestion des erreurs 404 pour les routes client"""
    return render_template('errors/404.html'), 404
