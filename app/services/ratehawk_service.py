"""
Service pour l'intégration de l'API RateHawk
Gestion de la recherche d'hôtels et réservations
"""
import requests
from requests.auth import HTTPBasicAuth
from flask import current_app
import logging

# Configuration du logger
logger = logging.getLogger(__name__)


class RateHawkService:
    """Service pour interagir avec l'API RateHawk"""
    
    # Timeouts recommandés par la documentation
    TIMEOUT_SEARCH = 30
    TIMEOUT_HOTEL_PAGE = 20
    TIMEOUT_PREBOOK = 60
    TIMEOUT_BOOKING = 120
    TIMEOUT_DEFAULT = 30
    
    def __init__(self):
        """Initialise le service avec les credentials depuis la config"""
        self.api_key_id = current_app.config.get('RATEHAWK_API_KEY_ID')
        self.api_key_token = current_app.config.get('RATEHAWK_API_KEY_TOKEN')
        self.base_url = current_app.config.get('RATEHAWK_BASE_URL')
        
        # Validation des credentials
        if not self.api_key_id or not self.api_key_token:
            logger.warning("⚠️  RateHawk credentials not configured!")
            raise ValueError("RateHawk API credentials are missing in configuration")
        
        logger.info(f"✅ RateHawk Service initialized (Base URL: {self.base_url})")
    
    def _get_auth(self):
        """
        Retourne l'objet HTTPBasicAuth pour l'authentification
        
        Returns:
            HTTPBasicAuth: Objet d'authentification configuré
        """
        return HTTPBasicAuth(self.api_key_id, self.api_key_token)
    
    def _make_request(self, method, endpoint, timeout=None, **kwargs):
        """
        Méthode générique pour effectuer des requêtes à l'API RateHawk
        
        Args:
            method (str): Méthode HTTP (GET, POST, etc.)
            endpoint (str): Endpoint de l'API (ex: '/api/b2b/v3/hotel/info/')
            timeout (int): Timeout en secondes (optionnel)
            **kwargs: Paramètres additionnels pour requests
        
        Returns:
            dict: Réponse JSON de l'API
            
        Raises:
            requests.exceptions.RequestException: Erreur lors de la requête
        """
        url = f"{self.base_url}{endpoint}"
        timeout = timeout or self.TIMEOUT_DEFAULT
        
        # Ajouter l'authentification
        kwargs['auth'] = self._get_auth()
        kwargs['timeout'] = timeout
        
        # Headers par défaut
        if 'headers' not in kwargs:
            kwargs['headers'] = {}
        kwargs['headers']['Content-Type'] = 'application/json'
        
        try:
            logger.debug(f"🔄 {method} {url}")
            response = requests.request(method, url, **kwargs)
            
            # Log des headers de rate limiting
            self._log_rate_limit_info(response)
            
            # Lever une exception si erreur HTTP
            response.raise_for_status()
            
            logger.debug(f"✅ Response {response.status_code}")
            return response.json()
            
        except requests.exceptions.Timeout:
            logger.error(f"⏱️  Timeout après {timeout}s pour {url}")
            raise
        except requests.exceptions.HTTPError as e:
            logger.error(f"❌ HTTP Error {e.response.status_code}: {e.response.text}")
            raise
        except requests.exceptions.RequestException as e:
            logger.error(f"❌ Request Error: {str(e)}")
            raise
    
    def _log_rate_limit_info(self, response):
        """
        Log les informations de rate limiting depuis les headers
        
        Args:
            response: Objet Response de requests
        """
        headers = response.headers
        if 'X-RateLimit-Remaining' in headers:
            remaining = headers.get('X-RateLimit-Remaining')
            total = headers.get('X-RateLimit-RequestsNumber')
            reset_time = headers.get('X-RateLimit-Reset')
            
            logger.debug(f"📊 Rate Limit: {remaining}/{total} remaining (reset: {reset_time})")
            
            # Warning si on approche de la limite
            if int(remaining) < 5:
                logger.warning(f"⚠️  Rate limit proche: {remaining} requêtes restantes")
    
    def test_connection(self):
        """
        Test simple de connexion à l'API RateHawk
        En testant avec le test hotel
        
        Returns:
            dict: Informations sur la connexion
            
        Raises:
            Exception: Si la connexion échoue
        """
        try:
            # On teste la connexion avec l'hôtel de test
            result = self.get_hotel_info('test_hotel_do_not_book')
            
            if result['status'] == 'success' or result['status'] == 'not_found':
                # Même si l'hôtel n'est pas trouvé, la connexion fonctionne
                return {
                    'status': 'success',
                    'message': 'RateHawk API connection successful',
                    'api_version': 'v3',
                    'environment': 'sandbox' if 'sandbox' in self.base_url else 'production',
                    'api_key_id': self.api_key_id,
                    'base_url': self.base_url
                }
            else:
                return result
            
        except Exception as e:
            logger.error(f"❌ Connection test failed: {str(e)}")
            return {
                'status': 'error',
                'message': f'Connection failed: {str(e)}',
                'environment': 'sandbox' if 'sandbox' in self.base_url else 'production'
            }
    
    def get_hotel_info(self, hotel_id):
        """
        Récupère les informations statiques d'un hôtel
        
        Args:
            hotel_id (str): ID de l'hôtel (ex: 'test_hotel_do_not_book' ou ID numérique)
        
        Returns:
            dict: Informations complètes de l'hôtel
            
        Documentation: https://docs.emergingtravel.com/docs/sandbox/static-content/retrieve-hotel-content/
        """
        endpoint = '/api/b2b/v3/hotel/info/'
        
        # Déterminer si c'est un ID ou HID
        # Si c'est numérique, c'est un HID, sinon c'est un ID string
        if str(hotel_id).isdigit():
            payload = {
                'hid': int(hotel_id),
                'language': 'en'
            }
        else:
            payload = {
                'id': hotel_id,
                'language': 'en'
            }
        
        try:
            response = self._make_request('POST', endpoint, json=payload)
            
            # L'API retourne data directement (pas une liste)
            if response.get('data'):
                return {
                    'status': 'success',
                    'hotel': response['data']
                }
            else:
                return {
                    'status': 'not_found',
                    'message': f'Hotel {hotel_id} not found'
                }
                
        except Exception as e:
            logger.error(f"❌ Error fetching hotel {hotel_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def search_hotels_by_region(self, region_id, checkin, checkout, guests, currency='EUR'):
        """
        Recherche d'hôtels dans une région spécifique
        
        Args:
            region_id (str): ID de la région RateHawk
            checkin (str): Date d'arrivée (format: YYYY-MM-DD)
            checkout (str): Date de départ (format: YYYY-MM-DD)
            guests (list): Liste des configurations de chambres
                          Ex: [{'adults': 2}] pour 1 chambre de 2 adultes
            currency (str): Code devise (EUR, USD, etc.)
        
        Returns:
            dict: Résultats de recherche avec liste d'hôtels
            
        Documentation: https://docs.emergingtravel.com/docs/sandbox/hotel-search/search-by-region/
        """
        endpoint = '/api/b2b/v3/search/serp/region/'
        
        # Convertir region_id en int si c'est une chaîne
        region_id_int = int(region_id)
        
        payload = {
            'region_id': region_id_int,  # Paramètre s'appelle 'region_id', pas 'id'
            'checkin': checkin,
            'checkout': checkout,
            'guests': guests,
            'currency': currency,
            'language': 'fr'  # Interface en français
        }
        
        try:
            response = self._make_request(
                'POST', 
                endpoint, 
                json=payload,
                timeout=self.TIMEOUT_SEARCH
            )
            
            return {
                'status': 'success',
                'hotels': response.get('data', {}).get('hotels', []),
                'total_count': len(response.get('data', {}).get('hotels', []))
            }
            
        except Exception as e:
            logger.error(f"❌ Error searching hotels: {str(e)}")
            return {
                'status': 'error',
                'message': str(e),
                'hotels': []
            }
    
    def get_hotel_page(self, hotel_id, checkin, checkout, guests, currency='EUR'):
        """
        Récupère la page détaillée d'un hôtel avec tous les tarifs disponibles
        ENDPOINT REQUIS pour la certification
        
        Args:
            hotel_id (str): ID de l'hôtel RateHawk
            checkin (str): Date d'arrivée (format: YYYY-MM-DD)
            checkout (str): Date de départ (format: YYYY-MM-DD)
            guests (list): Liste des configurations de chambres
            currency (str): Code devise
        
        Returns:
            dict: Page hôtel avec tous les tarifs
            
        Documentation: https://docs.emergingtravel.com/docs/sandbox/hotel-search/retrieve-hotelpage/
        """
        endpoint = '/api/b2b/v3/search/hp/'
        
        payload = {
            'id': hotel_id,
            'checkin': checkin,
            'checkout': checkout,
            'guests': guests,
            'currency': currency,
            'language': 'fr'
        }
        
        try:
            response = self._make_request(
                'POST',
                endpoint,
                json=payload,
                timeout=self.TIMEOUT_HOTEL_PAGE
            )
            
            return {
                'status': 'success',
                'hotel': response.get('data', {})
            }
            
        except Exception as e:
            logger.error(f"❌ Error fetching hotel page: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def prebook_rate(self, rate_hash, rate_key, price_increase_percent=0):
        """
        Pré-réservation d'un tarif (vérification de disponibilité)
        ENDPOINT REQUIS pour la certification
        
        Args:
            rate_hash (str): Hash du tarif depuis hotelpage
            rate_key (str): Clé du tarif depuis hotelpage
            price_increase_percent (int): Pourcentage d'augmentation accepté (0-100)
        
        Returns:
            dict: Résultat de la pré-réservation
            
        Documentation: https://docs.emergingtravel.com/docs/sandbox/hotel-search/prebook-rate-from-hotelpage-step/
        """
        endpoint = '/api/b2b/v3/hotel/prebook/'
        
        payload = {
            'hash': rate_hash,
            'rate_key': rate_key,
            'price_increase_percent': price_increase_percent
        }
        
        try:
            response = self._make_request(
                'POST',
                endpoint,
                json=payload,
                timeout=self.TIMEOUT_PREBOOK
            )
            
            return {
                'status': 'success',
                'prebook_data': response.get('data', {})
            }
            
        except Exception as e:
            logger.error(f"❌ Error prebooking rate: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }


    def suggest_location(self, query, language='fr'):
        """
        Recherche d'autocomplétion pour villes/régions
        
        Args:
            query (str): Texte de recherche (ex: "Gap", "Paris")
            language (str): Langue de recherche
        
        Returns:
            dict: Suggestions de villes et hôtels
            
        Documentation: https://docs.emergingtravel.com/docs/sandbox/hotel-search/suggest-hotel-and-region/
        """
        endpoint = '/api/b2b/v3/search/multicomplete/'
        
        payload = {
            'query': query,
            'language': language
        }
        
        try:
            response = self._make_request('POST', endpoint, json=payload)
            
            # Formater la réponse pour être plus utilisable
            suggestions = []
            
            # Ajouter les régions (villes, pays, etc.)
            regions = response.get('data', {}).get('regions', [])
            if regions:
                for region in regions:
                    suggestions.append({
                        'type': 'region',
                        'id': region.get('id'),
                        'name': region.get('name'),
                        'region_type': region.get('type'),
                        'country_code': region.get('country_code'),
                        'display': f"{region.get('name')} ({region.get('type', 'Region')})"
                    })
            
            # Ajouter les hôtels
            hotels = response.get('data', {}).get('hotels', [])
            if hotels:
                for hotel in hotels[:5]:  # Limiter à 5 hôtels
                    suggestions.append({
                        'type': 'hotel',
                        'id': hotel.get('id'),
                        'hid': hotel.get('hid'),
                        'name': hotel.get('name'),
                        'region_id': hotel.get('region_id'),
                        'display': f"🏨 {hotel.get('name')}"
                    })
            
            return {
                'status': 'success',
                'query': query,
                'suggestions': suggestions
            }
            
        except Exception as e:
            logger.error(f"❌ Error suggesting location for '{query}': {str(e)}")
            return {
                'status': 'error',
                'message': str(e),
                'suggestions': []
            }
    
    def filter_hotels_for_moto(self, hotels, min_rating=8.0):
        """
        Filtre les hôtels selon les critères spécifiques moto
        
        Args:
            hotels (list): Liste des hôtels depuis l'API
            min_rating (float): Note minimum requise
        
        Returns:
            dict: Hôtels filtrés avec statistiques
        """
        filtered = []
        stats = {
            'rejected_low_rating': 0,
            'rejected_no_parking': 0,
            'rejected_no_breakfast': 0,
            'total_found': len(hotels)
        }
        
        for hotel in hotels:
            # Récupérer les données de base
            rating = hotel.get('star_rating', 0) or hotel.get('rating', 0)
            
            # Critère 1: Note minimum
            if rating < min_rating:
                stats['rejected_low_rating'] += 1
                continue
            
            # Analyser les équipements pour parking
            amenities = hotel.get('amenities', []) or []
            amenities_str = ' '.join([str(a).lower() for a in amenities])
            has_parking = 'parking' in amenities_str or 'park' in amenities_str
            
            # Déterminer le type de parking (privé/public)
            parking_private = 'private' in amenities_str or 'secure' in amenities_str
            parking_type = 'private' if parking_private else ('public' if has_parking else 'unknown')
            
            # Pour l'instant, on accepte même sans parking confirmé
            # (sera vérifié manuellement sur Google Maps)
            
            # Analyser les tarifs pour petit-déjeuner
            # Note: Le breakfast sera vérifié dans les tarifs individuels
            # Pour le filtrage initial, on accepte tous les hôtels
            has_breakfast = True  # À vérifier dans les tarifs détaillés
            
            # Ajouter les badges
            hotel_data = {
                **hotel,
                'badges': {
                    'parking_available': has_parking,
                    'parking_private': parking_private,
                    'parking_type': parking_type,
                    'breakfast_included': has_breakfast,  # À confirmer
                    'high_rating': rating >= 9.0,
                    'verified_oldibike': False  # Sera mis à jour si dans DB
                },
                'rating': rating
            }
            
            filtered.append(hotel_data)
        
        # Tri par priorité
        # 1. Parking privé en premier
        # 2. Note (plus haute en premier)
        # 3. Prix (moins cher en premier)
        filtered.sort(key=lambda h: (
            -1 if h['badges']['parking_private'] else 0,
            -h.get('rating', 0),
            h.get('min_price', {}).get('amount', 999999)
        ))
        
        stats['total_filtered'] = len(filtered)
        
        return {
            'hotels': filtered,
            'stats': stats
        }
    
    def search_hotels_with_moto_filters(self, city_or_region, checkin, checkout, guests, 
                                       min_rating=8.0, currency='EUR'):
        """
        Recherche d'hôtels avec filtres moto appliqués automatiquement
        
        Args:
            city_or_region (str): Nom de ville ou region_id
            checkin (str): Date d'arrivée (YYYY-MM-DD)
            checkout (str): Date de départ (YYYY-MM-DD)
            guests (list): Configuration des chambres
            min_rating (float): Note minimum
            currency (str): Devise
        
        Returns:
            dict: Résultats filtrés avec statistiques
        """
        try:
            # Pour l'instant, on assume que c'est un region_id
            # TODO: Ajouter conversion ville → region_id via API suggest
            search_result = self.search_hotels_by_region(
                region_id=city_or_region,
                checkin=checkin,
                checkout=checkout,
                guests=guests,
                currency=currency
            )
            
            if search_result['status'] != 'success':
                return search_result
            
            # Appliquer les filtres moto
            filtered_result = self.filter_hotels_for_moto(
                search_result['hotels'],
                min_rating=min_rating
            )
            
            return {
                'status': 'success',
                'search_params': {
                    'city_or_region': city_or_region,
                    'checkin': checkin,
                    'checkout': checkout,
                    'guests': guests,
                    'min_rating': min_rating
                },
                'hotels': filtered_result['hotels'],
                'stats': filtered_result['stats']
            }
            
        except Exception as e:
            logger.error(f"❌ Error in moto-friendly search: {str(e)}")
            return {
                'status': 'error',
                'message': str(e),
                'hotels': []
            }


# Instance globale du service (singleton pattern)
_ratehawk_service = None


def get_ratehawk_service():
    """
    Retourne l'instance singleton du RateHawkService
    
    Returns:
        RateHawkService: Instance du service
    """
    global _ratehawk_service
    if _ratehawk_service is None:
        _ratehawk_service = RateHawkService()
    return _ratehawk_service
