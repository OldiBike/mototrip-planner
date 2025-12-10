
from app.services.firebase_service import FirebaseService
from app import create_app

app = create_app()
with app.app_context():
    fb = FirebaseService()
    token = '09fe8f79-e60d-4d2b-b9c0-0e8e8383e403'
    print(f"🔍 Inspecting Token: {token}")
    
    booking = fb.get_booking_by_token(token)
    
    if booking:
        print("✅ Booking Found via Token!")
        org_id = booking.organizer_user_id
        trip_id = booking.trip_template_id
        print(f"- Org ID: {org_id}")
        print(f"- Trip ID: {trip_id}")
        
        # Check actual trip doc
        trip_path = f'artifacts/{fb.app_id}/users/{org_id}/trips'
        print(f"🔍 Checking Trip at: {trip_path}/{trip_id}")
        
        trip_doc = fb.db.collection(trip_path).document(trip_id).get()
        if trip_doc.exists:
             print("✅ Trip Document EXISTS!")
             layout = trip_doc.to_dict()
             print(f"- Days count: {len(layout.get('days', []))}")
        else:
             print("❌ Trip Document NOT FOUND at that path.")
             
             # Check if it was a published trip?
             pub_doc = fb.db.collection(f'artifacts/{fb.app_id}/publishedTrips').document(trip_id).get()
             if pub_doc.exists:
                 print("✅ Found in PUBLISHED TRIPS (unexpected for ID format)!")
             else:
                 print("❌ Not in published trips either.")
