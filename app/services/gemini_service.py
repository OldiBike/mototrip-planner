"""
Service Gemini AI pour parser les données Excel d'import d'hôtels
Utilise la même clé API que Google Maps/Places
"""

import google.generativeai as genai
import os
import json
import re
import random
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


import pandas as pd
import io

def detect_excel_structure(df_preview: pd.DataFrame) -> Dict:
    """
    Utilise Gemini pour détecter la structure du fichier Excel (ligne d'en-tête et mapping des colonnes)
    """
    try:
        # Convertit les 20 premières lignes en string pour l'analyse
        preview_str = df_preview.to_string()
        
        prompt = f"""
Analyse cet extrait des 20 premières lignes d'un fichier Excel d'hôtels.

DONNÉES:
{preview_str}

TACHE:
1. Trouve l'index de la ligne d'en-tête (0-indexed). C'est la ligne qui contient les noms de colonnes comme "Nom", "Titre", "Ville", "Localité", etc.
2. Mappe les colonnes trouvées vers les champs standards suivants:
   - name: Nom de l'hôtel (ex: Titre, Nom, Etablissement...)
   - city: Ville (ex: Localité, Ville, Commune...)
   - address: Adresse (ex: Rue, Adresse...)
   - type: Type d'hébergement (ex: Type, Catégorie...)
   - description: Description (ex: Descriptif, Description...)
   - phone: Téléphone (ex: Téléphone, Phone, Tel...)
   - website: Site web (ex: Url, Site, Website...)

RETOURNE UNIQUEMENT CE JSON:
{{
  "header_row_index": <entier>,
  "column_mapping": {{
    "name": "<Nom exact de la colonne trouvée>",
    "city": "<Nom exact de la colonne trouvée>",
    "address": "<Nom exact de la colonne trouvée>",
    "type": "<Nom exact de la colonne trouvée>",
    "description": "<Nom exact de la colonne trouvée>",
    "phone": "<Nom exact de la colonne trouvée>",
    "website": "<Nom exact de la colonne trouvée>"
  }}
}}
Si une colonne n'est pas trouvée, mets null.
"""
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        
        text = response.text.strip()
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        
        return json.loads(text)
    except Exception as e:
        print(f"⚠️ Erreur détection structure: {e}")
        return {"header_row_index": 0, "column_mapping": {}}

