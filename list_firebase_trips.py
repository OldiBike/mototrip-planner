#!/usr/bin/env python3
"""
Script de diagnostic Firebase
Liste TOUS les voyages présents dans Firebase pour diagnostiquer
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
import json

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

def list_all_trips(db):
    """Liste TOUS les voyages dans Firebase"""
    app_id = os.getenv('APP_ID', 'default-app-id')
    
    print(f"\n🔍 Structure Firebase: artifacts/{app_id}/users/")
    print("=" * 80)
    
    try:
        # Lister tous les userId
        users_ref = db.collection('artifacts').document(app_id).collection('users')
        users = users_ref.stream()
        
        total_trips = 0
        all_trips = []
        
        for user_doc in users:
            user_id = user_doc.id
            print(f"\n📁 UserId: {user_id}")
            
            # Lister les trips de cet utilisateur
            trips_ref = users_ref.document(user_id).collection('trips')
            trips = trips_ref.stream()
            
            user_trips_count = 0
            for trip_doc in trips:
                trip_data = trip_doc.to_dict()
                trip_id = trip_doc.id
                
                # Extraire les infos importantes
                title = trip_data.get('title', '❌ Sans titre')
                description = trip_data.get('description', '')[:50]  # Premiers 50 caractères
                duration = trip_data.get('duration', '?')
                price = trip_data.get('price', '?')
                created_at = trip_data.get('createdAt', 'Date inconnue')
                
                # Compter les étapes (days)
                days_ref = trips_ref.document(trip_id).collection('days')
                days_count = len(list(days_ref.stream()))
                
                print(f"   └─ 📍 {title}")
                print(f"      ├─ ID: {trip_id}")
                print(f"      ├─ Description: {description}...")
                print(f"      ├─ Durée: {duration} jours")
                print(f"      ├─ Prix: {price}€")
                print(f"      ├─ Étapes: {days_count}")
                print(f"      └─ Créé: {created_at}")
                
                user_trips_count += 1
                total_trips += 1
                
                all_trips.append({
                    'user_id': user_id,
                    'trip_id': trip_id,
                    'title': title,
                    'duration': duration,
                    'days_count': days_count
                })
            
            if user_trips_count == 0:
                print("   └─ ⚠️  Aucun voyage trouvé")
            else:
                print(f"   └─ Total: {user_trips_count} voyage(s)")
        
        print("\n" + "=" * 80)
        print(f"📊 RÉSUMÉ GLOBAL: {total_trips} voyage(s) au total")
        
        return all_trips
    
    except Exception as e:
        print(f"❌ Erreur lors de la recherche: {e}")
        return []

def check_published_trips(db):
    """Vérifie également les voyages publiés"""
    app_id = os.getenv('APP_ID', 'default-app-id')
    
    print("\n\n🌐 VOYAGES PUBLIÉS")
    print("=" * 80)
    
    try:
        published_ref = db.collection('artifacts').document(app_id).collection('publishedTrips')
        published_trips = published_ref.stream()
        
        count = 0
        for trip_doc in published_trips:
            trip_data = trip_doc.to_dict()
            slug = trip_doc.id
            title = trip_data.get('title', 'Sans titre')
            
            print(f"   └─ 🌍 {title}")
            print(f"      ├─ Slug: {slug}")
            print(f"      └─ Active: {trip_data.get('isActive', False)}")
            
            count += 1
        
        if count == 0:
            print("   └─ ⚠️  Aucun voyage publié")
        else:
            print(f"\n   Total: {count} voyage(s) publié(s)")
    
    except Exception as e:
        print(f"❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("=" * 80)
    print("🔍 DIAGNOSTIC FIREBASE - Liste complète des voyages")
    print("=" * 80)
    
    # Initialiser Firebase
    db = initialize_firebase()
    if not db:
        print("\n❌ Impossible de continuer sans connexion Firebase")
        return
    
    # Lister tous les voyages
    all_trips = list_all_trips(db)
    
    # Vérifier les voyages publiés
    check_published_trips(db)
    
    # Rechercher spécifiquement "MV Agusta"
    print("\n\n🔎 RECHERCHE SPÉCIFIQUE: Voyages contenant 'MV Agusta'")
    print("=" * 80)
    
    mv_agusta_trips = [t for t in all_trips if 'mv agusta' in t['title'].lower()]
    
    if mv_agusta_trips:
        print(f"✅ {len(mv_agusta_trips)} voyage(s) MV Agusta trouvé(s):")
        for trip in mv_agusta_trips:
            print(f"   └─ '{trip['title']}' (userId: {trip['user_id']}, {trip['days_count']} étapes)")
    else:
        print("❌ Aucun voyage contenant 'MV Agusta' trouvé")
        print("\n💡 Suggestions:")
        print("   - Les voyages peuvent avoir un titre différent")
        print("   - Les voyages peuvent être dans un autre APP_ID")
        print("   - Les voyages peuvent avoir été supprimés")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    main()
