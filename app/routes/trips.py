"""
Routes pour les voyages publics (vitrine)
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
import uuid

from app.services import FirebaseService, StripeService
from app.config import Config

# Theme Configuration
THEMES = {
    'yellow': {'main': '#F59E0B', 'light': '#FBBF24', 'dark': '#D97706', 'glow': 'rgba(245, 158, 11, 0.5)'},
    'red': {'main': '#DC2626', 'light': '#EF4444', 'dark': '#B91C1C', 'glow': 'rgba(220, 38, 38, 0.5)'},
    'blue_light': {'main': '#0EA5E9', 'light': '#38BDF8', 'dark': '#0284C7', 'glow': 'rgba(14, 165, 233, 0.5)'},
    'blue_dark': {'main': '#2563EB', 'light': '#3B82F6', 'dark': '#1D4ED8', 'glow': 'rgba(37, 99, 235, 0.5)'},
    'green': {'main': '#16A34A', 'light': '#22C55E', 'dark': '#15803D', 'glow': 'rgba(22, 163, 74, 0.5)'},
    'pink': {'main': '#DB2777', 'light': '#EC4899', 'dark': '#BE185D', 'glow': 'rgba(219, 39, 119, 0.5)'}
}

bp = Blueprint('trips', __name__, url_prefix='/voyages')


@bp.route('/')
def list_trips():
    """Liste des voyages publiés (teaser)"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère tous les voyages publiés
    trips = firebase.get_all_published_trips()
    
    # Incrémente les vues (optionnel, pour stats)
    # for trip in trips:
    #     firebase.increment_trip_views(trip['slug'])
    
    return render_template('trips/list.html', trips=trips)