def parse_excel_file_with_gemini(file_bytes: bytes, filename: str, progress_callback=None) -> Optional[list]:
    """
    Parse le fichier Excel localement avec Pandas et envoie les données textuelles à Gemini
    """
    
    if not GOOGLE_API_KEY:
        print("⚠️ GOOGLE_MAPS_API_KEY non configurée")
        return None
    
    try:
        if progress_callback:
            progress_callback("Analyse de la structure du fichier...", 5)
            
        print(f"📊 Lecture du fichier Excel avec Pandas ({filename})...")
        
        # 1. Détection de la structure
        if filename.lower().endswith('.csv'):
            try:
                # Tentative de lecture CSV (séparateur automatique ou standard)
                df_preview = pd.read_csv(io.BytesIO(file_bytes), header=None, nrows=20, engine='python')
            except:
                # Fallback avec point-virgule
                df_preview = pd.read_csv(io.BytesIO(file_bytes), header=None, nrows=20, sep=';', engine='python')
        else:
            df_preview = pd.read_excel(io.BytesIO(file_bytes), header=None, nrows=20)
        structure = detect_excel_structure(df_preview)
        
        header_row = structure.get('header_row_index', 0)
        mapping = structure.get('column_mapping', {})
        
        print(f"✅ Structure détectée: Header ligne {header_row}, Mapping: {mapping}")
        
        if progress_callback:
            progress_callback(f"Lecture des données (En-tête ligne {header_row+1})...", 10)
        
        # 2. Lecture complète avec le bon header
        if filename.lower().endswith('.csv'):
            try:
                df = pd.read_csv(io.BytesIO(file_bytes), header=header_row, engine='python')
            except:
                df = pd.read_csv(io.BytesIO(file_bytes), header=header_row, sep=';', engine='python')
        else:
            df = pd.read_excel(io.BytesIO(file_bytes), header=header_row)
        df = df.fillna('')
        
        # 3. Renommage et sélection des colonnes
        final_df = pd.DataFrame()
        
        for standard_col, found_col in mapping.items():
            if found_col and found_col in df.columns:
                final_df[standard_col] = df[found_col]
            else:
                final_df[standard_col] = ''
                
        # Tronque les descriptions
        if 'description' in final_df.columns:
            final_df['description'] = final_df['description'].astype(str).apply(lambda x: x[:300] + '...' if len(x) > 300 else x)
            
        # 4. Traitement par lots (Chunking)
        BATCH_SIZE = 10
        all_hotels = []
        
        total_rows = len(final_df)
        print(f"🔄 Traitement de {total_rows} lignes en lots de {BATCH_SIZE}...")
        
        for i in range(0, total_rows, BATCH_SIZE):
            batch_num = i//BATCH_SIZE + 1
            total_batches = (total_rows + BATCH_SIZE - 1) // BATCH_SIZE
            
            if progress_callback:
                percent = 10 + int((i / total_rows) * 70)
                progress_callback(f"Analyse lot {batch_num}/{total_batches}...", percent)
            
            batch_df = final_df.iloc[i:i+BATCH_SIZE]
            csv_data = batch_df.to_csv(index=False)
            
            prompt = f"""
Analyse les données CSV d'hôtels ci-dessous.
Les colonnes sont DÉJÀ normalisées (name, city, address, type, description, phone, website).

DONNÉES CSV:
{csv_data}

TACHE:
Extrais les données en JSON propre.
1. Nettoie le "name" (retire "Chambre d'hôtes à", etc. et garde après " | " si présent).
2. Normalise le "type" (hotel, gite, chambre_hote, maison_hote).
3. Ajoute +32 au "phone" si nécessaire.

RETOURNE UNIQUEMENT UN TABLEAU JSON:
[
  {{
    "name": "...",
    "city": "...",
    "address": "...",
    "type": "...",
    "description": "...",
    "phone": "...",
    "website": "..."
  }}
]
"""
            try:
                model = genai.GenerativeModel(MODEL_NAME)
                response = model.generate_content(prompt)
                
                text = response.text.strip()
                text = re.sub(r'^```json\s*', '', text)
                text = re.sub(r'^```\s*', '', text)
                text = re.sub(r'\s*```$', '', text)
                
                batch_hotels = json.loads(text)
                if isinstance(batch_hotels, list):
                    all_hotels.extend(batch_hotels)
            except Exception as e:
                print(f"❌ Erreur lot {batch_num}: {e}")
                continue
        
        # 5. Normalisation finale
        normalized_hotels = []
        for hotel in all_hotels:
            normalized = {
                'name': (hotel.get('name') or '').strip(),
                'city': (hotel.get('city') or '').strip(),
                'address': (hotel.get('address') or '').strip(),
                'type': normalize_type(hotel.get('type')),
                'description': (hotel.get('description') or '')[:500].strip(),
                'phone': normalize_phone(hotel.get('phone')),
                'website': (hotel.get('website') or '').strip()
            }
            
            if normalized['name'] and normalized['city']:
                normalized_hotels.append(normalized)
        
        return normalized_hotels

    except Exception as e:
        print(f"❌ Erreur globale: {e}")
        import traceback
        traceback.print_exc()
        return None

def normalize_type(type_str: Optional[str]) -> str:
    if not type_str:
        return 'hotel'
    
    type_str = str(type_str).lower().strip()
    
    if type_str in ['hotel', 'gite', 'chambre_hote', 'maison_hote']:
        return type_str
    
    if 'chambre' in type_str or 'b&b' in type_str:
        return 'chambre_hote'
    elif 'maison' in type_str:
        return 'maison_hote'
    elif 'gite' in type_str or 'gîte' in type_str:
        return 'gite'
    
    return 'hotel'

def normalize_phone(phone: Optional[str]) -> str:
    if not phone:
        return ''
    
    phone = str(phone).strip()
    # Retire tous les espaces et caractères spéciaux
    phone = re.sub(r'[^\d+]', '', phone)
    
    if not phone:
        return ''
    
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
    
    return phone


def parse_full_excel_file(excel_data_str: str) -> Optional[list]:
    """
    DEPRECATED: Ancienne méthode de parsing via texte
    Utilisez parse_excel_file_with_gemini() à la place
    """
    print("⚠️ parse_full_excel_file() est dépréciée, utilisez parse_excel_file_with_gemini()")
    return None


