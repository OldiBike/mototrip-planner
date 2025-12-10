"""
Routes pour l'espace client privé (Roadbook)
"""
from flask import Blueprint, render_template, abort, current_app, request, redirect, url_for, flash
from werkzeug.exceptions import HTTPException
from datetime import datetime, timedelta
from app.services.firebase_service import FirebaseService

bp = Blueprint('client', __name__)

@bp.route('/client/join', methods=['GET', 'POST'])
def join_group():
    """Page pour rejoindre un groupe avec un code"""
    if request.method == 'POST':
        join_code = request.form.get('join_code')
        # Todo: Verify code logic
        # if valid: return redirect(url_for('client.view_roadbook', token='...'))
        pass
        
    return render_template('client/join.html')


@bp.route('/proxy-map')
def proxy_map():
    """Proxy pour afficher les Static Maps Google (contourne restrictions Referrer/CORS)"""
    url = request.args.get('url')
    if not url:
        return "", 404
        
    try:
        import requests
        # On tente de se faire passer pour le site de prod si la clé est restreinte
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
            'Referer': 'https://oldibike.be/' 
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            current_app.logger.error(f"Proxy Map Error {response.status_code}: {response.text}")
            return "", response.status_code
            
        return response.content, 200, {'Content-Type': 'image/png'}
        
    except Exception as e:
        current_app.logger.error(f"Proxy Map Exception: {str(e)}")
        return "", 500

@bp.route('/<token>')
def view_roadbook(token):
    """
    Vue privée du Roadbook pour un client (accès par lien unique)
    Supporte deux types de tokens :
    1. Token Participant (Individuel, idéal pour les groupes)
    2. Token Booking (Général, pour l'organisateur)
    """
    try:
        firebase = FirebaseService()
        
        booking = None
        participant = None
        
        # 1. Essai : Identifier un Participant (Priorité pour personnaliser l'expérience)
        participant = firebase.get_participant_by_token(token)
        if participant:
            booking = firebase.get_booking(participant.booking_id)
        
        # 2. Essai : Identifier un Booking (Fallback Organisateur)
        if not booking:
            booking = firebase.get_booking_by_token(token)
            if booking:
                # On essaie de deviner le participant organisateur
                # (Simplification: on prend le leader_details ou premier participant)
                pass

        if not booking:
            current_app.logger.warning(f"Roadbook 404: Aucune réservation trouvée pour le token {token}")
            abort(404)
            
        # 2. Récupération du Voyage
        # NOUVEAU LOGIQUE: On vérifie si un Snapshot existe (Voyage Personnalisé)
        trip_data = None
        
        # Le snapshot est stocké sous forme de dictionnaire dans booking (no attribute access via .tripSnapshot if it's a dict object returned from firebase or model)
        # Note: booking object might be a class
        snapshot = getattr(booking, 'trip_snapshot', None) 
        # Si booking est un dict ou un objet avec accesseur dictionnaire
        if not snapshot and hasattr(booking, 'get'):
             snapshot = booking.get('tripSnapshot')
             
        if snapshot and snapshot.get('days'):
            current_app.logger.info(f"Using Trip Snapshot for booking {booking.booking_id or token}")
            trip_data = snapshot
        else:
            current_app.logger.warning(f"Snapshot missing or empty for {token}. Falling back to Template.")
            # FALLBACK: Voyage Public associé
            # FALLBACK 1: Voyage Interne (Source de vérité)
            trip_id = booking.trip_template_id
            organizer_id = booking.organizer_user_id
            
            if organizer_id and trip_id:
                current_app.logger.info(f"Falling back to Internal Trip: {trip_id} (Org: {organizer_id})")
                trip_data = firebase.get_trip(organizer_id, trip_id)
            
            # FALLBACK 2: Voyage Publié (Si interne échoue ou pas d'organizer)
            if not trip_data:
                current_app.logger.info(f"Falling back to Published Trip: {trip_id}")
                trip_data = firebase.get_published_trip(trip_id)
                
            # FALLBACK 3: Tentative de récupération par Slug (Si ID UUID orphelin)
            if not trip_data and snapshot and snapshot.get('name'):
                import re
                import unidecode
                slug_candidate = unidecode.unidecode(snapshot['name']).lower()
                slug_candidate = re.sub(r'[^a-z0-9]+', '-', slug_candidate).strip('-')
                current_app.logger.info(f"Trying to recover trip via Slug: {slug_candidate}")
                trip_data = firebase.get_published_trip(slug_candidate)

        if not trip_data:
            current_app.logger.error(f"Roadbook DATA ERROR: Trip {booking.trip_template_id} not found for booking {booking.booking_id}")
            # Graceful degraded mode: Show "Preparation" state instead of 404
            trip_data = {
                'title': snapshot.get('name', 'Voyage en préparation') if snapshot else 'Voyage en préparation',
                'days': [], 
                'mapImage': None,
                'coverImage': None
            }
            # abort(404) # Do not abort, show degraded UI
            
        # 3. Logique de protection (Blurring)
        days_before_reveal = 4
        is_revealed = False
        reveal_date = None
        
        if booking.start_date:
            try:
                # Supporte string ISO ou datetime object si déjà converti par model
                start_dt = booking.start_date
                if isinstance(start_dt, str):
                    start_dt = datetime.fromisoformat(start_dt.replace('Z', '+00:00'))
                
                reveal_dt = start_dt - timedelta(days=days_before_reveal)
                now = datetime.now(reveal_dt.tzinfo) 
                reveal_date = reveal_dt
                
                if now >= reveal_dt:
                    is_revealed = True
                if booking.force_reveal:
                    is_revealed = True
            except Exception as e:
                current_app.logger.error(f"Erreur date: {e}")
        
        # 4. Enrichissement des données (Hôtels & POIs)
        days = trip_data.get('days', [])
        current_app.logger.info(f"DEBUG ROADBOOK: Trip Title: {trip_data.get('title')}")
        current_app.logger.info(f"DEBUG ROADBOOK: Days count: {len(days)}")
        if not days:
            current_app.logger.error(f"DEBUG ROADBOOK ERROR: Days list is EMPTY for token {token}!")
            current_app.logger.error(f"Trip Data Keys: {trip_data.keys()}")

        for day in days:
            # Enrichir Hôtel (Si ID présent et pas déjà l'objet complet)
            if day.get('hotelId') and not isinstance(day.get('hotel'), dict):
                hotel = firebase.get_hotel(booking.organizer_user_id or 'admin', day['hotelId']) 
                # Fallback: try finding hotel in general if user context is vague
                if not hotel and booking.organizer_user_id: 
                     hotel = firebase.get_hotel(booking.organizer_user_id, day['hotelId'])
                
                day['hotel'] = hotel
            
            # Enrichir POIs (Similaire à public view)
            day_pois = []
            for poi_item in day.get('pois', []):
                # Nouveau format snapshot peut contenir les objets complets ou juste IDs
                poi_id = poi_item if isinstance(poi_item, str) else poi_item.get('id')
                
                if poi_id:
                     poi = firebase.get_poi(poi_id)
                     if poi:
                        poi['icon'] = '📍' # Simplification
                        day_pois.append(poi)
            day['pois'] = day_pois

        # Debug Map URL & Fix Key
        if trip_data and trip_data.get('mapImage'):
             import re
             original_url = trip_data['mapImage']
             # Force use of known good key (Config default) instead of potentially bad env var
             valid_key = 'AIzaSyDFNp_SRKMbOncczpg21uL_d0q2bRlpeeY'
             
             valid_key = 'AIzaSyDFNp_SRKMbOncczpg21uL_d0q2bRlpeeY'
             
             # Swap key
             if 'key=' in original_url:
                 # 1. Swap Key
                 fixed_url = re.sub(r'key=[^&]+', f'key={valid_key}', original_url)
                 
                 # 2. Force RED Trace (OldiBike Brand) instead of Pink
                 fixed_url = re.sub(r'color:0x[a-fA-F0-9]+', 'color:0xff0000ff', fixed_url)
                 
                 # 3. Force Roadmap + High DPI
                 fixed_url = fixed_url.replace('maptype=terrain', 'maptype=roadmap')
                 if 'scale=' not in fixed_url:
                     fixed_url += '&scale=2'

                 # 4. Optional: Add Dark Mode Style (If requested later, but for now Standard Red is safer)
                 # fixed_url += '&style=feature:all|element:geometry|color:0x242f3e&style=feature:all|element:labels.text.stroke|visibility:off...'

                 trip_data['mapImage'] = fixed_url
                 print(f"DEBUG: Map Improved (Red Trace, Roadmap). New URL Start: {fixed_url[:50]}...")
        else:
             print("DEBUG: Roadbook rendering with NO MAP IMAGE")

        return render_template('client/roadbook.html',
                             booking=booking,
                             trip=trip_data,
                             is_revealed=is_revealed,
                             reveal_date=reveal_date,
                             now=datetime.now())
            
    except HTTPException as e:
        raise e
    except Exception as e:
        current_app.logger.error(f"Erreur roadbook: {e}")
        return render_template('errors/500.html'), 500

