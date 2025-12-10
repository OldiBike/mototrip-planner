
from app.services.gemini_service import generate_gps_guide
import json

queries = [
    "Garmin Zumo XT",
    "Calimoto Application Moto",
    "Liberty Rider Application"
]

print("🚀 Régénération des guides avec Gemini 3 Pro...")

new_guides = {}

for q in queries:
    print(f"\n📡 Génération pour : {q}...")
    result = generate_gps_guide(q)
    
    if result.get('found'):
        print(f"✅ Succès pour {q}")
        # On utilise une clé simplifiée pour l'affichage/copie
        key = q.split()[0].lower()
        new_guides[key] = result['data']
    else:
        print(f"❌ Échec pour {q} : {result.get('error')}")

print("\n\n📋 RÉSULTATS (A COPIER DANS gps_guides_data.py) :")
print("==================================================")
# Print formatting compliant with python dict structure
for key, data in new_guides.items():
    print(f'    "{key}": {{')
    print(f'        "title": "{data["title"]}",')
    print(f'        "icon": "{data["icon"]}",')
    print('        "content": """')
    print(data["content"])
    print('        """')
    print('    },')
print("==================================================")
