"""
Service Gemini AI pour parser les données Excel d'import d'hôtels
Utilise la même clé API que Google Maps/Places
"""

import google.generativeai as genai
import os
import json
import re
from typing import Dict, Optional

# Configure Gemini avec la clé Google Maps existante
GOOGLE_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY')

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    
# Modèle à utiliser (Gemini 2.5 Flash - rapide et efficace pour le parsing)
MODEL_NAME = 'gemini-2.5-flash'


def parse_hotel_data(raw_data: Dict[str, str]) -> Optional[Dict]:
    """
    Parse les données brutes d'un hôtel avec l'IA Gemini
    
    Args:
        raw_data: Dictionnaire avec les colonnes du fichier Excel
        
    Returns:
        Dictionnaire structuré et normalisé pour l'hôtel, ou None en cas d'erreur
    """
    
    if not GOOGLE_API_KEY:
        print("⚠️ GOOGLE_MAPS_API_KEY non configurée, parsing manuel")
        return manual_parse(raw_data)
    
    try:
        # Convertit les valeurs NaN en chaînes vides
        clean_data = {}
        for key, value in raw_data.items():
            if value is None or (isinstance(value, float) and str(value) == 'nan'):
                clean_data[key] = ''
            else:
                clean_data[key] = str(value).strip()
        
        # Crée une représentation lisible de toutes les données
        data_str = '\n'.join([f"**{key}:** {value}" for key, value in clean_data.items() if value])
        
        # Prompt SIMPLIFIÉ - Mapping DIRECT des colonnes
        prompt = f"""
Lis DIRECTEMENT les données ci-dessous et fais un mapping SIMPLE vers le JSON demandé.

DONNÉES BRUTES:
{data_str}

INSTRUCTIONS DE MAPPING DIRECT:
1. "name": Prends la colonne "Titre" et :
   - RETIRE les préfixes "Maison d'hôtes à", "Chambre d'hôtes à", "B&B à", "Gîte à", "Hôtel à"
   - Si le titre contient " | ", prends UNIQUEMENT ce qui est APRÈS le " | "
   - Sinon garde ce qui reste après avoir retiré le préfixe
2. "city": Prends la colonne "Localite" ou "Localité" EXACTEMENT comme elle est écrite.
3. "address": Prends la colonne "Rue" EXACTEMENT comme elle est écrite.
4. "type": Lis la colonne "Type" ou "Type de logement" et applique CE MAPPING EXACT:
   - Si contient "Chambre d'hôtes" → "chambre_hote"
   - Si contient "Gîte" → "gite"
   - Si contient "Maison d'hôtes" → "maison_hote"
   - Sinon → "hotel"
5. "description": Prends la colonne "Descriptif" (max 300 caractères).
6. "phone": Prends la colonne "Téléphone" ou "Telephone" et ajoute +32 au début si manquant.
7. "website": Prends la colonne "Url site web" ou "Website" EXACTEMENT.

NE PAS INVENTER. NE PAS DEVINER. LIS DIRECTEMENT LES COLONNES.

Retourne UNIQUEMENT le JSON (sans markdown, sans backticks):
{{
  "name": "",
  "city": "",
  "address": "",
  "type": "",
  "description": "",
  "phone": "",
  "website": ""
}}
"""

        # Appelle Gemini
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        
        # Parse la réponse JSON
        response_text = response.text.strip()
        
        # Nettoie les éventuels backticks markdown
        response_text = re.sub(r'^```json\s*', '', response_text)
        response_text = re.sub(r'^```\s*', '', response_text)
        response_text = re.sub(r'\s*```$', '', response_text)
        
        parsed = json.loads(response_text)
        
        # Debug: affiche la réponse Gemini
        print(f"🔍 Gemini a parsé: name='{parsed.get('name', '')}', city='{parsed.get('city', '')}'")
        
        # Valide et normalise le résultat
        result = {
            'name': parsed.get('name', '').strip(),
            'city': parsed.get('city', '').strip(),
            'address': parsed.get('address', '').strip(),
            'type': normalize_type(parsed.get('type', 'hotel')),
            'description': (parsed.get('description', '') or '')[:500].strip(),
            'phone': normalize_phone(parsed.get('phone', '')),
            'website': parsed.get('website', '').strip()
        }
        
        # Validation finale
        if not result['name'] or not result['city']:
            print(f"⚠️ Données incomplètes après parsing Gemini (name='{result['name']}', city='{result['city']}'), fallback manuel")
            return manual_parse(raw_data)
        
        return result
        
    except Exception as e:
        print(f"❌ Erreur parsing Gemini: {e}, fallback manuel")
        return manual_parse(raw_data)


