
import requests

keys = [
    ("Code-Tripplanner-Script", "AIzaSyA3RWUfHKxEAZJjkT4kFVd6F1P9_obMnr0"),
    ("Code-Base-HTML", "AIzaSyA6h4eD-H9p1iFK8tf-2QFS-PzVcjGmGOo"),
    ("Config-Default", "AIzaSyDFNp_SRKMbOncczpg21uL_d0q2bRlpeeY"),
    ("Database-URL-Key", "AIzaSyAluIvtsVPxmayowIrVNgdg3D-30l2q3cA") 
]

base_url = "https://maps.googleapis.com/maps/api/staticmap?center=Brooklyn+Bridge,New+York,NY&zoom=13&size=600x300&maptype=roadmap"

print("--- Testing API Keys ---")
for name, key in keys:
    url = f"{base_url}&key={key}"
    try:
        response = requests.get(url)
        if response.status_code == 200:
            print(f"✅ {name}: WORKS (200)")
        else:
            print(f"❌ {name}: FAILED ({response.status_code}) - {response.text[:100]}")
    except Exception as e:
        print(f"❌ {name}: ERROR {e}")
