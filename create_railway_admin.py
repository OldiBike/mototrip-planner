#!/usr/bin/env python3
"""
Script pour créer un utilisateur admin sur Railway (Firebase)
"""
import os
import sys

# Ajouter le répertoire parent au path pour importer app
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.services.firebase_service import FirebaseService
from app.models.user import User

def create_admin():
    """Crée un utilisateur admin dans Firebase"""
    app = create_app()
    
    with app.app_context():
        # Initialise Firebase Service
        firebase = FirebaseService(app_id=os.getenv('APP_ID', 'default-app-id'))
        
        if not firebase.db:
            print("❌ Erreur: Firebase n'est pas configuré!")
            print("   Vérifiez les variables FIREBASE_CREDENTIALS dans Railway")
            return
        
        # Vérifier si l'admin existe déjà
        admin_existing = firebase.get_user_by_email('infos@oldibike.be')
        
        if admin_existing:
            print("✅ L'utilisateur admin existe déjà!")
            print(f"   Email: {admin_existing.email}")
            print(f"   Role: {admin_existing.role}")
            return
        
        # Créer l'admin
        admin_password = os.getenv('ADMIN_PASSWORD', 'OldiBike2024!')
        
        admin = User(
            user_id='admin_user',
            email='infos@oldibike.be',
            first_name='Admin',
            last_name='OldiBike',
            role='admin'
        )
        admin.set_password(admin_password)
        
        # Sauvegarder dans Firebase
        admin_id = firebase.create_user(admin.to_dict())
        
        if admin_id:
            print("🎉 Utilisateur admin créé avec succès!")
            print(f"   Email: admin@oldibike.be")
            print(f"   Password: {admin_password}")
            print(f"   Role: admin")
            print(f"   ID: {admin_id}")
            print("\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion!")
            print("\n🔗 Connectez-vous sur: https://voyages.oldibike.be/auth/login")
        else:
            print("❌ Erreur lors de la création de l'utilisateur admin")

if __name__ == '__main__':
    create_admin()
