
from app.services.firebase_service import FirebaseService
from app import create_app

app = create_app()
with app.app_context():
    fb = FirebaseService()
    search_name = "MV Agusta 5 Jours"
    print(f"🔍 Searching for trip named: '{search_name}'")
    
    # Check Published Trips
    print("Checking Published Trips...")
    pub_trips = fb.db.collection(f'artifacts/{fb.app_id}/publishedTrips').stream()
    found = False
    for doc in pub_trips:
        data = doc.to_dict()
        if data.get('title') == search_name or data.get('name') == search_name:
            print(f"✅ Found in Published! ID: {doc.id}")
            print(f"- Map Image: {data.get('mapImage')}")
            found = True
            
    # Check Admin Trips (Standard user)
    # We'll check the organizer from the booking: 8QZhzCDhWDmoqsUwvr18
    org_id = '8QZhzCDhWDmoqsUwvr18'
    print(f"Checking Organizer {org_id} Trips...")
    org_trips = fb.db.collection(f'artifacts/{fb.app_id}/users/{org_id}/trips').stream()
    for doc in org_trips:
         data = doc.to_dict()
         if data.get('title') == search_name or data.get('name') == search_name:
            print(f"✅ Found in Organizer Trips! ID: {doc.id}")
            print(f"- Map Image: {data.get('mapImage')}")
            found = True
            
    if not found:
        print("❌ Trip not found by name anywhere.")
