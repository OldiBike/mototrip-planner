"""
Modèle Partner - Gestion des partenaires (Visit Wallonia, RateHawk, etc.)
"""
from datetime import datetime


class Partner:
    """Modèle représentant un partenaire"""
    
    def __init__(self, partner_id, name, slug, description='', logo='', 
                 website='', color='#3B82F6', badge_icon='', is_active=True,
                 display_config=None, created_at=None):
        self.partner_id = partner_id
        self.name = name
        self.slug = slug
        self.description = description
        self.logo = logo
        self.website = website
        self.color = color
        self.badge_icon = badge_icon
        self.is_active = is_active
        self.display_config = display_config or {}
        self.created_at = created_at or datetime.now().isoformat()
    
    def to_dict(self):
        """Convertit le partenaire en dictionnaire pour Firebase"""
        return {
            'name': self.name,
            'slug': self.slug,
            'description': self.description,
            'logo': self.logo,
            'website': self.website,
            'color': self.color,
            'badgeIcon': self.badge_icon,
            'isActive': self.is_active,
            'displayConfig': self.display_config,
            'createdAt': self.created_at
        }
    
    @staticmethod
    def from_dict(partner_id, data):
        """Crée un objet Partner depuis un dictionnaire Firebase"""
        return Partner(
            partner_id=partner_id,
            name=data.get('name', ''),
            slug=data.get('slug', ''),
            description=data.get('description', ''),
            logo=data.get('logo', ''),
            website=data.get('website', ''),
            color=data.get('color', '#3B82F6'),
            badge_icon=data.get('badgeIcon', ''),
            is_active=data.get('isActive', True),
            display_config=data.get('displayConfig', {}),
            created_at=data.get('createdAt')
        )
    
    def __repr__(self):
        return f"<Partner {self.name} ({self.partner_id})>"
