"""
Routes pour la partie publique (Teaser des voyages)
"""
from flask import Blueprint, render_template, abort, current_app, request, jsonify, url_for
import json
import uuid
import random
import string
from datetime import datetime
from app.services.firebase_service import FirebaseService

bp = Blueprint('public', __name__)

def generate_join_code():
    """Génère un code de groupe unique (ex: VOYAGE-X9YH)"""
    chars = string.ascii_uppercase + string.digits
    suffix = ''.join(random.choices(chars, k=4))
    return f"TRIP-{suffix}" 

@bp.route('/voyage/<slug>')
def view_published_trip(slug):
    """
    Affiche un voyage publié (Page Teaser)
    """
    try:
        firebase_service = FirebaseService()
        
        # Récupérer le voyage publié depuis Firebase
        trip_data = firebase_service.get_published_trip(slug)
        
        if not trip_data:
            abort(404)
        
        # Vérifier si le voyage est actif (publié)
        if not trip_data.get('isActive', False):
            # En mode dev/admin on pourrait vouloir le voir quand même, 
            # mais pour le public c'est caché.
            abort(404)
        
        # Charger les partenaires
        partner_ids = trip_data.get('partnerIds', [])
        partners = []
        partner_theme = {
            'primary_color': None,
            'secondary_color': None
        }
        
        if partner_ids:
            for partner_id in partner_ids:
                partner = firebase_service.get_partner(partner_id)
                if partner and partner.get('isActive', True):
                    partners.append(partner)
            
            # Utilise le premier partenaire pour le thème
            if partners:
                first_partner = partners[0]
                partner_theme = {
                    'primary_color': first_partner.get('color', '#667eea'),
                    'secondary_color': first_partner.get('displayConfig', {}).get('secondaryColor', '#764ba2')
                }
        
        # Enrichir les jours avec les POIs
        days = trip_data.get('days', [])
        for day in days:
            day_pois = []
            poi_ids = day.get('pois', [])
            
            if poi_ids:
                category_icons = {
                    'monument': '🏰',
                    'nature': '🌲',
                    'museum': '🎨',
                    'activity': '⚡',
                    'viewpoint': '🔭',
                    'other': '📍'
                }
                
                for poi_id in poi_ids:
                    poi = firebase_service.get_poi(poi_id)
                    if poi:
                        day_pois.append({
                            'id': poi.get('id'),
                            'name': poi.get('name'),
                            'category': poi.get('category'),
                            'icon': category_icons.get(poi.get('category', 'other'), '📍'),
                            'description': poi.get('description', ''),
                            'website': poi.get('website', '')
                        })
            
            day['pois'] = day_pois
        
        total_distance = sum(day.get('distance', 0) for day in days)
        
        trip = {
            'title': trip_data.get('title', ''),
            'description': trip_data.get('description', ''), 
            'pricePerPerson': trip_data.get('pricePerPerson', 0),
            'days': days,
            'slug': slug,
            'coverImage': trip_data.get('coverImage', ''),
            'gallery': trip_data.get('gallery', []),
            'mapImage': trip_data.get('mapImage', ''), # Static map image
            'teaserText': trip_data.get('teaserText', '') 
        }
        
        trip_json = json.dumps(trip)
        google_maps_key = current_app.config.get('GOOGLE_MAPS_API_KEY', '')
        
        return render_template(
            'public/trip.html',
            trip=trip,
            trip_json=trip_json,
            total_distance=total_distance,
            google_maps_key=google_maps_key,
            partners=partners,
            partner_theme=partner_theme
        )
        
    except Exception as e:
        current_app.logger.error(f"Error loading published trip {slug}: {str(e)}")
        abort(404)

@bp.route('/voyage/<slug>/book')
def booking_page(slug):
    """Page de choix de réservation"""
    firebase_service = FirebaseService()
    trip_data = firebase_service.get_published_trip(slug)
    if not trip_data or not trip_data.get('isActive', False):
        abort(404)

    trip = {
        'title': trip_data.get('title'),
        'slug': slug
    }
    return render_template('public/booking.html', trip=trip)