def manual_parse(raw_data: Dict[str, str]) -> Dict:
    """
    Parse manuel des données (fallback si Gemini échoue)
    
    Args:
        raw_data: Dictionnaire avec les colonnes du fichier Excel
        
    Returns:
        Dictionnaire structuré
    """
    
    titre = raw_data.get('Titre', '').strip()
    type_logement = raw_data.get('Type', '').strip()
    rue = raw_data.get('Rue', '').strip()
    localite = raw_data.get('Localite', '').strip()
    descriptif = raw_data.get('Descriptif', '').strip()
    telephone = raw_data.get('Téléphone', '').strip()
    url = raw_data.get('Url site web', '').strip()
    
    # Extrait le nom (retire les préfixes communs)
    name = titre
    prefixes = [
        'Maison d\'hôtes à',
        'Chambre d\'hôtes à', 
        'Chambres d\'hôtes à',
        'B&B à',
        'Gîte à',
        'Hôtel à'
    ]
    
    for prefix in prefixes:
        if '|' in name:
            name = name.split('|')[0].strip()
        if name.startswith(prefix):
            name = name[len(prefix):].strip()
    
    # Détermine le type
    hotel_type = 'hotel'
    if 'chambre' in type_logement.lower():
        hotel_type = 'chambre_hote'
    elif 'maison' in type_logement.lower():
        hotel_type = 'maison_hote'
    elif 'gite' in type_logement.lower() or 'gîte' in type_logement.lower():
        hotel_type = 'gite'
    
    return {
        'name': name or titre,
        'city': localite,
        'address': rue,
        'type': hotel_type,
        'description': descriptif[:500] if descriptif else '',
        'phone': normalize_phone(telephone),
        'website': url
    }


def normalize_type(type_str: str) -> str:
    """
    Normalise le type de logement
    
    Args:
        type_str: Type brut
        
    Returns:
        Type normalisé parmi: hotel, gite, chambre_hote, maison_hote
    """
    type_str = type_str.lower().strip()
    
    if type_str in ['hotel', 'gite', 'chambre_hote', 'maison_hote']:
        return type_str
    
    if 'chambre' in type_str:
        return 'chambre_hote'
    elif 'maison' in type_str:
        return 'maison_hote'
    elif 'gite' in type_str or 'gîte' in type_str:
        return 'gite'
    
    return 'hotel'


def normalize_phone(phone: str) -> str:
    """
    Normalise le numéro de téléphone au format international +32...
    
    Args:
        phone: Numéro brut
        
    Returns:
        Numéro normalisé
    """
    if not phone:
        return ''
    
    # Retire tous les espaces et caractères spéciaux
    phone = re.sub(r'[^\d+]', '', phone)
    
    # Si déjà au format +32
    if phone.startswith('+32'):
        return phone
    
    # Si commence par 0032
    if phone.startswith('0032'):
        return '+' + phone[2:]
    
    # Si commence par 32 (sans +)
    if phone.startswith('32') and len(phone) >= 10:
        return '+' + phone
    
    # Si commence par 0 (format belge)
    if phone.startswith('0') and len(phone) >= 9:
        return '+32' + phone[1:]
    
    # Sinon retourne tel quel
    return phone if phone else ''


def test_parsing():
    """
    Fonction de test pour le parsing
    """
    test_data = {
        'Titre': 'Maison d\'hôtes à Meix-devant-Virton | La Gaum\'aise',
        'Type': 'Chambre d\'hôtes',
        'Rue': 'Rue Charbeau 16',
        'Code postal': '6769',
        'Localite': 'Sommethonne',
        'Descriptif': 'En plein coeur de la Gaume, vous trouverez cette merveilleuse chambre d\'hôtes.',
        'Téléphone': '+32 63 23 53 37',
        'Url site web': 'https://gaumaise.be'
    }
    
    print("🧪 Test du parsing Gemini...")
    result = parse_hotel_data(test_data)
    
    if result:
        print("✅ Résultat:")
        print(json.dumps(result, indent=2, ensure_ascii=False))
    else:
        print("❌ Échec du parsing")


if __name__ == '__main__':
    test_parsing()