@bp.route('/api/gps-guide')
def get_gps_guide():
    """API pour l'assistant GPS Moto (Live AI + Cache)"""
    from app.services.firebase_service import FirebaseService
    from app.services.gemini_service import generate_gps_guide
    from app.services.gps_guides_data import GPS_GUIDES # Fallback statique de haute qualité
    import re

    query = request.args.get('q', '').strip()
    if not query:
        return {'found': False}

    # 1. Normalisation de la clé (ex: "Garmin Zumo XT" -> "garmin_zumo_xt")
    key = re.sub(r'[^a-z0-9]', '_', query.lower())
    
    firebase = FirebaseService()

    # 2. Check Database (Cache)
    cached_guide = firebase.get_gps_guide(key)
    if cached_guide:
        return {'found': True, 'data': cached_guide}

    # 3. Check Static Fallback (Premium content we wrote manually)
    # We map specific keywords to our static premium guides
    matched_static_key = None
    q_lower = query.lower()
    if 'liberty' in q_lower: matched_static_key = 'liberty'
    elif 'calimoto' in q_lower: matched_static_key = 'calimoto'
    elif 'garmin' in q_lower or 'zumo' in q_lower or 'xt' in q_lower: matched_static_key = 'garmin'
    elif 'tomtom' in q_lower or 'rider' in q_lower: matched_static_key = 'tomtom'
    elif 'osmand' in q_lower or 'gaia' in q_lower: matched_static_key = 'osmand'

    if matched_static_key:
        guide_data = GPS_GUIDES[matched_static_key]
        # Optionnel: On pourrait le sauvegarder dans Firebase pour que 'garmin_zumo' pointe dessus directement
        return {'found': True, 'data': guide_data}

    # 4. AI Generation (Gemini)
    # Si inconnu, on demande à Gemini de générer le guide
    ai_result = generate_gps_guide(query)
    
    if ai_result.get('found', False) and not ai_result.get('needs_clarification'):
        # 5. Store result for next time
        # On utilise la clé normalisée pour retrouver ce résultat
        firebase.save_gps_guide(key, ai_result['data'])
        return {'found': True, 'data': ai_result['data']}
    
    # 6. Returns (Found/Not Found or Needs Clarification)
    return ai_result
