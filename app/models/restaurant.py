class Restaurant:
    """Modèle représentant un restaurant"""

    def __init__(self, restaurant_id, name, address, city, cuisine_type, description=None, phone_number=None, website_url=None, photo_url=None, created_at=None):
        self.restaurant_id = restaurant_id
        self.name = name
        self.address = address
        self.city = city
        self.cuisine_type = cuisine_type
        self.description = description
        self.phone_number = phone_number
        self.website_url = website_url
        self.photo_url = photo_url
        self.created_at = created_at

    def to_dict(self):
        """Convertit le restaurant en dictionnaire pour Firebase"""
        return {
            "name": self.name,
            "address": self.address,
            "city": self.city,
            "cuisineType": self.cuisine_type,
            "description": self.description,
            "phoneNumber": self.phone_number,
            "websiteURL": self.website_url,
            "photoURL": self.photo_url,
            "createdAt": self.created_at
        }

    @staticmethod
    def from_dict(restaurant_id, data):
        """Crée un objet Restaurant depuis un dictionnaire Firebase"""
        return Restaurant(
            restaurant_id=restaurant_id,
            name=data.get('name', ''),
            address=data.get('address', ''),
            city=data.get('city', ''),
            cuisine_type=data.get('cuisineType', ''),
            description=data.get('description'),
            phone_number=data.get('phoneNumber'),
            website_url=data.get('websiteURL'),
            photo_url=data.get('photoURL'),
            created_at=data.get('createdAt')
        )
