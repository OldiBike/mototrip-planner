#!/usr/bin/env python3
"""
Script de migration des voyages Firebase
Migre les voyages "MV Agusta 5 jours" et "MV Agusta 7 jours" 
depuis les anciens userId vers le nouveau userId fixe 'sam-user'
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
from datetime import datetime

# Charger les variables d'environnement
load_dotenv()

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', './mototrip-63c76-firebase-adminsdk-fbsvc-d909861cfa.json')
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase initialisé avec succès")
        return db
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation Firebase: {e}")
        return None

def find_mv_agusta_trips(db):
    """Recherche tous les voyages MV Agusta dans Firebase"""
    app_id = os.getenv('APP_ID', 'default-app-id')
    target_titles = ["MV Agusta 5 jours", "MV Agusta 7 jours"]
    found_trips = []
    
    print(f"\n🔍 Recherche des voyages dans artifacts/{app_id}/users/...")
    
    try:
        # Lister tous les userId
        users_ref = db.collection('artifacts').document(app_id).collection('users')
        users = users_ref.stream()
        
        for user_doc in users:
            user_id = user_doc.id
            print(f"   Vérification userId: {user_id}")
            
            # Lister les trips de cet utilisateur
            trips_ref = users_ref.document(user_id).collection('trips')
            trips = trips_ref.stream()
            
            for trip_doc in trips:
                trip_data = trip_doc.to_dict()
                trip_title = trip_data.get('title', '')
                
                # Vérifier si c'est un voyage MV Agusta
                if trip_title in target_titles:
                    print(f"   ✅ Trouvé: '{trip_title}' (userId: {user_id}, tripId: {trip_doc.id})")
                    
                    # Récupérer aussi les étapes (days)
                    days_ref = trips_ref.document(trip_doc.id).collection('days')
                    days = list(days_ref.stream())
                    
                    found_trips.append({
                        'old_user_id': user_id,
                        'trip_id': trip_doc.id,
                        'trip_data': trip_data,
                        'days': [{'id': day.id, 'data': day.to_dict()} for day in days]
                    })
        
        return found_trips
    
    except Exception as e:
        print(f"❌ Erreur lors de la recherche: {e}")
        return []

def migrate_trips_to_sam_user(db, trips):
    """Migre les voyages vers le userId 'sam-user'"""
    if not trips:
        print("\n⚠️  Aucun voyage à migrer")
        return
    
    app_id = os.getenv('APP_ID', 'default-app-id')
    new_user_id = 'sam-user'
    
    print(f"\n🚀 Migration vers userId: {new_user_id}")
    
    for trip_info in trips:
        old_user_id = trip_info['old_user_id']
        trip_id = trip_info['trip_id']
        trip_data = trip_info['trip_data']
        days = trip_info['days']
        
        title = trip_data.get('title', 'Sans titre')
        
        try:
            # Créer le voyage dans sam-user
            new_trip_ref = db.collection('artifacts').document(app_id).collection('users').document(new_user_id).collection('trips').document(trip_id)
            
            # Ajouter un champ de migration pour traçabilité
            trip_data['migrated_from'] = old_user_id
            trip_data['migrated_at'] = datetime.utcnow().isoformat()
            
            new_trip_ref.set(trip_data)
            print(f"   ✅ Voyage migré: '{title}'")
            
            # Migrer les étapes (days)
            for day_info in days:
                day_id = day_info['id']
                day_data = day_info['data']
                
                new_day_ref = new_trip_ref.collection('days').document(day_id)
                new_day_ref.set(day_data)
                print(f"      ✅ Étape migrée: Jour {day_data.get('dayNumber', '?')}")
            
            print(f"   ✅ Migration complète: '{title}' ({len(days)} étapes)")
        
        except Exception as e:
            print(f"   ❌ Erreur lors de la migration de '{title}': {e}")

def main():
    """Fonction principale"""
    print("=" * 60)
    print("🔄 SCRIPT DE MIGRATION - Voyages MV Agusta")
    print("=" * 60)
    
    # Initialiser Firebase
    db = initialize_firebase()
    if not db:
        print("\n❌ Impossible de continuer sans connexion Firebase")
        return
    
    # Rechercher les voyages MV Agusta
    print("\n📋 ÉTAPE 1: Recherche des voyages")
    trips = find_mv_agusta_trips(db)
    
    if not trips:
        print("\n⚠️  Aucun voyage 'MV Agusta 5 jours' ou 'MV Agusta 7 jours' trouvé")
        print("   Vérifiez que les voyages existent bien dans Firebase")
        return
    
    # Afficher un résumé
    print(f"\n📊 RÉSUMÉ:")
    print(f"   {len(trips)} voyage(s) trouvé(s)")
    for trip in trips:
        title = trip['trip_data'].get('title', 'Sans titre')
        days_count = len(trip['days'])
        print(f"   - {title} ({days_count} étapes)")
    
    # Demander confirmation
    print("\n⚠️  Ces voyages vont être copiés vers userId='sam-user'")
    print("   Les voyages originaux ne seront PAS supprimés (conservation)")
    response = input("\n   Continuer la migration ? (oui/non): ")
    
    if response.lower() not in ['oui', 'o', 'yes', 'y']:
        print("\n❌ Migration annulée par l'utilisateur")
        return
    
    # Migrer les voyages
    print("\n📋 ÉTAPE 2: Migration des voyages")
    migrate_trips_to_sam_user(db, trips)
    
    print("\n" + "=" * 60)
    print("✅ MIGRATION TERMINÉE")
    print("=" * 60)
    print("\n💡 Conseil: Relancez l'application et connectez-vous pour voir les voyages migrés")

if __name__ == "__main__":
    main()
