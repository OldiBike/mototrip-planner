"""
Webhooks pour les intégrations externes (Stripe, etc.)
"""
from flask import Blueprint, request, jsonify
import stripe
import os
from datetime import datetime

from app.services import FirebaseService
from app.services.email_service import EmailService
from app.config import Config

bp = Blueprint('webhooks', __name__, url_prefix='/webhooks')


@bp.route('/stripe', methods=['POST'])
def stripe_webhook():
    """Webhook Stripe pour gérer les événements de paiement"""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    # Vérifie la signature du webhook
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, Config.STRIPE_WEBHOOK_SECRET
        )
    except ValueError as e:
        # Payload invalide
        print(f"Erreur webhook - Payload invalide: {e}")
        return jsonify({'error': 'Invalid payload'}), 400
    except stripe.error.SignatureVerificationError as e:
        # Signature invalide
        print(f"Erreur webhook - Signature invalide: {e}")
        return jsonify({'error': 'Invalid signature'}), 400
    
    # Traite l'événement
    event_type = event['type']
    
    print(f"📩 Webhook Stripe reçu: {event_type}")
    
    # Paiement réussi
    if event_type == 'checkout.session.completed':
        session = event['data']['object']
        handle_checkout_success(session)
    
    # Paiement échoué
    elif event_type == 'checkout.session.async_payment_failed':
        session = event['data']['object']
        handle_checkout_failed(session)
    
    # PaymentIntent réussi
    elif event_type == 'payment_intent.succeeded':
        payment_intent = event['data']['object']
        handle_payment_success(payment_intent)
    
    # PaymentIntent échoué
    elif event_type == 'payment_intent.payment_failed':
        payment_intent = event['data']['object']
        handle_payment_failed(payment_intent)
    
    return jsonify({'status': 'success'}), 200


def handle_checkout_success(session):
    """Gère le succès d'une session Stripe Checkout"""
    print(f"✅ Paiement réussi - Session: {session.id}")
    
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère les métadonnées
    metadata = session.metadata
    booking_id = metadata.get('booking_id')
    booking_type = metadata.get('booking_type', 'deposit')
    
    if not booking_id:
        print("⚠️  Aucun booking_id dans les métadonnées")
        return
    
    # Récupère la réservation
    booking = firebase.get_booking(booking_id)
    
    if not booking:
        print(f"⚠️  Booking {booking_id} introuvable")
        return
    
    # Récupère le PaymentIntent
    payment_intent_id = session.payment_intent
    
    # Met à jour la réservation selon le type de paiement
    if booking_type == 'deposit':
        # Paiement de l'acompte
        update_data = {
            'paymentStatus': 'deposit_paid',
            'status': 'confirmed',
            'stripePaymentIntentId': payment_intent_id
        }
        
        firebase.update_booking(booking_id, update_data)
        
        # Active l'utilisateur organisateur
        firebase.update_user(booking.organizer_user_id, {
            'isActive': True
        })
        
        print(f"✅ Acompte payé pour booking {booking_id}")
        
        # Envoie email de confirmation à l'organisateur
        try:
            email_service = EmailService(os.getenv('EMAIL_SERVICE', 'mock'))
            base_url = os.getenv('BASE_URL', 'http://localhost:5000')
            user = firebase.get_user(booking.organizer_user_id)
            
            email_service.send_booking_confirmation(
                email=user.email,
                booking=booking,
                access_token=booking.access_token,
                base_url=base_url
            )
            print(f"📧 Email de confirmation envoyé à {user.email}")
        except Exception as e:
            print(f"⚠️  Erreur envoi email: {e}")
        
    elif booking_type == 'remaining':
        # Paiement du solde
        update_data = {
            'paymentStatus': 'fully_paid',
            'remainingAmount': 0,
            'status': 'confirmed'
        }
        
        firebase.update_booking(booking_id, update_data)
        
        print(f"✅ Solde payé pour booking {booking_id}")
        
        # TODO: Envoyer un email de confirmation de paiement complet


def handle_checkout_failed(session):
    """Gère l'échec d'une session Stripe Checkout"""
    print(f"❌ Paiement échoué - Session: {session.id}")
    
    metadata = session.metadata
    booking_id = metadata.get('booking_id')
    
    if not booking_id:
        return
    
    firebase = FirebaseService(Config.APP_ID)
    
    # Met à jour le statut de la réservation
    firebase.update_booking(booking_id, {
        'status': 'payment_failed'
    })
    
    # TODO: Envoyer un email pour informer de l'échec


def handle_payment_success(payment_intent):
    """Gère le succès d'un PaymentIntent"""
    print(f"✅ PaymentIntent réussi: {payment_intent.id}")
    
    # Les données importantes sont déjà gérées dans checkout.session.completed
    # Cette fonction peut servir pour des logs supplémentaires


def handle_payment_failed(payment_intent):
    """Gère l'échec d'un PaymentIntent"""
    print(f"❌ PaymentIntent échoué: {payment_intent.id}")
    
    # TODO: Gérer les échecs de paiement
