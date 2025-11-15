"""
Routes pour la gestion des réservations (espace client privé)
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from datetime import datetime
import uuid
import os

from app.services import FirebaseService
from app.services.email_service import EmailService
from app.config import Config

bp = Blueprint('bookings', __name__, url_prefix='/bookings')


def user_can_access_booking(firebase, user, booking):
    """Vérifie si l'utilisateur peut accéder à cette réservation"""
    # Admin a accès à tout
    if user.role == 'admin':
        return True
    
    # Organisateur a accès
    if user.user_id == booking.organizer_user_id:
        return True
    
    # Vérifie si l'utilisateur est un participant
    participants = firebase.get_booking_participants(booking.booking_id)
    for p in participants:
        if p.user_id == user.user_id:
            return True
    
    return False


def user_can_manage_participants(user, booking):
    """Vérifie si l'utilisateur peut gérer les participants"""
    # Admin ou organisateur
    return user.role == 'admin' or user.user_id == booking.organizer_user_id


@bp.route('/my-bookings')
@login_required
def my_bookings():
    """Liste des réservations de l'utilisateur connecté"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère les réservations où l'utilisateur est organisateur
    bookings = firebase.get_user_bookings(current_user.user_id)
    
    # TODO: Récupérer aussi les réservations où l'utilisateur est participant
    # (nécessite une requête plus complexe ou un index dans Firebase)
    
    return render_template('bookings/my_bookings.html', bookings=bookings)


@bp.route('/<booking_id>')
@login_required
def booking_detail(booking_id):
    """Détail complet d'une réservation (infos privées)"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        flash('Réservation introuvable.', 'error')
        return redirect(url_for('bookings.my_bookings'))
    
    # Vérifie les droits d'accès
    if not user_can_access_booking(firebase, current_user, booking):
        flash('Vous n\'avez pas accès à cette réservation.', 'error')
        return redirect(url_for('bookings.my_bookings'))
    
    # Récupère le voyage template
    trip = firebase.get_published_trip(booking.trip_template_id)
    
    # Récupère les participants
    participants = firebase.get_booking_participants(booking_id)
    
    # Calcul des stats du groupe
    pilots = sum(1 for p in participants if p.rider_type == 'pilot')
    passengers = sum(1 for p in participants if p.rider_type == 'passenger')
    
    stats = {
        'total_motorcycles': pilots,
        'total_pilots': pilots,
        'total_passengers': passengers,
        'total_people': pilots + passengers,
        'accounts_created': sum(1 for p in participants if p.account_created)
    }
    
    # Vérifie si l'utilisateur peut gérer les participants
    can_manage = user_can_manage_participants(current_user, booking)
    
    return render_template('bookings/detail.html', 
                         booking=booking, 
                         trip=trip, 
                         participants=participants,
                         stats=stats,
                         can_manage=can_manage)


