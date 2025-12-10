import xml.etree.ElementTree as ET
import math

def parse_gpx_stats(gpx_content):
    """
    Analyse le contenu d'un fichier GPX et retourne les statistiques.
    
    Args:
        gpx_content (bytes or str): Le contenu du fichier GPX.
        
    Returns:
        dict: {'distance': float (km), 'elevation': float (m)}
    """
    try:
        if isinstance(gpx_content, bytes):
            gpx_content = gpx_content.decode('utf-8')
            
        # Parse XML
        # Remove namespace for easier tag finding or handle it dynamically
        # Simple hack: remove xmlns to avoid namespace hell in ElementTree
        import re
        gpx_content = re.sub(r'\sxmlns="[^"]+"', '', gpx_content, count=1)
        
        root = ET.fromstring(gpx_content)
        
        points = []
        for trkpt in root.findall('.//trkpt'):
            try:
                lat = float(trkpt.get('lat'))
                lon = float(trkpt.get('lon'))
                ele = trkpt.find('ele')
                elevation = float(ele.text) if ele is not None else 0.0
                points.append((lat, lon, elevation))
            except (ValueError, TypeError):
                continue
                
        if not points:
            return {'distance': 0.0, 'elevation': 0.0}
            
        total_distance = 0.0
        total_elevation_gain = 0.0
        
        # 1. Smooth Elevation Data (Moving Average, window=5)
        raw_elevations = [p[2] for p in points]
        smoothed_elevations = []
        window_size = 5
        
        if len(raw_elevations) < window_size:
            smoothed_elevations = raw_elevations
        else:
            # Simple moving average
            for i in range(len(raw_elevations)):
                start = max(0, i - window_size // 2)
                end = min(len(raw_elevations), i + window_size // 2 + 1)
                window = raw_elevations[start:end]
                smoothed_elevations.append(sum(window) / len(window))

        # 2. Calculate Distance & Elevation with Threshold
        # Threshold: ignore climbs smaller than X meters cumulative to avoid noise sum
        THRESHOLD_GAIN = 5.0 # meters
        current_climb = 0.0
        
        for i in range(1, len(points)):
            lat1, lon1, _ = points[i-1]
            lat2, lon2, _ = points[i]
            
            # Distance (Haversine)
            d = haversine_distance(lat1, lon1, lat2, lon2)
            total_distance += d
            
            # Elevation (Use smoothed data)
            ele1 = smoothed_elevations[i-1]
            ele2 = smoothed_elevations[i]
            diff = ele2 - ele1
            
            if diff > 0:
                current_climb += diff
            else:
                # If we were climbing and now dropping, check if climb was significant
                if current_climb >= THRESHOLD_GAIN:
                    total_elevation_gain += current_climb
                current_climb = 0.0
                
        # Add last climb if significant
        if current_climb >= THRESHOLD_GAIN:
            total_elevation_gain += current_climb
                
        return {
            'distance': round(total_distance, 1),
            'elevation': round(total_elevation_gain, 0)
        }
        
    except Exception as e:
        print(f"Erreur parsing GPX: {e}")
        return {'distance': 0.0, 'elevation': 0.0}

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calcule la distance en km entre deux points (lat/lon).
    """
    R = 6371.0 # Rayon Terre en km
    
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c

def extract_simplified_path(gpx_content, max_points=80):
    """
    Extracts a simplified path (list of "lat,lon" strings) from GPX content.
    
    Args:
        gpx_content (bytes): GPX file content
        max_points (int): Maximum number of points to return (decimation)
        
    Returns:
        list[str]: List of "lat,lon" strings
    """
    try:
        if isinstance(gpx_content, bytes):
            gpx_content = gpx_content.decode('utf-8')
            
        # Parse XML
        import re
        gpx_content = re.sub(r'\sxmlns="[^"]+"', '', gpx_content, count=1)
        import xml.etree.ElementTree as ET
        root = ET.fromstring(gpx_content)
        
        points = []
        for trkpt in root.findall('.//trkpt'):
            try:
                lat = trkpt.get('lat')
                lon = trkpt.get('lon')
                if lat and lon:
                    points.append(f"{lat},{lon}")
            except:
                continue
                
        if not points:
            return []
            
        # Decimate points
        total_points = len(points)
        if total_points <= max_points:
            return points
            
        step = total_points / max_points
        simplified_points = []
        for i in range(max_points):
            index = int(i * step)
            if index < total_points:
                simplified_points.append(points[index])
                
        # Always include the last point
        if points[-1] != simplified_points[-1]:
            simplified_points.append(points[-1])
            
        return simplified_points
        
    except Exception as e:
        print(f"Error extracting path: {e}")
        return []

def get_start_end_cities(gpx_content, api_key):
    """
    Extrait la ville de départ et d'arrivée d'un fichier GPX.
    Utilise Google Maps Geocoding API.
    
    Args:
        gpx_content (bytes): Contenu GPX
        api_key (str): Clé API Google Maps
        
    Returns:
        dict: {'startCity': str, 'endCity': str}
    """
    try:
        if not api_key:
            return {'startCity': None, 'endCity': None}

        # Extrait le premier et dernier point
        path = extract_simplified_path(gpx_content, max_points=2) # On veut juste start/end
        if len(path) < 2:
             # Si un seul point, ou moins, essaie avec max_points plus grand au cas où decimation foire
             path = extract_simplified_path(gpx_content, max_points=10)
             if not path:
                 return {'startCity': None, 'endCity': None}

        start_lat, start_lon = path[0].split(',')
        end_lat, end_lon = path[-1].split(',')
        
        start_city = get_city_from_coords(start_lat, start_lon, api_key)
        end_city = get_city_from_coords(end_lat, end_lon, api_key)
        
        return {'startCity': start_city, 'endCity': end_city}
        
    except Exception as e:
        print(f"Erreur extraction villes: {e}")
        return {'startCity': None, 'endCity': None}

def get_city_from_coords(lat, lon, api_key):
    """Reverse geocoding simple"""
    try:
        import requests
        url = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={api_key}&language=fr&result_type=locality"
        response = requests.get(url, timeout=5)
        data = response.json()
        
        if data.get('status') == 'OK' and data.get('results'):
            # Cherche la localité
            for component in data['results'][0]['address_components']:
                if 'locality' in component['types']:
                    return component['long_name']
        
        # Fallback: administrative_area_level_2 ou 1
        url_fallback = f"https://maps.googleapis.com/maps/api/geocode/json?latlng={lat},{lon}&key={api_key}&language=fr"
        response_fb = requests.get(url_fallback, timeout=5)
        data_fb = response_fb.json()
         
        if data_fb.get('status') == 'OK' and data_fb.get('results'):
             # Essaie de trouver une ville ou village
             for res in data_fb['results']:
                 for component in res['address_components']:
                     if 'locality' in component['types'] or 'administrative_area_level_3' in component['types']:
                         return component['long_name']
        
        return None
    except Exception as e:
        print(f"Erreur geocoding {lat},{lon}: {e}")
        return None
