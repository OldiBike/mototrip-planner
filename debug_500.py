import sys
import os
from flask import render_template

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app import create_app
from app.services.firebase_service import FirebaseService

app = create_app()

with app.app_context():
    app_id = app.config.get('APP_ID', 'default-app-id')
    firebase = FirebaseService(app_id)
    
    slug = 'mv-agusta-5-jours'
    print(f"Fetching published trip: {slug}")
    
    trip = firebase.get_published_trip(slug)
    
    if not trip:
        print("Trip not found!")
    else:
        print("Trip data keys:", trip.keys())
        print("Days type:", type(trip.get('days')))
        if trip.get('days'):
            print("Number of days:", len(trip['days']))
            for i, day in enumerate(trip['days']):
                print(f"Day {i+1} keys:", day.keys())
                print(f"Day {i+1} gpxUrl:", day.get('gpxUrl'))
        
        # Try to simulate what the route does
        from datetime import datetime
        # Check simple rendering context
        try:
            # We can't easily render the full template without a request context and all dependencies,
            # but we can look for obvious missing fields.
            pass
        except Exception as e:
            print(f"Error: {e}")
