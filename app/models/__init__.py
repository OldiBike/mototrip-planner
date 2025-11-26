"""
Modèles de l'application
"""
from app.models.customer import Customer, TripAssignment, Voucher, GPXFile
from app.models.user import User
from app.models.booking import TripBooking, Participant
from app.models.partner import Partner
from app.models.poi import POI

__all__ = [
    'Customer',
    'TripAssignment', 
    'Voucher',
    'GPXFile',
    'User',
    'TripBooking',
    'Participant',
    'Partner',
    'POI'
]
