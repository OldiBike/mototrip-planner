"""
Script pour migrer les photos de la collection media vers hotel.photos
"""
import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
import json
from dotenv import load_dotenv

# Charge les variables d'environnement
load_dotenv()

# Initialise Firebase Admin
if not firebase_admin._apps:
    firebase_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
    if not firebase_path:
        raise Exception("FIREBASE_CREDENTIALS_PATH non défini dans .env")
    
    cred = credentials.Certificate(firebase_path)
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'mototrip-63c76.firebasestorage.app'
    })

db = firestore.client()
bucket = storage.bucket()

def migrate_hotel_photos():
    """
    1. Lit toutes les photos de type 'hotel' dans la collection media
    2. Groupe par hotelId
    3. Ajoute les URLs dans hotel.photos
    """
    
    print("🔍 Recherche des photos d'hôtels dans la collection media...")
    
    # Référence à la collection media
    media_ref = db.collection('artifacts').document('mototrip').collection('users').document('sam-user').collection('media')
    
    # Récupère toutes les photos de type 'hotel'
    hotel_photos = media_ref.where('type', '==', 'hotel').stream()
    
    # Groupe par hotelId
    photos_by_hotel = {}
    total_photos = 0
    
    for photo_doc in hotel_photos:
        photo = photo_doc.to_dict()
        hotel_id = photo.get('hotelId')
        download_url = photo.get('downloadURL')
        
        if hotel_id and download_url:
            if hotel_id not in photos_by_hotel:
                photos_by_hotel[hotel_id] = []
            photos_by_hotel[hotel_id].append(download_url)
            total_photos += 1
    
    print(f"✅ {total_photos} photo(s) trouvée(s) pour {len(photos_by_hotel)} hôtel(s)")
    
    # Met à jour chaque hôtel
    hotels_ref = db.collection('artifacts').document('mototrip').collection('users').document('sam-user').collection('hotels')
    
    for hotel_id, photo_urls in photos_by_hotel.items():
        print(f"\n📝 Mise à jour de l'hôtel {hotel_id}...")
        print(f"   {len(photo_urls)} photo(s) à ajouter")
        
        # Récupère l'hôtel
        hotel_doc = hotels_ref.document(hotel_id).get()
        
        if not hotel_doc.exists:
            print(f"   ⚠️ Hôtel {hotel_id} introuvable, skip")
            continue
        
        hotel_data = hotel_doc.to_dict()
        hotel_name = hotel_data.get('name', 'Inconnu')
        
        # Récupère les photos existantes
        existing_photos = hotel_data.get('photos', [])
        print(f"   Photos existantes: {len(existing_photos)}")
        
        # Ajoute les nouvelles photos (sans doublons)
        new_photos = existing_photos.copy()
        for url in photo_urls:
            if url not in new_photos:
                new_photos.append(url)
        
        # Met à jour l'hôtel
        hotels_ref.document(hotel_id).update({
            'photos': new_photos
        })
        
        print(f"   ✅ {hotel_name} : {len(existing_photos)} → {len(new_photos)} photos")
    
    print(f"\n✅ Migration terminée !")
    print(f"   {total_photos} photo(s) migrée(s)")
    print(f"   {len(photos_by_hotel)} hôtel(s) mis à jour")


def list_hotels_with_photos():
    """Liste tous les hôtels et leurs photos"""
    print("\n📋 Liste des hôtels et leurs photos :\n")
    
    hotels_ref = db.collection('artifacts').document('mototrip').collection('users').document('sam-user').collection('hotels')
    hotels = hotels_ref.stream()
    
    for hotel_doc in hotels:
        hotel = hotel_doc.to_dict()
        hotel_id = hotel_doc.id
        name = hotel.get('name', 'Inconnu')
        photos = hotel.get('photos', [])
        
        print(f"🏨 {name} (ID: {hotel_id})")
        print(f"   📸 {len(photos)} photo(s)")
        if photos:
            for idx, url in enumerate(photos[:3], 1):
                print(f"      {idx}. {url[:80]}...")
            if len(photos) > 3:
                print(f"      ... et {len(photos) - 3} autre(s)")
        print()


def clean_media_collection():
    """Supprime toutes les photos d'hôtels de la collection media"""
    print("\n🗑️  Nettoyage de la collection media...")
    
    media_ref = db.collection('artifacts').document('mototrip').collection('users').document('sam-user').collection('media')
    hotel_photos = media_ref.where('type', '==', 'hotel').stream()
    
    count = 0
    for photo_doc in hotel_photos:
        photo_doc.reference.delete()
        count += 1
    
    print(f"✅ {count} photo(s) d'hôtels supprimée(s) de la collection media")


if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'migrate':
            migrate_hotel_photos()
        elif command == 'list':
            list_hotels_with_photos()
        elif command == 'clean':
            response = input("⚠️  Êtes-vous sûr de vouloir supprimer les photos d'hôtels de la collection media ? (oui/non) : ")
            if response.lower() == 'oui':
                clean_media_collection()
            else:
                print("❌ Annulé")
        else:
            print("Usage: python migrate_photos_to_hotel.py [migrate|list|clean]")
    else:
        print("🔧 Script de migration des photos d'hôtels\n")
        print("Commandes disponibles :")
        print("  migrate - Migre les photos de media vers hotel.photos")
        print("  list    - Liste tous les hôtels et leurs photos")
        print("  clean   - Supprime les photos d'hôtels de la collection media")
        print("\nUsage: python migrate_photos_to_hotel.py [migrate|list|clean]")