@bp.route('/<booking_id>/participants', methods=['GET', 'POST'])
@login_required
def manage_participants(booking_id):
    """Gestion des participants (ajout/liste)"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        return jsonify({'error': 'Réservation introuvable'}), 404
    
    # Vérifie les droits de gestion
    if not user_can_manage_participants(current_user, booking):
        return jsonify({'error': 'Non autorisé'}), 403
    
    if request.method == 'POST':
        # Ajout d'un participant
        first_name = request.form.get('first_name', '').strip()
        last_name = request.form.get('last_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        rider_type = request.form.get('rider_type', 'pilot')
        
        # Validation
        if not all([first_name, last_name, email]):
            return jsonify({'error': 'Tous les champs sont obligatoires'}), 400
        
        if rider_type not in ['pilot', 'passenger']:
            return jsonify({'error': 'Type de participant invalide'}), 400
        
        # Vérifie s'il reste de la place
        if not booking.has_available_slots():
            return jsonify({'error': 'Nombre maximum de participants atteint'}), 400
        
        # Vérifie si l'email n'est pas déjà dans les participants
        participants = firebase.get_booking_participants(booking_id)
        if any(p.email == email for p in participants):
            return jsonify({'error': 'Cet email est déjà dans le groupe'}), 400
        
        # Crée le participant
        participant_data = {
            'bookingId': booking_id,
            'userId': None,  # Sera rempli quand le participant créera son compte
            'firstName': first_name,
            'lastName': last_name,
            'email': email,
            'phone': '',
            'role': 'member',
            'riderType': rider_type,
            'invitationToken': str(uuid.uuid4()),
            'invitationSentAt': datetime.now().isoformat(),
            'accountCreated': False,
            'joinedAt': None,
            'addedBy': 'organizer' if current_user.role != 'admin' else 'admin',
            'addedByUserId': current_user.user_id
        }
        
        participant_id = firebase.create_participant(booking_id, participant_data)
        
        if participant_id:
            # Met à jour le compteur de participants
            firebase.update_booking(booking_id, {
                'currentParticipants': len(participants) + 1
            })
            
            # Envoie email d'invitation
            try:
                from app.models import Participant
                email_service = EmailService(os.getenv('EMAIL_SERVICE', 'mock'))
                base_url = os.getenv('BASE_URL', 'http://localhost:5000')
                trip = firebase.get_published_trip(booking.trip_template_id)
                
                # Crée un objet Participant temporaire pour l'email
                new_participant = Participant(
                    participant_id=participant_id,
                    booking_id=booking_id,
                    first_name=first_name,
                    last_name=last_name,
                    email=email,
                    rider_type=rider_type
                )
                
                email_service.send_participant_invitation(
                    email=email,
                    participant=new_participant,
                    booking=booking,
                    trip_name=trip.get('name', 'Voyage') if trip else 'Voyage',
                    organizer_name=current_user.get_full_name(),
                    invitation_token=participant_data['invitationToken'],
                    base_url=base_url
                )
                print(f"📧 Email d'invitation envoyé à {email}")
            except Exception as e:
                print(f"⚠️  Erreur envoi email invitation: {e}")
            
            flash(f'{first_name} {last_name} a été ajouté au groupe!', 'success')
            return jsonify({'success': True, 'participant_id': participant_id})
        else:
            return jsonify({'error': 'Erreur lors de l\'ajout du participant'}), 500
    
    # GET: Liste des participants
    participants = firebase.get_booking_participants(booking_id)
    return jsonify({'participants': [p.to_dict() for p in participants]})


@bp.route('/<booking_id>/participants/<participant_id>', methods=['DELETE'])
@login_required
def remove_participant(booking_id, participant_id):
    """Suppression d'un participant"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        return jsonify({'error': 'Réservation introuvable'}), 404
    
    # Vérifie les droits de gestion
    if not user_can_manage_participants(current_user, booking):
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Récupère le participant
    participants = firebase.get_booking_participants(booking_id)
    participant = next((p for p in participants if p.participant_id == participant_id), None)
    
    if not participant:
        return jsonify({'error': 'Participant introuvable'}), 404
    
    # Ne peut pas supprimer l'organisateur
    if participant.role == 'organizer':
        return jsonify({'error': 'Impossible de supprimer l\'organisateur'}), 400
    
    # Suppression
    if firebase.delete_participant(booking_id, participant_id):
        # Met à jour le compteur de participants
        firebase.update_booking(booking_id, {
            'currentParticipants': len(participants) - 1
        })
        
        flash('Participant retiré du groupe.', 'success')
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Erreur lors de la suppression'}), 500


@bp.route('/<booking_id>/payment-link', methods=['POST'])
@login_required
def generate_payment_link(booking_id):
    """Génère un lien de paiement pour le solde (admin uniquement)"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Non autorisé'}), 403
    
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        return jsonify({'error': 'Réservation introuvable'}), 404
    
    if booking.remaining_amount <= 0:
        return jsonify({'error': 'Aucun solde à payer'}), 400
    
    # TODO: Créer une session Stripe pour le paiement du solde
    # stripe_service = StripeService()
    # session = stripe_service.create_checkout_session(...)
    
    flash('Lien de paiement généré et envoyé!', 'success')
    return jsonify({'success': True})


@bp.route('/stats')
@login_required
def booking_stats():
    """Statistiques sur les réservations (admin uniquement)"""
    if current_user.role != 'admin':
        flash('Accès non autorisé.', 'error')
        return redirect(url_for('bookings.my_bookings'))
    
    firebase = FirebaseService(Config.APP_ID)
    
    # TODO: Implémenter les statistiques
    # - Nombre total de réservations
    # - Revenus totaux
    # - Taux de conversion
    # - etc.
    
    return render_template('bookings/stats.html')


# ============================================================
# PHASE 3: HOTEL REVIEWS - Client Interface
# ============================================================

@bp.route('/<booking_id>/hotels')
@login_required
def booking_hotels(booking_id):
    """Liste des hôtels du voyage pour évaluation"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        flash('Réservation introuvable.', 'error')
        return redirect(url_for('bookings.my_bookings'))
    
    # Vérifie les droits d'accès
    if not user_can_access_booking(firebase, current_user, booking):
        flash('Vous n\'avez pas accès à cette réservation.', 'error')
        return redirect(url_for('bookings.my_bookings'))
    
    # Récupère le voyage template
    trip = firebase.get_published_trip(booking.trip_template_id)
    
    if not trip:
        flash('Voyage introuvable.', 'error')
        return redirect(url_for('bookings.booking_detail', booking_id=booking_id))
    
    # Récupère les étapes du voyage pour extraire les hôtels
    days = trip.get('days', [])
    hotels_map = {}
    
    for day in days:
        hotel_id = day.get('hotelId')
        if hotel_id and hotel_id not in hotels_map:
            # Récupère les infos de l'hôtel depuis la banque
            hotel = firebase.get_hotel(Config.APP_ID, hotel_id)
            if hotel:
                # Récupère les reviews existantes de cet utilisateur pour cet hôtel
                user_review = None
                reviews = firebase.get_hotel_reviews(Config.APP_ID, hotel_id)
                for review in reviews:
                    if review.get('customerId') == current_user.user_id and review.get('tripId') == booking.trip_template_id:
                        user_review = review
                        break
                
                hotels_map[hotel_id] = {
                    'hotel': hotel,
                    'user_review': user_review,
                    'day_number': day.get('day', 0)
                }
    
    return render_template('bookings/hotels_review.html', 
                         booking=booking, 
                         trip=trip,
                         hotels=hotels_map)


