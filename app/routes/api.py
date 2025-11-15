"""
Routes API pour les intégrations externes
"""
from flask import Blueprint, jsonify, request

bp = Blueprint('api', __name__, url_prefix='/api')


@bp.route('/verify-code', methods=['POST'])
def verify_code():
    """Vérifie le code d'accès à 5 chiffres pour un voyage client"""
    # TODO: Implémenter la vérification
    return jsonify({'success': False, 'error': 'Not implemented'}), 501


@bp.route('/publish-trip', methods=['POST'])
def publish_trip():
    """Publie un voyage pour un client (génère slug, code, lien Stripe)"""
    # TODO: Implémenter la publication
    return jsonify({'success': False, 'error': 'Not implemented'}), 501


@bp.route('/stripe-webhook', methods=['POST'])
def stripe_webhook():
    """
    Webhook Stripe pour déverrouiller le contenu après paiement
    IMPORTANT: Vérifier la signature du webhook
    """
    from app.services.stripe_service import StripeService
    from app.services.firebase_service import FirebaseService
    from flask import current_app
    
    try:
        # Récupère le payload et la signature
        payload = request.data
        sig_header = request.headers.get('Stripe-Signature')
        
        if not sig_header:
            return jsonify({'error': 'Missing signature'}), 400
        
        # Vérifie la signature du webhook
        stripe_service = StripeService()
        event = stripe_service.verify_webhook_signature(payload, sig_header)
        
        # Traite l'événement
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            
            # Traite le paiement réussi
            firebase_service = FirebaseService()
            success = stripe_service.handle_checkout_completed(session, firebase_service)
            
            if success:
                current_app.logger.info(f"Payment processed successfully: {session.get('id')}")
            else:
                current_app.logger.error(f"Failed to process payment: {session.get('id')}")
        
        return jsonify({'status': 'success'}), 200
        
    except Exception as e:
        current_app.logger.error(f"Webhook error: {str(e)}")
        return jsonify({'error': str(e)}), 400
