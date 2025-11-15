"""
Service Stripe pour gérer les paiements
"""
import stripe
import os
from flask import current_app, url_for
from typing import Optional, Dict


class StripeService:
    """Service pour interagir avec Stripe"""
    
    def __init__(self):
        """Initialise le service Stripe avec la clé secrète"""
        stripe.api_key = os.getenv('STRIPE_SECRET_KEY')
        self.public_key = os.getenv('STRIPE_PUBLIC_KEY')
    
    def create_checkout_session(
        self, 
        trip_slug: str,
        trip_title: str,
        price_per_person: float,
        quantity: int = 1,
        customer_email: Optional[str] = None
    ) -> Dict:
        """
        Crée une session Stripe Checkout pour un voyage
        
        Args:
            trip_slug: Le slug du voyage publié
            trip_title: Le titre du voyage
            price_per_person: Le prix par personne en euros
            quantity: Le nombre de personnes (défaut: 1)
            customer_email: Email du client (optionnel)
        
        Returns:
            Dict contenant session_id et checkout_url
        """
        try:
            # Convertit le prix en centimes (Stripe utilise les plus petites unités)
            unit_amount = int(price_per_person * 100)
            
            # Crée la session Checkout
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': 'eur',
                        'unit_amount': unit_amount,
                        'product_data': {
                            'name': trip_title,
                            'description': f'Voyage moto personnalisé - {trip_title}',
                            'images': ['https://oldibike.be/wp-content/uploads/2023/01/logo-oldibike.png'],
                        },
                    },
                    'quantity': quantity,
                }],
                mode='payment',
                success_url=url_for('client.payment_success', slug=trip_slug, _external=True) + '?session_id={CHECKOUT_SESSION_ID}',
                cancel_url=url_for('client.payment_cancel', slug=trip_slug, _external=True),
                customer_email=customer_email,
                metadata={
                    'trip_slug': trip_slug,
                    'quantity': quantity
                }
            )
            
            return {
                'session_id': session.id,
                'checkout_url': session.url
            }
        
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error: {str(e)}")
            raise Exception(f"Erreur lors de la création de la session de paiement: {str(e)}")
    
    def retrieve_session(self, session_id: str) -> Dict:
        """
        Récupère les détails d'une session Checkout
        
        Args:
            session_id: L'ID de la session Stripe
        
        Returns:
            Dict contenant les détails de la session
        """
        try:
            session = stripe.checkout.Session.retrieve(session_id)
            return {
                'id': session.id,
                'payment_status': session.payment_status,
                'customer_email': session.customer_details.email if session.customer_details else None,
                'amount_total': session.amount_total / 100,  # Convertit centimes en euros
                'currency': session.currency,
                'metadata': session.metadata
            }
        except stripe.error.StripeError as e:
            current_app.logger.error(f"Stripe error retrieving session: {str(e)}")
            raise Exception(f"Erreur lors de la récupération de la session: {str(e)}")
    
    def verify_webhook_signature(self, payload: bytes, sig_header: str) -> Dict:
        """
        Vérifie la signature d'un webhook Stripe
        
        Args:
            payload: Le corps de la requête (bytes)
            sig_header: L'en-tête de signature Stripe
        
        Returns:
            L'événement Stripe vérifié
        """
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        if not webhook_secret:
            raise Exception("STRIPE_WEBHOOK_SECRET n'est pas configuré")
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
            return event
        except ValueError as e:
            # Payload invalide
            raise Exception(f"Payload invalide: {str(e)}")
        except stripe.error.SignatureVerificationError as e:
            # Signature invalide
            raise Exception(f"Signature invalide: {str(e)}")
    
    def handle_checkout_completed(self, session: Dict, firebase_service) -> bool:
        """
        Gère l'événement checkout.session.completed
        Enregistre la transaction dans Firebase
        
        Args:
            session: La session Stripe
            firebase_service: Instance du service Firebase
        
        Returns:
            True si réussi
        """
        try:
            trip_slug = session.get('metadata', {}).get('trip_slug')
            
            if not trip_slug:
                current_app.logger.error("trip_slug manquant dans metadata")
                return False
            
            # Enregistre la transaction dans Firebase
            transaction_data = {
                'trip_slug': trip_slug,
                'session_id': session.get('id'),
                'customer_email': session.get('customer_details', {}).get('email'),
                'amount': session.get('amount_total') / 100 if session.get('amount_total') else 0,
                'currency': session.get('currency', 'eur'),
                'payment_status': session.get('payment_status'),
                'quantity': int(session.get('metadata', {}).get('quantity', 1)),
                'created_at': stripe.util.convert_to_stripe_object(session).created
            }
            
            # Sauvegarde dans Firebase (collection transactions)
            firebase_service.create_transaction(trip_slug, transaction_data)
            
            # Incrémente le compteur de checkouts pour les stats
            firebase_service.increment_trip_checkouts(trip_slug)
            
            return True
            
        except Exception as e:
            current_app.logger.error(f"Erreur lors du traitement du paiement: {str(e)}")
            return False