@bp.route('/<slug>')
def trip_detail(slug):
    """Détail d'un voyage (teaser - sans infos complètes)"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère le voyage publié
    trip = firebase.get_published_trip(slug)
    
    if not trip:
        flash('Voyage introuvable.', 'error')
        return redirect(url_for('trips.list_trips'))
    
    # Incrémente le compteur de vues
    firebase.increment_trip_views(slug)
    
    # Resolve Theme
    theme_key = trip.get('themeColor', 'yellow')
    theme = THEMES.get(theme_key, THEMES['yellow'])

    return render_template('trips/detail_v2.html', trip=trip, theme=theme)


@bp.route('/<slug>/book', methods=['POST'])
def book_trip(slug):
    """Formulaire de réservation → Création session Stripe"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère le voyage
    trip = firebase.get_published_trip(slug)
    
    if not trip:
        return jsonify({'error': 'Voyage introuvable'}), 404
    
    # Récupère les données du formulaire
    email = request.form.get('email', '').strip().lower()
    first_name = request.form.get('first_name', '').strip()
    last_name = request.form.get('last_name', '').strip()
    nb_pilots = int(request.form.get('nb_pilots', 1))
    nb_passengers = int(request.form.get('nb_passengers', 0))
    start_date = request.form.get('start_date', '')
    # End date removed as per request
    
    nb_participants = nb_pilots + nb_passengers

    # Validation
    if not all([email, first_name, last_name, nb_pilots, start_date]):
        flash('Veuillez remplir tous les champs obligatoires.', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    if nb_pilots < 1 or nb_participants > 20:
        flash('Nombre de participants invalide (Min 1 pilote, Max 20 total).', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    # Options Assurances
    insurance_weather = request.form.get('insurance_weather') == 'on'
    insurance_cancellation = request.form.get('insurance_cancellation') == 'on'
    
    # Calcul des montants
    price_per_person = trip.get('pricePerPerson', 0)
    total_amount = price_per_person * nb_participants
    
    # Note: On pourrait ajouter le coût des assurances ici si défini
    # if insurance_weather: total_amount += 40 * nb_participants
    
    deposit_type = trip.get('depositType', 'fixed_per_person')
    deposit_value = float(trip.get('depositValue', 150))
    
    deposit_amount = 0
    if deposit_type == 'percentage':
        deposit_amount = total_amount * (deposit_value / 100)
    elif deposit_type == 'fixed_total':
        deposit_amount = deposit_value
    else: # fixed_per_person
        deposit_amount = deposit_value * nb_participants
        
    remaining_amount = total_amount - deposit_amount
    
    # Création d'une pré-réservation (user temporaire)
    # Crée d'abord un user temporaire
    user_id = str(uuid.uuid4())
    user_data = {
        'email': email,
        'firstName': first_name,
        'lastName': last_name,
        'name': f"{first_name} {last_name}".strip(),
        'phone': '',
        'passwordHash': None,  # Pas de mot de passe encore
        'role': 'customer',
        'isActive': False,  # Inactif tant que pas finalisé
        'emailVerified': False,
        'createdAt': datetime.now().isoformat()
    }
    
    user_id = firebase.create_user(user_data)
    
    if not user_id:
        flash('Erreur lors de la création de votre compte.', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    # Crée la réservation
    access_token = str(uuid.uuid4())
    
    # Calculate end date based on duration
    # We don't have trip duration easily accessible here as explicit days count without parsing
    # But usually trip has 'days' list. Let's try to infer if needed or just leave empty.
    # User said "days are fixed", so start date implies end date.
    
    booking_data = {
        'tripTemplateId': slug,
        'organizerUserId': user_id,
        'startDate': start_date,
        # 'endDate': end_date, # Removed from form
        'totalParticipants': nb_participants,
        'pilotsCount': nb_pilots,
        'passengersCount': nb_passengers,
        'currentParticipants': 1,  # Seulement l'organisateur pour l'instant
        'totalAmount': total_amount,
        'depositAmount': deposit_amount,
        'remainingAmount': remaining_amount,
        'paymentStatus': 'pending', 
        'leaderDetails': {
            'email': email,
            'firstName': first_name,
            'lastName': last_name,
            'phone': ''
        },
        'status': 'pending_deposit',  # En attente de l'acompte
        'createdAt': datetime.now().isoformat(),
        'accessToken': access_token,
        'insuranceWeather': insurance_weather,
        'insuranceCancellation': insurance_cancellation,
        'options': {
            'insuranceWeather': insurance_weather,
            'insuranceCancellation': insurance_cancellation
        }
    }
    
    booking_id = firebase.create_booking(booking_data)
    
    if not booking_id:
        flash('Erreur lors de la création de la réservation.', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    # Crée le participant organisateur
    participant_data = {
        'bookingId': booking_id,
        'userId': user_id,
        'firstName': first_name,
        'lastName': last_name,
        'email': email,
        'phone': '',
        'role': 'organizer',
        'riderType': 'pilot',  # Par défaut pilote
        'invitationToken': str(uuid.uuid4()),
        'invitationSentAt': None,
        'accountCreated': False,
        'joinedAt': None,
        'addedBy': 'self',
        'addedByUserId': user_id
    }
    
    firebase.create_participant(booking_id, participant_data)
    
    # Création de la session Stripe Checkout
    try:
        stripe_service = StripeService()
        
        # Prépare les métadonnées
        metadata = {
            'booking_id': booking_id,
            'user_id': user_id,
            'trip_slug': slug,
            'nb_participants': str(nb_participants),
            'total_amount': str(total_amount),
            'deposit_amount': str(deposit_amount),
            'customer_email': email,
            'booking_type': 'deposit'
        }
        
        # URLs de retour
        success_url = url_for('client.success', _external=True) + f'?session_id={{CHECKOUT_SESSION_ID}}'
        cancel_url = url_for('trips.trip_detail', slug=slug, _external=True)
        
        # Crée la session Stripe
        session = stripe_service.create_checkout_session(
            amount=deposit_amount,
            currency='eur',
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata,
            customer_email=email,
            description=f"Acompte - {trip.get('name', 'Voyage')} ({nb_participants} participants)"
        )
        
        if session:
            # Met à jour la réservation avec la session Stripe
            firebase.update_booking(booking_id, {
                'stripeSessionId': session.id
            })
            
            # Incrémente le compteur de checkouts
            firebase.increment_trip_checkouts(slug)
            
            # Redirige vers Stripe Checkout
            return redirect(session.url, code=303)
        else:
            flash('Erreur lors de la création de la session de paiement.', 'error')
            return redirect(url_for('trips.trip_detail', slug=slug))
            
    except Exception as e:
        print(f"Erreur Stripe: {e}")
        flash('Erreur lors de la création de la session de paiement.', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
