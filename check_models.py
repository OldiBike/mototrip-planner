
import google.generativeai as genai
import os

api_key = os.getenv('GOOGLE_MAPS_API_KEY')

if not api_key:
    print("❌ GOOGLE_MAPS_API_KEY non trouvée dans les variables d'environnement.")
    exit(1)

print(f"🔑 Clé trouvée: {api_key[:5]}...")

try:
    genai.configure(api_key=api_key)
    print("📡 Interrogation de l'API Google Generative AI...")
    
    models = genai.list_models()
    found_any = False
    
    print("\n📋 Modèles disponibles pour votre clé :")
    for m in models:
        found_any = True
        if 'generateContent' in m.supported_generation_methods:
            print(f"✅ {m.name} ({m.display_name})")
            
    if not found_any:
        print("⚠️ Aucun modèle trouvé (ou erreur d'accès).")

except Exception as e:
    print(f"❌ Erreur: {str(e)}")