@bp.route('/voyage/<slug>/checkout', methods=['POST'])
def create_checkout_session(slug):
    """Crée une session Stripe Checkout et une réservation Pending"""
    try:
        from app.services.stripe_service import StripeService
        from app.models.booking import TripBooking
        
        firebase_service = FirebaseService()
        stripe_service = StripeService()
        
        trip_data = firebase_service.get_published_trip(slug)
        if not trip_data or not trip_data.get('isActive', False):
            return jsonify({'error': 'Voyage non disponible'}), 404
        
        data = request.get_json()
        
        booking_type = data.get('booking_type', 'individual')
        price_per_person = trip_data.get('pricePerPerson', 0)
        
        # Common Participant Data
        participant_info = {
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'email': data.get('email'),
            'phone': data.get('phone')
        }
        
        # === SCENARIO 1: JOIN EXISTING GROUP ===
        if booking_type == 'join_group':
            join_code = data.get('join_code')
            existing_booking_dict = firebase_service.find_booking_by_join_code(join_code)
            
            if not existing_booking_dict:
                return jsonify({'error': 'Code Groupe invalide'}), 400
                
            booking_id = existing_booking_dict.get('id')
            
            # Check capacity (Optional logic)
            # if existing_booking.current >= existing_booking.total: error
            
            # Create Stripe Session for THIS participant only
            session_data = stripe_service.create_checkout_session(
                trip_slug=slug,
                trip_title=f"{trip_data.get('title')} (Rejoindre Groupe)",
                price_per_person=price_per_person,
                quantity=1, # Paying for self
                customer_email=participant_info['email'],
                metadata={
                    'booking_id': booking_id,
                    'action': 'join_group',
                    'participant_first_name': participant_info['first_name'],
                    'participant_last_name': participant_info['last_name'],
                    'participant_phone': participant_info['phone']
                }
            )
            return jsonify({'checkout_url': session_data['checkout_url']})

        # === SCENARIO 2: NEW BOOKING (INDIVIDUAL or LEADER) ===
        
        payment_mode = data.get('payment_mode', 'all')
        quantity_to_pay = 1
        total_pax = 1
        
        if booking_type == 'individual':
            quantity_to_pay = int(data.get('quantity', 1))
            total_pax = quantity_to_pay
            # Individual is standard payment
        
        elif booking_type == 'group_leader':
            total_pax = int(data.get('total_pax', 2))
            if payment_mode == 'all':
                quantity_to_pay = total_pax
            else:
                quantity_to_pay = 1 # Leader pays for self only
        
        # Calculate Total Amount for this initial transaction
        total_amount = price_per_person * quantity_to_pay
        
        # Create Pending Booking
        booking_id = str(uuid.uuid4())
        join_code = generate_join_code() if booking_type == 'group_leader' else ''
        
        new_booking = TripBooking(
            booking_id=booking_id,
            trip_template_id=trip_data.get('originalTripId'),
            organizer_user_id=None, # Public booking (maybe create a shadow user or store in leader_details)
            start_date=None, # To be defined? Or fixed dates? Assumed open for now
            end_date=None,
            total_participants=total_pax,
            total_amount=total_amount, # Amount for THIS transaction or Total Trip? Best to store Total Trip Value
            payment_status='pending',
            status='pending',
            join_code=join_code,
            leader_details=participant_info
        )
        
        # Convert to dict and save
        booking_dict = new_booking.to_dict()
        booking_dict['type'] = booking_type
        booking_dict['paymentMode'] = payment_mode
        booking_dict['tripTitle'] = trip_data.get('title')
        booking_dict['tripSlug'] = slug
        
        # We save it to 'bookings' collection
        # Note: We don't have a UserId yet. We can use the 'booking_id' as document ID.
        firebase_service.db.collection(f'artifacts/{firebase_service.app_id}/bookings').document(booking_id).set(booking_dict)
        
        # Create Stripe Session
        session_data = stripe_service.create_checkout_session(
            trip_slug=slug,
            trip_title=trip_data.get('title'),
            price_per_person=price_per_person,
            quantity=quantity_to_pay,
            customer_email=participant_info['email'],
            metadata={
                'booking_id': booking_id,
                'action': 'create_booking',
                'booking_type': booking_type
            }
        )
        
        # Update booking with session ID
        firebase_service.db.collection(f'artifacts/{firebase_service.app_id}/bookings').document(booking_id).update({
            'stripeSessionId': session_data['session_id']
        })
        
        return jsonify({
            'success': True,
            'checkout_url': session_data['checkout_url']
        })
        
    except Exception as e:
        current_app.logger.error(f"Error creating checkout session: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/voyage/<slug>/success')
def payment_success(slug):
    session_id = request.args.get('session_id')
    
    firebase_service = FirebaseService()
    trip = firebase_service.get_published_trip(slug)
    
    booking = None
    if session_id:
        try:
            # Find booking associated with this session
            bookings_ref = firebase_service.db.collection(f'artifacts/{firebase_service.app_id}/bookings')
            query = bookings_ref.where('stripeSessionId', '==', session_id).limit(1).stream()
            
            for b in query:
                booking = b.to_dict()
                booking['id'] = b.id
                
        except Exception as e:
            current_app.logger.error(f"Error fetching booking on success: {e}")
            
    return render_template('public/success.html', trip=trip, booking=booking)

@bp.route('/voyage/<slug>/cancel')
def payment_cancel(slug):
    return render_template('public/cancel.html', slug=slug)
