
import requests
from app.services.firebase_service import FirebaseService
from app import create_app

app = create_app()
with app.app_context():
    fb = FirebaseService()
    slug = "mv-agusta-5-jours"
    trip = fb.get_published_trip(slug)
    
    if not trip:
        print("❌ Trip not found")
        exit()
        
    url = trip.get('mapImage')
    print(f"URL Length: {len(url)}")
    print(f"URL Start: {url[:100]}...")
    
    try:
        response = requests.get(url)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            print(f"✅ Image downloaded successfully ({len(response.content)} bytes)")
            with open("test_map.png", "wb") as f:
                f.write(response.content)
            print("Saved to test_map.png")
        else:
            print(f"❌ Failed download: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
