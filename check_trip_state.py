import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.services.firebase_service import FirebaseService

app = create_app()

with app.app_context():
    app_id = app.config.get('APP_ID', 'default-app-id')
    firebase = FirebaseService(app_id)
    
    trip_id = '9C6HPXPCLi6pwg1T94UU'
    user_id = 'sam-user'
    
    print(f"Checking trip {trip_id}...")
    trip = firebase.get_trip(user_id, trip_id)
    
    if trip:
        print(f"Slug: {trip.get('slug')}")
        print(f"PublishedSlug: {trip.get('publishedSlug')}")
        print(f"IsActive: {trip.get('isActive')}")
        
        # Check if published trip exists
        pub_slug = trip.get('publishedSlug')
        if pub_slug:
            pub_trip = firebase.get_published_trip(pub_slug)
            print(f"Published Trip Exists: {pub_trip is not None}")
        else:
            print("No publishedSlug in trip data.")
    else:
        print("Trip not found")
