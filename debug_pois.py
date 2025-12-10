
from app import create_app
from app.services.firebase_service import FirebaseService

app = create_app()

with app.app_context():
    firebase = FirebaseService()
    # Trip ID from user request
    trip_id = '9C6HPXPCLi6pwg1T94UU' 
    user_id = 'sam-user' # Hardcoded based on previous logs/context

    print(f"--- DEBUGGING TRIP {trip_id} ---")
    days = firebase.get_trip_days(user_id, trip_id)
    
    for day in days:
        print(f"\nDay ID: {day.get('id')}")
        print(f"Name: {day.get('dayName')}")
        print(f"POIs Field Raw: {day.get('pois')}")
        print(f"Hotel ID: {day.get('hotelId')}")
        
        # Check if pois field exists or is named differently
        # Let's print all keys just in case
        print(f"All Keys: {list(day.keys())}")
