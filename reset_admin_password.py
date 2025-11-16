#!/usr/bin/env python3
"""
Script pour réinitialiser le mot de passe admin sur Railway
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from app.services.firebase_service import FirebaseService

def reset_password():
    """Réinitialise le mot de passe admin"""
    app = create_app()
    
    with app.app_context():
        firebase = FirebaseService(app_id=os.getenv('APP_ID', 'default-app-id'))
        
        if not firebase.db:
            print("❌ Erreur: Firebase n'est pas configuré!")
            return
        
        # Récupère l'utilisateur
        admin = firebase.get_user_by_email('infos@oldibike.be')
        
        if not admin:
            print("❌ Utilisateur infos@oldibike.be n'existe pas!")
            print("   Créons-le maintenant...")
            
            from app.models.user import User
            from werkzeug.security import generate_password_hash
            
            new_password = 'OldiBike2024!'
            admin = User(
                user_id='admin_oldibike',
                email='infos@oldibike.be',
                first_name='Admin',
                last_name='OldiBike',
                role='admin'
            )
            admin.set_password(new_password)
            
            admin_id = firebase.create_user(admin.to_dict())
            
            if admin_id:
                print("🎉 Utilisateur admin créé!")
                print(f"   Email: infos@oldibike.be")
                print(f"   Password: {new_password}")
            return
        
        # Met à jour le mot de passe
        from werkzeug.security import generate_password_hash
        new_password = 'OldiBike2024!'
        password_hash = generate_password_hash(new_password)
        
        success = firebase.update_user(admin.user_id, {
            'passwordHash': password_hash
        })
        
        if success:
            print("🎉 Mot de passe réinitialisé avec succès!")
            print(f"   Email: infos@oldibike.be")
            print(f"   Nouveau password: {new_password}")
            print("\n🔗 Connectez-vous sur: https://voyages.oldibike.be/auth/login")
        else:
            print("❌ Erreur lors de la réinitialisation")

if __name__ == '__main__':
    reset_password()