def generate_trip_teaser(trip_data: Dict) -> str:
    """Génère un texte marketing pour le teaser d'un voyage"""
    if not GOOGLE_API_KEY:
        return "Description automatique indisponible (Clé API manquante)."
    
    try:
        # Construit le contexte
        days_summary = ""
        for i, day in enumerate(trip_data.get('days', [])):
             days_summary += f"Jour {i+1}: {day.get('startPoint', '')} -> {day.get('endPoint', '')} ({day.get('distance', 0)}km). "
             
        # Collect all POIs
        all_pois = []
        for day in trip_data.get('days', []):
            # Check for enriched 'poi_objects' first (from admin view), else 'pois' IDs (raw)
            pois = day.get('poi_objects', []) 
            # If not enriched but we have descriptions in IDs? No, usually IDs. 
            # Assuming trip_data passed here is the ENRICHED one from admin.py
            for poi in pois:
                if isinstance(poi, dict) and poi.get('name'):
                   all_pois.append(poi.get('name'))
        
        selected_pois = []
        if all_pois:
            selected_pois = random.sample(all_pois, min(2, len(all_pois)))
        
        pois_instruction = ""
        if selected_pois:
            pois_instruction = f"Parle brièvement de ces lieux: {', '.join(selected_pois)}."

        prompt = f"""
        Tu es un expert en tourisme moto et copywriter marketing.
        Rédige un texte court, accrocheur et inspirant (2 paragraphes max) pour donner envie de réserver ce voyage moto.
        Mets en avant les paysages, la liberté et l'expérience.
        {pois_instruction}
        Ne parle PAS du niveau de difficulté.
        Utilise des émojis avec parcimonie.
        
        INFOS VOYAGE:
        Titre: {trip_data.get('title', 'Voyage Moto')}
        Durée: {len(trip_data.get('days', []))} jours
        KM Total: {sum(d.get('distance', 0) for d in trip_data.get('days', []))} km
        
        RÉSUMÉ ÉTAPES:
        {days_summary}
        """
        
        model = genai.GenerativeModel(MODEL_NAME)
        response = model.generate_content(prompt)
        return response.text.strip()
        
    except Exception as e:
        print(f"Error generating teaser: {e}")
        return "Découvrez ce magnifique voyage moto !"


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


def generate_gps_guide(query: str) -> Dict:
    """
    Génère un guide GPS expert via Gemini pour une requête donnée.
    Retourne un dictionnaire avec le contenu HTML structuré.
    """
    if not GOOGLE_API_KEY:
        return {"found": False, "error": "API Key missing"}

    prompt = f"""
    Tu es l'Expert Support Technique d'OldiBike, spécialisé dans les GPS Moto et Applications de navigation.
    
    DEMANDE UTILISATEUR: "{query}"

    TA MISSION:
    1. Identifie précisément l'appareil ou l'application mentionné(e).
    2. Si la demande est vague (ex: "mon gps", "ça marche comment"), retourne "needs_clarification": true.
    3. Si identifié, rédige un GUIDE D'IMPORTATION GPX EXPERT au format HTML (Tailwind CSS) pour cet appareil spécifique.

    RÈGLES DE CONTENU (Platinum Standard):
    - Ton : Professionnel, encourageant, expert ("Bienvenue motard").
    - Structure HTML stricte (voir exemple JSON plus bas).
    - ⚠️ CRITIQUE : Tu DOIS expliquer la différence entre "Trace" (Track) et "Route" (Itinéraire).
      - Explique que le fichier GPX contient une TRACE (ligne fidèle).
      - Avertis contre le "Recalcul automatique" qui détruit l'itinéraire OldiBike.
      - Pour Garmin/TomTom : Parle de l'import via les outils modernes (Explore, MyDrive) et Câble.
      - Pour Apps (Liberty, Calimoto...) : Explique l'import de fichier.
    - 🔄 RETOUR SUR TRACE (Essentiel) :
      - Explique clairement comment reprendre l'itinéraire en cas d'erreur ou de travaux.
      - Règle d'or : "Le plus fiable est de rejoindre la ligne colorée À L'ŒIL (visuellement)".
      - Exception : Si l'appareil a une fonction spécifique connue (ex: "Rejoindre la trace" sur OsmAnd ou Garmin), explique-la. Sinon, privilégie toujours le visuel.

    FORMAT DE SORTIE JSON UNIQUEMENT:
    {{
      "found": true,
      "needs_clarification": false,
      "key": "nom_appareil_normalise",  (ex: "garmin_xt", "liberty_rider")
      "data": {{
          "title": "Titre du Guide (ex: Guide Expert Garmin Zumo)",
          "icon": "fas fa-...", (choisis une icône FontAwesome adaptée: fa-satellite, fa-mobile-alt, etc)
          "content": "<div...> Contenu HTML riche avec classes Tailwind ...</div>"
      }},
      "clarification_question": "..." (Si needs_clarification=true)
    }}

    Si l'appareil n'existe pas ou n'est pas moto, retourne "found": false.
    """

    try:
        model = genai.GenerativeModel('gemini-3-pro-preview')
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Clean markdown
        text = re.sub(r'^```json\s*', '', text)
        text = re.sub(r'^```\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
        
        return json.loads(text)
    except Exception as e:
        print(f"Gemini Error: {e}")
        return {"found": False, "error": str(e)}

if __name__ == '__main__':
    # test_parsing() # Commented out
    print(generate_gps_guide("Comment mettre sur mon Garmin XT ?"))

