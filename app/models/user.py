"""
Modèle User - Utilisateurs clients de l'application
"""
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class User:
    """Modèle représentant un utilisateur client"""
    
    def __init__(self, user_id, email, password_hash=None, first_name='', last_name='', 
                 phone='', role='customer', created_at=None, is_active=True, email_verified=False):
        self.user_id = user_id
        self.email = email
        self.password_hash = password_hash
        self.first_name = first_name
        self.last_name = last_name
        self.phone = phone
        self.role = role  # "customer" | "admin"
        self.created_at = created_at or datetime.now().isoformat()
        self.is_active = is_active
        self.email_verified = email_verified
    
    def set_password(self, password):
        """Hash et définit le mot de passe"""
        self.password_hash = generate_password_hash(password, method='pbkdf2:sha256')
    
    def check_password(self, password):
        """Vérifie le mot de passe"""
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, password)
    
    def get_full_name(self):
        """Retourne le nom complet"""
        return f"{self.first_name} {self.last_name}".strip() or self.email
    
    def to_dict(self):
        """Convertit en dictionnaire pour Firebase"""
        return {
            'email': self.email,
            'passwordHash': self.password_hash,
            'firstName': self.first_name,
            'lastName': self.last_name,
            'phone': self.phone,
            'role': self.role,
            'createdAt': self.created_at,
            'isActive': self.is_active,
            'emailVerified': self.email_verified
        }
    
    @staticmethod
    def from_dict(user_id, data):
        """Crée un objet User depuis un dictionnaire Firebase"""
        return User(
            user_id=user_id,
            email=data.get('email', ''),
            password_hash=data.get('passwordHash'),
            first_name=data.get('firstName', ''),
            last_name=data.get('lastName', ''),
            phone=data.get('phone', ''),
            role=data.get('role', 'customer'),
            created_at=data.get('createdAt'),
            is_active=data.get('isActive', True),
            email_verified=data.get('emailVerified', False)
        )
    
    # Méthodes Flask-Login (obligatoires)
    def is_authenticated(self):
        """Retourne True si l'utilisateur est authentifié"""
        return True
    
    def is_active_user(self):
        """Retourne True si le compte est actif"""
        return self.is_active
    
    def is_anonymous(self):
        """Retourne False car ce n'est pas un utilisateur anonyme"""
        return False
    
    def get_id(self):
        """Retourne l'identifiant unique pour Flask-Login"""
        return self.user_id
    
    def __repr__(self):
        return f"<User {self.email}>"