@bp.route('/<booking_id>/hotels/<hotel_id>/reviews', methods=['GET', 'POST'])
@login_required
def manage_hotel_review(booking_id, hotel_id):
    """Ajouter ou consulter une évaluation d'hôtel"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        return jsonify({'error': 'Réservation introuvable'}), 404
    
    # Vérifie les droits d'accès
    if not user_can_access_booking(firebase, current_user, booking):
        return jsonify({'error': 'Non autorisé'}), 403
    
    if request.method == 'POST':
        # Ajout d'une évaluation
        data = request.get_json() if request.is_json else request.form
        
        rating = data.get('rating')
        comment = data.get('comment', '').strip()
        visit_date = data.get('visit_date', '')
        
        # Validation
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                return jsonify({'error': 'La note doit être entre 1 et 5'}), 400
        except (TypeError, ValueError):
            return jsonify({'error': 'Note invalide'}), 400
        
        if not comment:
            return jsonify({'error': 'Le commentaire est obligatoire'}), 400
        
        # Vérifie que l'utilisateur n'a pas déjà évalué cet hôtel pour ce voyage
        reviews = firebase.get_hotel_reviews(Config.APP_ID, hotel_id)
        existing_review = None
        for review in reviews:
            if review.get('customerId') == current_user.user_id and review.get('tripId') == booking.trip_template_id:
                existing_review = review
                break
        
        if existing_review:
            return jsonify({'error': 'Vous avez déjà évalué cet hôtel pour ce voyage'}), 400
        
        # Crée l'évaluation
        review_data = {
            'customerId': current_user.user_id,
            'customerName': current_user.get_full_name(),
            'rating': rating,
            'comment': comment,
            'tripId': booking.trip_template_id,
            'visitDate': visit_date or datetime.now().strftime('%Y-%m-%d'),
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        }
        
        review_id = firebase.add_hotel_review(Config.APP_ID, hotel_id, review_data)
        
        if review_id:
            # Recalcule la moyenne des notes
            firebase.calculate_hotel_average_rating(Config.APP_ID, hotel_id)
            
            flash('Merci pour votre évaluation!', 'success')
            return jsonify({'success': True, 'review_id': review_id})
        else:
            return jsonify({'error': 'Erreur lors de l\'ajout de l\'évaluation'}), 500
    
    # GET: Liste des évaluations
    reviews = firebase.get_hotel_reviews(Config.APP_ID, hotel_id)
    return jsonify({'reviews': reviews})


@bp.route('/<booking_id>/hotels/<hotel_id>/reviews/<review_id>', methods=['PUT', 'DELETE'])
@login_required
def update_delete_hotel_review(booking_id, hotel_id, review_id):
    """Modifier ou supprimer une évaluation d'hôtel"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        return jsonify({'error': 'Réservation introuvable'}), 404
    
    # Vérifie les droits d'accès
    if not user_can_access_booking(firebase, current_user, booking):
        return jsonify({'error': 'Non autorisé'}), 403
    
    # Vérifie que l'évaluation appartient à l'utilisateur
    reviews = firebase.get_hotel_reviews(Config.APP_ID, hotel_id)
    user_review = None
    for review in reviews:
        if review.get('id') == review_id:
            user_review = review
            break
    
    if not user_review:
        return jsonify({'error': 'Évaluation introuvable'}), 404
    
    if user_review.get('customerId') != current_user.user_id:
        return jsonify({'error': 'Vous ne pouvez modifier que vos propres évaluations'}), 403
    
    if request.method == 'PUT':
        # Modification
        data = request.get_json() if request.is_json else request.form
        
        rating = data.get('rating')
        comment = data.get('comment', '').strip()
        
        # Validation
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                return jsonify({'error': 'La note doit être entre 1 et 5'}), 400
        except (TypeError, ValueError):
            return jsonify({'error': 'Note invalide'}), 400
        
        if not comment:
            return jsonify({'error': 'Le commentaire est obligatoire'}), 400
        
        update_data = {
            'rating': rating,
            'comment': comment,
            'updatedAt': datetime.now()
        }
        
        success = firebase.update_hotel_review(Config.APP_ID, hotel_id, review_id, update_data)
        
        if success:
            # Recalcule la moyenne des notes
            firebase.calculate_hotel_average_rating(Config.APP_ID, hotel_id)
            
            flash('Évaluation mise à jour!', 'success')
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la mise à jour'}), 500
    
    elif request.method == 'DELETE':
        # Suppression
        success = firebase.delete_hotel_review(Config.APP_ID, hotel_id, review_id)
        
        if success:
            # Recalcule la moyenne des notes
            firebase.calculate_hotel_average_rating(Config.APP_ID, hotel_id)
            
            flash('Évaluation supprimée.', 'success')
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Erreur lors de la suppression'}), 500
