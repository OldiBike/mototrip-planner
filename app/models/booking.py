"""
Modèles TripBooking et Participant - Système de réservation
"""
from datetime import datetime
import uuid


class TripBooking:
    """Modèle représentant une réservation de voyage"""
    
    def __init__(self, booking_id, trip_template_id, organizer_user_id, start_date, end_date,
                 total_participants, total_amount, deposit_amount=0, remaining_amount=0,
                 payment_status='pending', stripe_session_id='', stripe_payment_intent_id='',
                 access_token='', status='pending', current_participants=1,
                 created_at=None, updated_at=None):
        self.booking_id = booking_id
        self.trip_template_id = trip_template_id
        self.organizer_user_id = organizer_user_id
        
        # Dates
        self.start_date = start_date
        self.end_date = end_date
        
        # Participants
        self.total_participants = total_participants
        self.current_participants = current_participants
        
        # Paiement
        self.total_amount = float(total_amount)
        self.deposit_amount = float(deposit_amount)
        self.remaining_amount = float(remaining_amount)
        self.payment_status = payment_status
        self.stripe_session_id = stripe_session_id
        self.stripe_payment_intent_id = stripe_payment_intent_id
        
        # Accès
        self.access_token = access_token or str(uuid.uuid4())
        
        # Statut
        self.status = status
        self.created_at = created_at or datetime.now().isoformat()
        self.updated_at = updated_at or datetime.now().isoformat()
    
    def has_available_slots(self):
        """Vérifie s'il reste de la place pour ajouter des participants"""
        return self.current_participants < self.total_participants
    
    def is_fully_paid(self):
        """Vérifie si le paiement est complet"""
        return self.payment_status == 'fully_paid'
    
    def get_payment_progress(self):
        """Retourne le pourcentage de paiement"""
        if self.total_amount == 0:
            return 0
        paid = self.total_amount - self.remaining_amount
        return int((paid / self.total_amount) * 100)
    
    def to_dict(self):
        """Convertit en dictionnaire pour Firebase"""
        return {
            'tripTemplateId': self.trip_template_id,
            'organizerUserId': self.organizer_user_id,
            'startDate': self.start_date,
            'endDate': self.end_date,
            'totalParticipants': self.total_participants,
            'currentParticipants': self.current_participants,
            'totalAmount': self.total_amount,
            'depositAmount': self.deposit_amount,
            'remainingAmount': self.remaining_amount,
            'paymentStatus': self.payment_status,
            'stripeSessionId': self.stripe_session_id,
            'stripePaymentIntentId': self.stripe_payment_intent_id,
            'accessToken': self.access_token,
            'status': self.status,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at
        }
    
    @staticmethod
    def from_dict(booking_id, data):
        """Crée un objet TripBooking depuis un dictionnaire Firebase"""
        return TripBooking(
            booking_id=booking_id,
            trip_template_id=data.get('tripTemplateId', ''),
            organizer_user_id=data.get('organizerUserId', ''),
            start_date=data.get('startDate', ''),
            end_date=data.get('endDate', ''),
            total_participants=data.get('totalParticipants', 1),
            current_participants=data.get('currentParticipants', 1),
            total_amount=data.get('totalAmount', 0),
            deposit_amount=data.get('depositAmount', 0),
            remaining_amount=data.get('remainingAmount', 0),
            payment_status=data.get('paymentStatus', 'pending'),
            stripe_session_id=data.get('stripeSessionId', ''),
            stripe_payment_intent_id=data.get('stripePaymentIntentId', ''),
            access_token=data.get('accessToken', ''),
            status=data.get('status', 'pending'),
            created_at=data.get('createdAt'),
            updated_at=data.get('updatedAt')
        )
    
    def __repr__(self):
        return f"<TripBooking {self.booking_id} - {self.status}>"


class Participant:
    """Modèle représentant un participant à un voyage"""
    
    def __init__(self, participant_id, booking_id, first_name, last_name, email,
                 role='member', rider_type='pilot', user_id=None, phone='',
                 invitation_token='', invitation_sent_at=None, account_created=False,
                 joined_at=None, added_by='admin', added_by_user_id='',
                 created_at=None):
        self.participant_id = participant_id
        self.booking_id = booking_id
        self.user_id = user_id
        
        # Infos personnelles
        self.first_name = first_name
        self.last_name = last_name
        self.email = email
        self.phone = phone
        
        # Rôle dans le groupe
        self.role = role  # "organizer" | "member"
        self.rider_type = rider_type  # "pilot" | "passenger"
        
        # Gestion de l'invitation
        self.invitation_token = invitation_token or str(uuid.uuid4())
        self.invitation_sent_at = invitation_sent_at
        self.account_created = account_created
        self.joined_at = joined_at
        
        # Origine
        self.added_by = added_by
        self.added_by_user_id = added_by_user_id
        
        self.created_at = created_at or datetime.now().isoformat()
    
    def get_full_name(self):
        """Retourne le nom complet"""
        return f"{self.first_name} {self.last_name}".strip()
    
    def is_organizer(self):
        """Vérifie si c'est l'organisateur"""
        return self.role == 'organizer'
    
    def is_pilot(self):
        """Vérifie si c'est un pilote"""
        return self.rider_type == 'pilot'
    
    def has_account(self):
        """Vérifie si le participant a créé son compte"""
        return self.account_created and self.user_id is not None
    
    def to_dict(self):
        """Convertit en dictionnaire pour Firebase"""
        return {
            'bookingId': self.booking_id,
            'userId': self.user_id,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'email': self.email,
            'phone': self.phone,
            'role': self.role,
            'riderType': self.rider_type,
            'invitationToken': self.invitation_token,
            'invitationSentAt': self.invitation_sent_at,
            'accountCreated': self.account_created,
            'joinedAt': self.joined_at,
            'addedBy': self.added_by,
            'addedByUserId': self.added_by_user_id,
            'createdAt': self.created_at
        }
    
    @staticmethod
    def from_dict(participant_id, data):
        """Crée un objet Participant depuis un dictionnaire Firebase"""
        return Participant(
            participant_id=participant_id,
            booking_id=data.get('bookingId', ''),
            user_id=data.get('userId'),
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            role=data.get('role', 'member'),
            rider_type=data.get('riderType', 'pilot'),
            invitation_token=data.get('invitationToken', ''),
            invitation_sent_at=data.get('invitationSentAt'),
            account_created=data.get('accountCreated', False),
            joined_at=data.get('joinedAt'),
            added_by=data.get('addedBy', 'admin'),
            added_by_user_id=data.get('addedByUserId', ''),
            created_at=data.get('createdAt')
        )
    
    def __repr__(self):
        return f"<Participant {self.get_full_name()} - {self.role}>"
