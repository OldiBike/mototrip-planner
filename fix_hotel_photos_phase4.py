#!/usr/bin/env python3
"""
Script pour ajouter le champ hotelId dans les uploads de photos
Phase 4 : Liaison des photos aux hôtels de la banque
"""

import re

# Lit le fichier admin.py
with open('app/routes/admin.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern 1: Fonction download_place_photo - Ajoute hotelId AVANT le media_data
pattern1 = r"(download_url = blob\.public_url\s+current_app\.logger\.info\(f\"Upload réussi: \{download_url\}\"\)\s+# Enregistre dans Firestore\s+media_data = \{)"

replacement1 = r"""download_url = blob.public_url
        current_app.logger.info(f"Upload réussi: {download_url}")
        
        # PHASE 4: Récupère le hotelId depuis l'étape si disponible
        trip_id = data.get('tripId')  # Devrait être fourni par le client
        hotel_id = None
        if trip_id:
            trip = firebase.get_trip(user_id, trip_id)
            if trip and trip.get('days'):
                for day in trip['days']:
                    if day.get('id') == day_id:
                        hotel_id = day.get('hotelId')
                        break
        
        # Enregistre dans Firestore
        media_data = {"""

# Applique la première modification
content_modified = re.sub(pattern1, replacement1, content, count=1)

# Pattern 2: Dans la fonction download_place_photo, ajoute 'hotelId' dans media_data
pattern2 = r"('hotelName': hotel_name,\s+'linkedDayId': day_id,\s+'fileSize': len\(response\.content\),\s+'source': 'google_places',)"

replacement2 = r"'hotelName': hotel_name,\n            'hotelId': hotel_id,  # PHASE 4: Lien vers la banque d'hôtels\n            'linkedDayId': day_id,\n            'fileSize': len(response.content),\n            'source': 'google_places',"

content_modified = re.sub(pattern2, replacement2, content_modified, count=1)

# Pattern 3: Fonction fetch_google_photos_for_hotel - Ajoute hotelId AVANT la boucle
pattern3 = r"(firebase_storage = firebase\.get_storage\(\)\s+if firebase_storage is None:\s+return jsonify\(\{'error': 'Firebase Storage non disponible'\}\), 500\s+# Télécharge chaque photo)"

replacement3 = r"""firebase_storage = firebase.get_storage()
        if firebase_storage is None:
            return jsonify({'error': 'Firebase Storage non disponible'}), 500
        
        # PHASE 4: Récupère le hotelId depuis l'étape si disponible
        hotel_id = day.get('hotelId')
        
        # Télécharge chaque photo"""

content_modified = re.sub(pattern3, replacement3, content_modified, count=1)

# Pattern 4: Dans fetch_google_photos_for_hotel, ajoute 'hotelId' dans media_data
pattern4 = r"('hotelName': hotel_name,\s+'linkedDayId': day_id,\s+'fileSize': len\(photo_response\.content\),\s+'source': 'google_places_auto',)"

replacement4 = r"'hotelName': hotel_name,\n                    'hotelId': hotel_id,  # PHASE 4: Lien vers la banque d'hôtels\n                    'linkedDayId': day_id,\n                    'fileSize': len(photo_response.content),\n                    'source': 'google_places_auto',"

content_modified = re.sub(pattern4, replacement4, content_modified, count=1)

# Sauvegarde le fichier modifié
with open('app/routes/admin.py', 'w', encoding='utf-8') as f:
    f.write(content_modified)

print("✅ Fichier admin.py modifié avec succès!")
print("✅ Phase 4 complétée : les photos seront maintenant liées aux hôtels via hotelId")
print("\nModifications appliquées:")
print("1. Fonction download_place_photo: récupération et ajout du hotelId")
print("2. Fonction fetch_google_photos_for_hotel: récupération et ajout du hotelId")
