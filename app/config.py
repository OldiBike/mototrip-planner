"""
Configuration de l'application et initialisation Firebase
"""
import os
import json
from firebase_admin import credentials, initialize_app

# Variable globale pour Firebase
firebase_app = None


def init_firebase():
    """Initialise Firebase Admin SDK (optionnel en dev)"""
    global firebase_app
    
    if firebase_app is not None:
        return firebase_app
    
    try:
        # Tente de charger depuis un fichier
        creds_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
        if creds_path and os.path.exists(creds_path):
            cred = credentials.Certificate(creds_path)
        else:
            # Sinon, charge depuis la variable d'environnement JSON
            creds_json = os.getenv('FIREBASE_CREDENTIALS')
            if creds_json:
                creds_dict = json.loads(creds_json)
                cred = credentials.Certificate(creds_dict)
            else:
                print("⚠️  Firebase credentials not found - Running in DEV MODE without Firebase")
                print("   Set FIREBASE_CREDENTIALS_PATH or FIREBASE_CREDENTIALS to enable Firebase")
                return None
        
        # Initialise Firebase
        firebase_app = initialize_app(cred, {
            'storageBucket': f"{cred.project_id}.firebasestorage.app"
        })
        
        print(f"✅ Firebase initialisé avec succès (Project: {cred.project_id})")
        return firebase_app
        
    except Exception as e:
        print(f"⚠️  Erreur lors de l'initialisation Firebase: {e}")
        print("   Running in DEV MODE without Firebase")
        return None


class Config:
    """Configuration de base de l'application"""
    
    # Flask
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key-change-me')
    SESSION_TYPE = 'filesystem'
    
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///mototrip.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Firebase
    APP_ID = os.getenv('APP_ID', 'default-app-id')
    
    # Stripe
    STRIPE_SECRET_KEY = os.getenv('STRIPE_SECRET_KEY')
    STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    # Google Maps
    GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', 'AIzaSyDFNp_SRKMbOncczpg21uL_d0q2bRlpeeY')
    
    # Admin Auth
    ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
    ADMIN_PASSWORD_HASH = os.getenv('ADMIN_PASSWORD_HASH')
    
    # RateHawk API
    RATEHAWK_API_KEY_ID = os.getenv('RATEHAWK_API_KEY_ID')
    RATEHAWK_API_KEY_TOKEN = os.getenv('RATEHAWK_API_KEY_TOKEN')
    RATEHAWK_BASE_URL = os.getenv('RATEHAWK_BASE_URL', 'https://api-sandbox.worldota.net')
