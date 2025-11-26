"""
Modèle POI (Point of Interest) - Gestion des points d'intérêt touristiques
"""
from datetime import datetime


class POI:
    """Modèle représentant un point d'intérêt"""
    
    def __init__(self, poi_id, name, city, category, coordinates=None,
                 address='', description='', website='', phone='',
                 opening_hours='', entry_fee=None, partner_ids=None,
                 photos=None, created_at=None, updated_at=None):
        self.poi_id = poi_id
        self.name = name
        self.city = city
        self.category = category  # monument, nature, museum, activity, viewpoint, other
        self.coordinates = coordinates or {}  # {lat: float, lng: float}
        self.address = address
        self.description = description
        self.website = website
        self.phone = phone
        self.opening_hours = opening_hours
        self.entry_fee = entry_fee
        self.partner_ids = partner_ids or []
        self.photos = photos or []
        self.created_at = created_at or datetime.now().isoformat()
        self.updated_at = updated_at or datetime.now().isoformat()
    
    def has_coordinates(self):
        """Vérifie si le POI a des coordonnées GPS"""
        return bool(self.coordinates.get('lat') and self.coordinates.get('lng'))
    
    def get_category_icon(self):
        """Retourne l'icône selon la catégorie"""
        icons = {
            'monument': '🏰',
            'nature': '🌲',
            'museum': '🎨',
            'activity': '⚡',
            'viewpoint': '🔭',
            'other': '📍'
        }
        return icons.get(self.category, '📍')
    
    def get_category_label(self):
        """Retourne le label de la catégorie"""
        labels = {
            'monument': 'Monument',
            'nature': 'Nature',
            'museum': 'Musée',
            'activity': 'Activité',
            'viewpoint': 'Point de vue',
            'other': 'Autre'
        }
        return labels.get(self.category, 'Autre')
    
    def to_dict(self):
        """Convertit le POI en dictionnaire pour Firebase"""
        return {
            'name': self.name,
            'city': self.city,
            'category': self.category,
            'coordinates': self.coordinates,
            'address': self.address,
            'description': self.description,
            'website': self.website,
            'phone': self.phone,
            'openingHours': self.opening_hours,
            'entryFee': self.entry_fee,
            'partnerIds': self.partner_ids,
            'photos': self.photos,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at
        }
    
    @staticmethod
    def from_dict(poi_id, data):
        """Crée un objet POI depuis un dictionnaire Firebase"""
        return POI(
            poi_id=poi_id,
            name=data.get('name', ''),
            city=data.get('city', ''),
            category=data.get('category', 'other'),
            coordinates=data.get('coordinates', {}),
            address=data.get('address', ''),
            description=data.get('description', ''),
            website=data.get('website', ''),
            phone=data.get('phone', ''),
            opening_hours=data.get('openingHours', ''),
            entry_fee=data.get('entryFee'),
            partner_ids=data.get('partnerIds', []),
            photos=data.get('photos', []),
            created_at=data.get('createdAt'),
            updated_at=data.get('updatedAt')
        )
    
    def __repr__(self):
        return f"<POI {self.name} - {self.city} ({self.category})>"
