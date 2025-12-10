
from app import create_app
from app import create_app
from app.services.firebase_service import FirebaseService
from app.config import Config

app = create_app()

with app.app_context():
    print("--- DEBUG TOKEN LOOKUP ---")
    # Token known to exist from previous dump
    token = "9d18e30f-2d71-4a33-931c-86425344b0ec" 
    print(f"Testing token: {token}")

    firebase = FirebaseService(Config.APP_ID)
    
    # 1. Test Participant Lookup
    print("\n1. Testing get_participant_by_token...")
    p = firebase.get_participant_by_token(token)
    if p:
        print(f"✅ Found Participant: {p.first_name} {p.last_name} (Booking: {p.booking_id})")
    else:
        print("❌ Participant NOT found via loop.")
        
    # 2. Manual Inspection (Dump all participants)
    print("\n2. Dumping all participants to verify existence...")
    bookings = firebase.db.collection(f'artifacts/{firebase.app_id}/bookings').stream()
    found = False
    for b in bookings:
        parts = firebase.db.collection(f'artifacts/{firebase.app_id}/bookings/{b.id}/participants').stream()
        for p_doc in parts:
            data = p_doc.to_dict()
            inv_token = data.get('invitationToken')
            print(f" - Booking {b.id} -> Part {p_doc.id}: Token={inv_token}")
            if inv_token == token:
                print(f"   MATCH FOUND HERE! (Why did function fail?)")
                found = True
    
    if not found:
        print("❌ Token truly does not exist in any participant record.")

    # 3. Test Booking Token
    print("\n3. Testing get_booking_by_token (Access Token)...")
    b = firebase.get_booking_by_token(token)
    if b:
         print(f"✅ Found Booking via AccessToken: {b.id}")
    else:
         print("❌ Booking NOT found via AccessToken.")
