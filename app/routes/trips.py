"""
Routes pour les voyages publics (vitrine)
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from datetime import datetime
import uuid

from app.services import FirebaseService, StripeService
from app.config import Config

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
    
    return render_template('trips/detail.html', trip=trip)


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
    nb_participants = int(request.form.get('nb_participants', 1))
    start_date = request.form.get('start_date', '')
    end_date = request.form.get('end_date', '')
    
    # Validation
    if not all([email, nb_participants, start_date, end_date]):
        flash('Veuillez remplir tous les champs.', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    if nb_participants < 1 or nb_participants > 20:
        flash('Nombre de participants invalide (1-20).', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    # Calcul des montants
    price_per_person = trip.get('pricePerPerson', 0)
    total_amount = price_per_person * nb_participants
    deposit_percentage = trip.get('depositPercentage', 30)
    deposit_amount = (total_amount * deposit_percentage) / 100
    remaining_amount = total_amount - deposit_amount
    
    # Création d'une pré-réservation (user temporaire)
    # Crée d'abord un user temporaire
    user_id = str(uuid.uuid4())
    user_data = {
        'email': email,
        'firstName': '',
        'lastName': '',
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
    booking_data = {
        'tripTemplateId': slug,
        'organizerUserId': user_id,
        'startDate': start_date,
        'endDate': end_date,
        'totalParticipants': nb_participants,
        'currentParticipants': 1,  # Seulement l'organisateur pour l'instant
        'totalAmount': total_amount,
        'depositAmount': deposit_amount,
        'remainingAmount': remaining_amount,
        'paymentStatus': 'pending',
        'stripeSessionId': '',
        'stripePaymentIntentId': '',
        'accessToken': access_token,
        'status': 'pending'
    }
    
    booking_id = firebase.create_booking(booking_data)
    
    if not booking_id:
        flash('Erreur lors de la création de la réservation.', 'error')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    # Crée le participant organisateur
    participant_data = {
        'bookingId': booking_id,
        'userId': user_id,
        'firstName': '',
        'lastName': '',
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
