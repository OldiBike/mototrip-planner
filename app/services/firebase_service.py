"""
Service Firebase pour gérer l'authentification, Firestore et Storage
"""
from firebase_admin import auth, firestore, storage
from datetime import datetime
from typing import Optional, Dict, List, Any


class FirebaseService:
    """Service pour interagir avec Firebase Firestore"""
    
    # Variable de classe pour suivre si l'initialisation a déjà été loguée
    _initialization_logged = False
    
    def __init__(self, app_id='default-app-id'):
        self.app_id = app_id
        self.mock_mode = False
        
        try:
            # Initialise Firestore
            self.db = firestore.client()
            # N'affiche le message qu'une seule fois
            if not FirebaseService._initialization_logged:
                print("✅ Firestore client initialisé")
        except Exception as e:
            print(f"⚠️  Firestore non disponible: {e}")
            self.db = None
            self.mock_mode = True
        
        try:
            # Initialise Storage
            self.bucket = storage.bucket()
            # N'affiche le message qu'une seule fois
            if not FirebaseService._initialization_logged:
                print(f"✅ Firebase Storage bucket initialisé: {self.bucket.name}")
        except Exception as e:
            print(f"⚠️  Firebase Storage non disponible: {e}")
            self.bucket = None
            if not self.mock_mode:
                self.mock_mode = True
        
        if self.mock_mode and not FirebaseService._initialization_logged:
            print("⚠️  Mode MOCK activé")
            self._mock_data = {
                'trips': {},
                'days': {}
            }
        elif not hasattr(self, '_mock_data'):
            self._mock_data = {
                'trips': {},
                'days': {}
            }
        
        # Marque l'initialisation comme loguée
        FirebaseService._initialization_logged = True
    
    # ============================================
    # GESTION DES UTILISATEURS ET AUTH
    # ============================================
    
    def create_custom_token(self, uid: str) -> str:
        """Crée un token personnalisé pour authentifier un utilisateur"""
        return auth.create_custom_token(uid).decode('utf-8')
    
    def verify_id_token(self, id_token: str) -> Dict:
        """Vérifie un token d'authentification Firebase"""
        return auth.verify_id_token(id_token)
    
    # ============================================
    # GESTION DES CODES D'ACCÈS
    # ============================================
    
    def get_user_by_access_code(self, code: str) -> Optional[str]:
        """Récupère l'userId associé à un code d'accès"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/accessCodes').document(code).get()
            if doc.exists:
                return doc.to_dict().get('userId')
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du code: {e}")
            return None
    
    def create_access_code(self, code: str, user_id: str) -> bool:
        """Crée un code d'accès pour un utilisateur"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/accessCodes').document(code).set({
                'userId': user_id,
                'createdAt': firestore.SERVER_TIMESTAMP
            })
            return True
        except Exception as e:
            print(f"Erreur lors de la création du code: {e}")
            return False
    
    def check_code_exists(self, code: str) -> bool:
        """Vérifie si un code d'accès existe déjà"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/accessCodes').document(code).get()
            return doc.exists
        except Exception as e:
            print(f"Erreur lors de la vérification du code: {e}")
            return False
    
    # ============================================
    # GESTION DES VOYAGES (TRIPS)
    # ============================================
    
    def get_user_trips(self, user_id: str) -> List[Dict]:
        """Récupère tous les voyages d'un utilisateur"""
        if self.mock_mode:
            return list(self._mock_data['trips'].get(user_id, {}).values())
        
        try:
            trips_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips')
            trips = trips_ref.order_by('name').stream()
            
            result = []
            for trip in trips:
                trip_data = trip.to_dict()
                trip_data['id'] = trip.id
                result.append(trip_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des voyages: {e}")
            return []
    
    def get_trip(self, user_id: str, trip_id: str) -> Optional[Dict]:
        """Récupère un voyage spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips').document(trip_id).get()
            if doc.exists:
                trip_data = doc.to_dict()
                trip_data['id'] = doc.id
                return trip_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du voyage: {e}")
            return None
    
    def create_trip(self, user_id: str, name: str, **kwargs) -> Optional[str]:
        """Crée un nouveau voyage"""
        if self.mock_mode:
            import uuid
            trip_id = str(uuid.uuid4())
            if user_id not in self._mock_data['trips']:
                self._mock_data['trips'][user_id] = {}
            self._mock_data['trips'][user_id][trip_id] = {
                'id': trip_id,
                'name': name,
                'createdAt': datetime.now().isoformat(),
                **kwargs
            }
            return trip_id
        
        try:
            trip_data = {
                'name': name,
                'createdAt': firestore.SERVER_TIMESTAMP,
                **kwargs
            }
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips').add(trip_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du voyage: {e}")
            return None
    
    def update_trip(self, user_id: str, trip_id: str, data: Dict) -> bool:
        """Met à jour un voyage"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips').document(trip_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du voyage: {e}")
            return False
    
    def delete_trip(self, user_id: str, trip_id: str) -> bool:
        """Supprime un voyage (Note: ne supprime pas les sous-collections)"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips').document(trip_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du voyage: {e}")
            return False
    
    # ============================================
    # GESTION DES ÉTAPES (DAYS)
    # ============================================
    
    def get_trip_days(self, user_id: str, trip_id: str) -> List[Dict]:
        """Récupère toutes les étapes d'un voyage"""
        try:
            days_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days')
            days = days_ref.order_by('createdAt').stream()

            result = []
            for day in days:
                day_data = day.to_dict()
                day_data['id'] = day.id
                result.append(day_data)

            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des étapes: {e}")
            return []

    def get_trip_days_with_hotels(self, user_id: str, trip_id: str) -> List[Dict]:
        """
        Récupère les étapes d'un voyage avec les infos complètes des hôtels
        depuis la banque d'hôtels (SOURCE UNIQUE)
        """
        try:
            # Récupère les étapes
            days = self.get_trip_days(user_id, trip_id)
            
            # Pour chaque étape, enrichit avec les données complètes de l'hôtel
            for day in days:
                hotel_id = day.get('hotelId')
                if hotel_id:
                    # Récupère les infos complètes depuis la banque
                    hotel = self.get_hotel(user_id, hotel_id)
                    if hotel:
                        # Données complètes de l'hôtel
                        day['hotel'] = hotel
                        
                        # Rétrocompatibilité : remplit les champs legacy
                        # pour que l'ancien code continue de fonctionner
                        day['hotelName'] = hotel.get('name', '')
                        day['city'] = hotel.get('city', '')
                        day['priceDouble'] = hotel.get('defaultPricing', {}).get('priceDouble', 0)
                        day['priceSolo'] = hotel.get('defaultPricing', {}).get('priceSolo', 0)
                    else:
                        # Fallback si l'hôtel n'existe plus dans la banque
                        print(f"⚠️ Hôtel {hotel_id} introuvable dans la banque pour l'étape {day.get('id')}")
                        # Garde les valeurs existantes dans day si présentes
                else:
                    # Étape sans hotelId (ancien format ou erreur)
                    print(f"⚠️ Étape {day.get('id')} sans hotelId")
            
            return days
        except Exception as e:
            print(f"Erreur lors de la récupération des étapes avec hôtels: {e}")
            return []

    def get_day(self, user_id: str, trip_id: str, day_id: str) -> Optional[Dict]:
        """Récupère une étape spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days').document(day_id).get()
            if doc.exists:
                day_data = doc.to_dict()
                day_data['id'] = doc.id
                return day_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération de l'étape: {e}")
            return None
    
    def create_day(self, user_id: str, trip_id: str, day_data: Dict) -> Optional[str]:
        """Crée une nouvelle étape"""
        try:
            day_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days').add(day_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création de l'étape: {e}")
            return None
    
    def update_day(self, user_id: str, trip_id: str, day_id: str, data: Dict) -> bool:
        """Met à jour une étape"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days').document(day_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de l'étape: {e}")
            return False
    
    def delete_day(self, user_id: str, trip_id: str, day_id: str) -> bool:
        """Supprime une étape"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days').document(day_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression de l'étape: {e}")
            return False
    
    # ============================================
    # GESTION DES MÉDIAS
    # ============================================
    
    def get_media(self, user_id: str, media_type: Optional[str] = None, tag: Optional[str] = None) -> List[Dict]:
        """Récupère tous les médias de la banque avec filtres optionnels"""
        try:
            media_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media')
            
            # Filtre par type si fourni
            if media_type:
                media_ref = media_ref.where('type', '==', media_type)
            
            # Filtre par tag si fourni
            if tag:
                media_ref = media_ref.where('tags', 'array_contains', tag)
            
            media = media_ref.order_by('uploadedAt', direction=firestore.Query.DESCENDING).stream()
            
            result = []
            for medium in media:
                media_data = medium.to_dict()
                media_data['id'] = medium.id
                result.append(media_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des médias: {e}")
            return []
    
    def get_user_media(self, user_id: str, media_type: Optional[str] = None) -> List[Dict]:
        """Alias pour get_media - Récupère tous les médias d'un utilisateur"""
        return self.get_media(user_id, media_type)
    
    def get_media_by_id(self, user_id: str, media_id: str) -> Optional[Dict]:
        """Récupère un média spécifique par son ID"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media').document(media_id).get()
            if doc.exists:
                media_data = doc.to_dict()
                media_data['id'] = doc.id
                return media_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du média: {e}")
            return None
    
    def get_trip_media(self, user_id: str, trip_id: str, media_type: Optional[str] = None) -> List[Dict]:
        """Récupère les médias assignés à un voyage"""
        try:
            media_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media')
            query = media_ref.where('assignedTrips', 'array_contains', trip_id)
            
            if media_type:
                query = query.where('type', '==', media_type)
            
            media = query.stream()
            
            result = []
            for medium in media:
                media_data = medium.to_dict()
                media_data['id'] = medium.id
                result.append(media_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des médias du voyage: {e}")
            return []
    
    def get_hotel_photos(self, user_id: str, hotel_name: str) -> List[Dict]:
        """Récupère toutes les photos d'un hôtel (collection globale)"""
        try:
            media_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media')
            media = media_ref.where('type', '==', 'hotel').where('hotelName', '==', hotel_name).stream()

            result = []
            for medium in media:
                media_data = medium.to_dict()
                media_data['id'] = medium.id
                result.append(media_data)

            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des photos d'hôtel: {e}")
            return []
    
    def get_hotel_photos_by_id(self, user_id: str, hotel_id: str) -> List[Dict]:
        """Récupère toutes les photos d'un hôtel par son ID (PHASE 4)"""
        try:
            media_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media')
            media = media_ref.where('type', '==', 'hotel').where('hotelId', '==', hotel_id).stream()
            
            result = []
            for medium in media:
                media_data = medium.to_dict()
                media_data['id'] = medium.id
                result.append(media_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des photos par hotelId: {e}")
            return []
    
    def create_media(self, user_id: str, media_data: Dict) -> Optional[str]:
        """Crée un nouveau média dans la collection globale"""
        try:
            media_data['uploadedAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media').add(media_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du média: {e}")
            return None
    
    def update_media(self, user_id: str, media_id: str, data: Dict) -> bool:
        """Met à jour un média"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media').document(media_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du média: {e}")
            return False
    
    def delete_media(self, user_id: str, media_id: str) -> bool:
        """Supprime un média de Firestore"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/media').document(media_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du média: {e}")
            return False
    
    def assign_media_to_trip(self, user_id: str, media_id: str, trip_id: str) -> bool:
        """Assigne un média à un voyage en l'ajoutant à assignedTrips"""
        try:
            media = self.get_media_by_id(user_id, media_id)
            if not media:
                return False
            
            assigned_trips = media.get('assignedTrips', [])
            
            # Ajoute le trip_id s'il n'est pas déjà présent
            if trip_id not in assigned_trips:
                assigned_trips.append(trip_id)
                self.update_media(user_id, media_id, {'assignedTrips': assigned_trips})
            
            return True
        except Exception as e:
            print(f"Erreur lors de l'assignation du média: {e}")
            return False
    
    def unassign_media_from_trip(self, user_id: str, media_id: str, trip_id: str) -> bool:
        """Désassigne un média d'un voyage en le retirant de assignedTrips"""
        try:
            media = self.get_media_by_id(user_id, media_id)
            if not media:
                return False
            
            assigned_trips = media.get('assignedTrips', [])
            
            # Retire le trip_id s'il est présent
            if trip_id in assigned_trips:
                assigned_trips.remove(trip_id)
                self.update_media(user_id, media_id, {'assignedTrips': assigned_trips})
            
            return True
        except Exception as e:
            print(f"Erreur lors de la désassignation du média: {e}")
            return False
    
    # ============================================
    # GESTION DU STORAGE
    # ============================================
    
    def upload_file(self, file_path: str, destination_path: str) -> Optional[str]:
        """Upload un fichier vers Firebase Storage et retourne l'URL de téléchargement"""
        try:
            blob = self.bucket.blob(destination_path)
            blob.upload_from_filename(file_path)
            blob.make_public()
            return blob.public_url
        except Exception as e:
            print(f"Erreur lors de l'upload du fichier: {e}")
            return None
    
    def upload_file_from_bytes(self, file_bytes: bytes, destination_path: str, content_type: str = 'image/jpeg') -> Optional[str]:
        """Upload un fichier depuis des bytes vers Firebase Storage"""
        try:
            blob = self.bucket.blob(destination_path)
            blob.upload_from_string(file_bytes, content_type=content_type)
            blob.make_public()
            return blob.public_url
        except Exception as e:
            print(f"Erreur lors de l'upload du fichier: {e}")
            return None
    
    def delete_file(self, storage_path: str) -> bool:
        """Supprime un fichier de Firebase Storage"""
        try:
            blob = self.bucket.blob(storage_path)
            blob.delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du fichier: {e}")
            return False
    
    def get_file_url(self, storage_path: str) -> Optional[str]:
        """Récupère l'URL publique d'un fichier"""
        try:
            blob = self.bucket.blob(storage_path)
            return blob.public_url
        except Exception as e:
            print(f"Erreur lors de la récupération de l'URL: {e}")
            return None
    
    # ============================================
    # GESTION DES VOYAGES PUBLIÉS
    # ============================================
    
    def get_published_trip(self, slug: str) -> Optional[Dict]:
        """Récupère un voyage publié par son slug"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug).get()
            if doc.exists:
                trip_data = doc.to_dict()
                trip_data['slug'] = doc.id
                return trip_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du voyage publié: {e}")
            return None
    
    def create_published_trip(self, slug: str, trip_data: Dict) -> bool:
        """Publie un voyage avec un slug unique"""
        try:
            trip_data['publishedAt'] = firestore.SERVER_TIMESTAMP
            
            self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug).set(trip_data)
            return True
        except Exception as e:
            print(f"Erreur lors de la publication du voyage: {e}")
            return False
    
    def update_published_trip(self, slug: str, data: Dict) -> bool:
        """Met à jour un voyage publié"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du voyage publié: {e}")
            return False
    
    def delete_published_trip(self, slug: str) -> bool:
        """Supprime un voyage publié"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du voyage publié: {e}")
            return False
    
    def get_all_published_trips(self) -> List[Dict]:
        """Récupère tous les voyages publiés"""
        try:
            trips_ref = self.db.collection(f'artifacts/{self.app_id}/publishedTrips')
            trips = trips_ref.order_by('publishedAt', direction=firestore.Query.DESCENDING).stream()
            
            result = []
            for trip in trips:
                trip_data = trip.to_dict()
                trip_data['slug'] = trip.id
                result.append(trip_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des voyages publiés: {e}")
            return []
    
    def check_slug_exists(self, slug: str) -> bool:
        """Vérifie si un slug est déjà utilisé"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug).get()
            return doc.exists
        except Exception as e:
            print(f"Erreur lors de la vérification du slug: {e}")
            return False
    
    # ============================================
    # GESTION DES TRANSACTIONS STRIPE
    # ============================================
    
    def create_transaction(self, trip_slug: str, transaction_data: Dict) -> Optional[str]:
        """Enregistre une transaction Stripe dans Firebase"""
        try:
            transaction_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/transactions').add(transaction_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création de la transaction: {e}")
            return None
    
    def increment_trip_checkouts(self, slug: str) -> bool:
        """Incrémente le compteur de checkouts d'un voyage publié"""
        try:
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug)
            doc_ref.update({
                'stats.checkouts': firestore.Increment(1)
            })
            return True
        except Exception as e:
            print(f"Erreur lors de l'incrémentation des checkouts: {e}")
            return False
    
    def increment_trip_views(self, slug: str) -> bool:
        """Incrémente le compteur de vues d'un voyage publié"""
        try:
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/publishedTrips').document(slug)
            doc_ref.update({
                'stats.views': firestore.Increment(1)
            })
            return True
        except Exception as e:
            print(f"Erreur lors de l'incrémentation des vues: {e}")
            return False
    
    # ============================================
    # MÉTHODES UTILITAIRES
    # ============================================
    
    def get_storage(self):
        """Retourne le bucket de storage Firebase"""
        return self.bucket
    
    def get_server_timestamp(self):
        """Retourne le timestamp serveur Firestore"""
        return firestore.SERVER_TIMESTAMP
    
    def add_media(self, user_id: str, media_data: Dict) -> Optional[str]:
        """Alias pour create_media - Ajoute un média dans la collection globale"""
        return self.create_media(user_id, media_data)
    
    # ============================================
    # GESTION DES CLIENTS
    # ============================================
    
    def get_customers(self) -> List[Dict]:
        """Récupère tous les clients"""
        try:
            customers_ref = self.db.collection(f'artifacts/{self.app_id}/customers')
            customers = customers_ref.order_by('name').stream()
            
            result = []
            for customer in customers:
                customer_data = customer.to_dict()
                customer_data['id'] = customer.id
                result.append(customer_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des clients: {e}")
            return []
    
    def get_customer(self, customer_id: str) -> Optional[Dict]:
        """Récupère un client spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/customers').document(customer_id).get()
            if doc.exists:
                customer_data = doc.to_dict()
                customer_data['id'] = doc.id
                return customer_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du client: {e}")
            return None
    
    def create_customer(self, customer_data: Dict) -> Optional[str]:
        """Crée un nouveau client"""
        try:
            customer_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/customers').add(customer_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du client: {e}")
            return None
    
    def update_customer(self, customer_id: str, data: Dict) -> bool:
        """Met à jour un client"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/customers').document(customer_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du client: {e}")
            return False
    
    def delete_customer(self, customer_id: str) -> bool:
        """Supprime un client et toutes ses données associées"""
        try:
            # Supprime d'abord tous les vouchers du client
            vouchers = self.get_customer_vouchers(customer_id)
            for voucher in vouchers:
                self.delete_customer_voucher(customer_id, voucher['id'])
            
            # Supprime toutes les assignations de voyages
            assignments = self.get_customer_trip_assignments(customer_id)
            for assignment in assignments:
                self.unassign_trip_from_customer(customer_id, assignment['id'])
            
            # Supprime le client
            self.db.collection(f'artifacts/{self.app_id}/customers').document(customer_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du client: {e}")
            return False
    
    # ============================================
    # GESTION DES VOYAGES ASSIGNÉS AUX CLIENTS
    # ============================================
    
    def get_customer_trip_assignments(self, customer_id: str) -> List[Dict]:
        """Récupère toutes les assignations de voyages d'un client"""
        try:
            assignments_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/assignedTrips')
            assignments = assignments_ref.order_by('startDate').stream()
            
            result = []
            for assignment in assignments:
                assignment_data = assignment.to_dict()
                assignment_data['id'] = assignment.id
                result.append(assignment_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des assignations: {e}")
            return []
    
    def assign_trip_to_customer(self, customer_id: str, trip_data: Dict) -> Optional[str]:
        """Assigne un voyage à un client"""
        try:
            trip_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/assignedTrips').add(trip_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de l'assignation du voyage: {e}")
            return None
    
    def update_trip_assignment(self, customer_id: str, assignment_id: str, data: Dict) -> bool:
        """Met à jour une assignation de voyage"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/assignedTrips').document(assignment_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de l'assignation: {e}")
            return False
    
    def unassign_trip_from_customer(self, customer_id: str, assignment_id: str) -> bool:
        """Retire un voyage assigné à un client"""
        try:
            # Supprime d'abord tous les vouchers associés à cette assignation
            vouchers = self.get_trip_assignment_vouchers(customer_id, assignment_id)
            for voucher in vouchers:
                self.delete_customer_voucher(customer_id, voucher['id'])
            
            # Supprime l'assignation
            self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/assignedTrips').document(assignment_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors du retrait du voyage: {e}")
            return False
    
    # ============================================
    # GESTION DES VOUCHERS
    # ============================================
    
    def get_customer_vouchers(self, customer_id: str) -> List[Dict]:
        """Récupère tous les vouchers d'un client"""
        try:
            vouchers_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/vouchers')
            vouchers = vouchers_ref.order_by('uploadedAt', direction=firestore.Query.DESCENDING).stream()
            
            result = []
            for voucher in vouchers:
                voucher_data = voucher.to_dict()
                voucher_data['id'] = voucher.id
                result.append(voucher_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des vouchers: {e}")
            return []
    
    def get_trip_assignment_vouchers(self, customer_id: str, assignment_id: str) -> List[Dict]:
        """Récupère les vouchers associés à une assignation de voyage spécifique"""
        try:
            vouchers_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/vouchers')
            vouchers = vouchers_ref.where('assignmentId', '==', assignment_id).stream()
            
            result = []
            for voucher in vouchers:
                voucher_data = voucher.to_dict()
                voucher_data['id'] = voucher.id
                result.append(voucher_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des vouchers de l'assignation: {e}")
            return []
    
    def create_customer_voucher(self, customer_id: str, voucher_data: Dict) -> Optional[str]:
        """Crée un nouveau voucher pour un client"""
        try:
            voucher_data['uploadedAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/vouchers').add(voucher_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du voucher: {e}")
            return None
    
    def delete_customer_voucher(self, customer_id: str, voucher_id: str) -> bool:
        """Supprime un voucher d'un client (Firestore + Storage)"""
        try:
            # Récupère les infos du voucher pour obtenir le storagePath
            doc = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/vouchers').document(voucher_id).get()
            
            if doc.exists:
                voucher_data = doc.to_dict()
                storage_path = voucher_data.get('storagePath')
                
                # Supprime le fichier du Storage
                if storage_path:
                    self.delete_file(storage_path)
                
                # Supprime le document Firestore
                doc.reference.delete()
                return True
            return False
        except Exception as e:
            print(f"Erreur lors de la suppression du voucher: {e}")
            return False
    
    def upload_customer_voucher(self, customer_id: str, file_bytes: bytes, file_name: str, 
                               assignment_id: str = None, content_type: str = 'application/pdf') -> Optional[Dict]:
        """Upload un voucher vers Firebase Storage et enregistre dans Firestore"""
        try:
            from datetime import datetime
            
            # Prépare le chemin de stockage
            timestamp = int(datetime.now().timestamp() * 1000)
            safe_filename = file_name.replace(' ', '_')
            storage_path = f"customers/{customer_id}/vouchers/{timestamp}_{safe_filename}"
            
            # Upload vers Storage
            blob = self.bucket.blob(storage_path)
            blob.upload_from_string(file_bytes, content_type=content_type)
            blob.make_public()
            download_url = blob.public_url
            
            # Prépare les données du voucher
            voucher_data = {
                'fileName': file_name,
                'downloadURL': download_url,
                'storagePath': storage_path,
                'fileSize': len(file_bytes),
                'uploadedAt': firestore.SERVER_TIMESTAMP
            }
            
            # Ajoute l'assignation si fournie
            if assignment_id:
                voucher_data['assignmentId'] = assignment_id
            
            # Enregistre dans Firestore
            voucher_id = self.create_customer_voucher(customer_id, voucher_data)
            
            if voucher_id:
                return {
                    'id': voucher_id,
                    'downloadURL': download_url,
                    'fileName': file_name,
                    'storagePath': storage_path
                }
            
            return None
        except Exception as e:
            print(f"Erreur lors de l'upload du voucher: {e}")
            return None

    # ============================================
    # GESTION DES FICHIERS GPX
    # ============================================

    def get_customer_gpx_files(self, customer_id: str) -> List[Dict]:
        """Récupère tous les fichiers GPX d'un client"""
        try:
            gpx_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/gpxFiles')
            gpx_files = gpx_ref.order_by('uploadedAt', direction=firestore.Query.DESCENDING).stream()

            result = []
            for gpx in gpx_files:
                gpx_data = gpx.to_dict()
                gpx_data['id'] = gpx.id
                result.append(gpx_data)

            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des fichiers GPX: {e}")
            return []

    def get_trip_assignment_gpx_files(self, customer_id: str, assignment_id: str) -> List[Dict]:
        """Récupère les fichiers GPX associés à une assignation de voyage spécifique"""
        try:
            gpx_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/gpxFiles')
            gpx_files = gpx_ref.where('assignmentId', '==', assignment_id).stream()

            result = []
            for gpx in gpx_files:
                gpx_data = gpx.to_dict()
                gpx_data['id'] = gpx.id
                result.append(gpx_data)

            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des fichiers GPX de l'assignation: {e}")
            return []

    def create_customer_gpx_file(self, customer_id: str, gpx_data: Dict) -> Optional[str]:
        """Crée un nouveau fichier GPX pour un client"""
        try:
            gpx_data['uploadedAt'] = firestore.SERVER_TIMESTAMP

            doc_ref = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/gpxFiles').add(gpx_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du fichier GPX: {e}")
            return None

    def delete_customer_gpx_file(self, customer_id: str, gpx_id: str) -> bool:
        """Supprime un fichier GPX d'un client (Firestore + Storage)"""
        try:
            # Récupère les infos du GPX pour obtenir le storagePath
            doc = self.db.collection(f'artifacts/{self.app_id}/customers/{customer_id}/gpxFiles').document(gpx_id).get()

            if doc.exists:
                gpx_data = doc.to_dict()
                storage_path = gpx_data.get('storagePath')

                # Supprime le fichier du Storage
                if storage_path:
                    self.delete_file(storage_path)

                # Supprime le document Firestore
                doc.reference.delete()
                return True
            return False
        except Exception as e:
            print(f"Erreur lors de la suppression du fichier GPX: {e}")
            return False

    def upload_customer_gpx_file(self, customer_id: str, file_bytes: bytes, file_name: str,
                                 assignment_id: str = None) -> Optional[Dict]:
        """Upload un fichier GPX vers Firebase Storage et enregistre dans Firestore"""
        try:
            from datetime import datetime

            # Prépare le chemin de stockage
            timestamp = int(datetime.now().timestamp() * 1000)
            safe_filename = file_name.replace(' ', '_')
            storage_path = f"customers/{customer_id}/gpx/{timestamp}_{safe_filename}"

            # Upload vers Storage
            blob = self.bucket.blob(storage_path)
            blob.upload_from_string(file_bytes, content_type='application/gpx+xml')
            blob.make_public()
            download_url = blob.public_url

            # Prépare les données du GPX
            gpx_data = {
                'fileName': file_name,
                'downloadURL': download_url,
                'storagePath': storage_path,
                'fileSize': len(file_bytes),
                'uploadedAt': firestore.SERVER_TIMESTAMP
            }

            # Ajoute l'assignation si fournie
            if assignment_id:
                gpx_data['assignmentId'] = assignment_id

            # Enregistre dans Firestore
            gpx_id = self.create_customer_gpx_file(customer_id, gpx_data)

            if gpx_id:
                return {
                    'id': gpx_id,
                    'downloadURL': download_url,
                    'fileName': file_name,
                    'storagePath': storage_path
                }

            return None
        except Exception as e:
            print(f"Erreur lors de l'upload du fichier GPX: {e}")
            return None

    # ============================================
    # GESTION DES USERS (AUTHENTIFICATION)
    # ============================================

    def get_user(self, user_id: str):
        """Récupère un utilisateur par son ID"""
        try:
            from app.models import User
            doc = self.db.collection(f'artifacts/{self.app_id}/users').document(user_id).get()
            if doc.exists:
                return User.from_dict(user_id, doc.to_dict())
            return None
        except Exception as e:
            print(f"Erreur récupération user: {e}")
            return None

    def get_user_by_email(self, email: str):
        """Récupère un utilisateur par email"""
        try:
            from app.models import User
            users = self.db.collection(f'artifacts/{self.app_id}/users').where('email', '==', email).limit(1).stream()
            for user in users:
                return User.from_dict(user.id, user.to_dict())
            return None
        except Exception as e:
            print(f"Erreur récupération user par email: {e}")
            return None

    def create_user(self, user_data: Dict) -> Optional[str]:
        """Crée un nouvel utilisateur"""
        try:
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users').add(user_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur création user: {e}")
            return None

    def update_user(self, user_id: str, data: Dict) -> bool:
        """Met à jour un utilisateur"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users').document(user_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur MAJ user: {e}")
            return False

    def user_exists(self, email: str) -> bool:
        """Vérifie si un user existe avec cet email"""
        return self.get_user_by_email(email) is not None

    # ============================================
    # GESTION DES BOOKINGS (RÉSERVATIONS)
    # ============================================

    def get_booking(self, booking_id: str):
        """Récupère une réservation"""
        try:
            from app.models import TripBooking
            doc = self.db.collection(f'artifacts/{self.app_id}/bookings').document(booking_id).get()
            if doc.exists:
                return TripBooking.from_dict(booking_id, doc.to_dict())
            return None
        except Exception as e:
            print(f"Erreur récupération booking: {e}")
            return None

    def get_booking_by_token(self, access_token: str):
        """Récupère une réservation par son token d'accès"""
        try:
            from app.models import TripBooking
            bookings = self.db.collection(f'artifacts/{self.app_id}/bookings').where('accessToken', '==', access_token).limit(1).stream()
            for booking in bookings:
                return TripBooking.from_dict(booking.id, booking.to_dict())
            return None
        except Exception as e:
            print(f"Erreur récupération booking par token: {e}")
            return None

    def get_user_bookings(self, user_id: str) -> List[Dict]:
        """Récupère toutes les réservations d'un utilisateur"""
        try:
            from app.models import TripBooking
            bookings = self.db.collection(f'artifacts/{self.app_id}/bookings').where('organizerUserId', '==', user_id).stream()
            return [TripBooking.from_dict(b.id, b.to_dict()) for b in bookings]
        except Exception as e:
            print(f"Erreur récupération bookings user: {e}")
            return []

    def create_booking(self, booking_data: Dict) -> Optional[str]:
        """Crée une nouvelle réservation"""
        try:
            booking_data['createdAt'] = firestore.SERVER_TIMESTAMP
            booking_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/bookings').add(booking_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur création booking: {e}")
            return None

    def update_booking(self, booking_id: str, data: Dict) -> bool:
        """Met à jour une réservation"""
        try:
            data['updatedAt'] = firestore.SERVER_TIMESTAMP
            self.db.collection(f'artifacts/{self.app_id}/bookings').document(booking_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur MAJ booking: {e}")
            return False

    # ============================================
    # GESTION DES PARTICIPANTS
    # ============================================

    def get_booking_participants(self, booking_id: str) -> List:
        """Récupère tous les participants d'une réservation"""
        try:
            from app.models import Participant
            participants = self.db.collection(f'artifacts/{self.app_id}/bookings/{booking_id}/participants').stream()
            return [Participant.from_dict(p.id, p.to_dict()) for p in participants]
        except Exception as e:
            print(f"Erreur récupération participants: {e}")
            return []

    def get_participant_by_token(self, invitation_token: str):
        """Récupère un participant par son token d'invitation"""
        try:
            from app.models import Participant
            # Recherche dans toutes les réservations
            bookings = self.db.collection(f'artifacts/{self.app_id}/bookings').stream()
            for booking in bookings:
                participants = self.db.collection(f'artifacts/{self.app_id}/bookings/{booking.id}/participants').where('invitationToken', '==', invitation_token).limit(1).stream()
                for p in participants:
                    return Participant.from_dict(p.id, p.to_dict())
            return None
        except Exception as e:
            print(f"Erreur récupération participant par token: {e}")
            return None

    def create_participant(self, booking_id: str, participant_data: Dict) -> Optional[str]:
        """Ajoute un participant à une réservation"""
        try:
            participant_data['createdAt'] = firestore.SERVER_TIMESTAMP
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/bookings/{booking_id}/participants').add(participant_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur création participant: {e}")
            return None

    def update_participant(self, booking_id: str, participant_id: str, data: Dict) -> bool:
        """Met à jour un participant"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/bookings/{booking_id}/participants').document(participant_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur MAJ participant: {e}")
            return False

    def delete_participant(self, booking_id: str, participant_id: str) -> bool:
        """Supprime un participant"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/bookings/{booking_id}/participants').document(participant_id).delete()
            return True
        except Exception as e:
            print(f"Erreur suppression participant: {e}")
            return False

    def count_pilots(self, booking_id: str) -> int:
        """Compte le nombre de pilotes dans une réservation"""
        try:
            participants = self.get_booking_participants(booking_id)
            return sum(1 for p in participants if p.rider_type == 'pilot')
        except Exception as e:
            print(f"Erreur comptage pilotes: {e}")
            return 0
    
    # ============================================
    # GESTION DES DEMANDES DE VOYAGES (TRIP REQUESTS)
    # ============================================
    
    def get_trip_requests(self, user_id: str, status: Optional[str] = None) -> List[Dict]:
        """Récupère toutes les demandes de voyages d'un utilisateur"""
        try:
            requests_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/tripRequests')
            
            if status:
                requests = requests_ref.where('status', '==', status).order_by('requestDate', direction=firestore.Query.DESCENDING).stream()
            else:
                requests = requests_ref.order_by('requestDate', direction=firestore.Query.DESCENDING).stream()
            
            result = []
            for request in requests:
                request_data = request.to_dict()
                request_data['id'] = request.id
                result.append(request_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des demandes: {e}")
            return []
    
    def get_trip_request(self, user_id: str, request_id: str) -> Optional[Dict]:
        """Récupère une demande de voyage spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/tripRequests').document(request_id).get()
            if doc.exists:
                request_data = doc.to_dict()
                request_data['id'] = doc.id
                return request_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération de la demande: {e}")
            return None
    
    def create_trip_request(self, user_id: str, request_data: Dict) -> Optional[str]:
        """Crée une nouvelle demande de voyage"""
        try:
            request_data['requestDate'] = firestore.SERVER_TIMESTAMP
            request_data['status'] = request_data.get('status', 'new')
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/tripRequests').add(request_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création de la demande: {e}")
            return None
    
    def update_trip_request(self, user_id: str, request_id: str, data: Dict) -> bool:
        """Met à jour une demande de voyage"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/tripRequests').document(request_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de la demande: {e}")
            return False
    
    def delete_trip_request(self, user_id: str, request_id: str) -> bool:
        """Supprime une demande de voyage"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/tripRequests').document(request_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression de la demande: {e}")
            return False
    
    def count_new_trip_requests(self, user_id: str) -> int:
        """Compte le nombre de nouvelles demandes non lues"""
        try:
            requests_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/tripRequests')
            requests = requests_ref.where('status', '==', 'new').stream()
            return sum(1 for _ in requests)
        except Exception as e:
            print(f"Erreur lors du comptage des demandes: {e}")
            return 0
    
    def get_trip_stats(self, user_id: str) -> Dict:
        """Calcule les statistiques des voyages pour le dashboard"""
        try:
            trips = self.get_user_trips(user_id)
            
            stats = {
                'total': len(trips),
                'requested': 0,  # Voyages sans étapes
                'draft': 0,      # Avec étapes mais non publiés
                'published': 0    # Publiés
            }
            
            for trip in trips:
                # Vérifie si publié
                if trip.get('publishedSlug'):
                    stats['published'] += 1
                else:
                    # Vérifie si a des étapes
                    days = self.get_trip_days(user_id, trip['id'])
                    if len(days) == 0:
                        stats['requested'] += 1
                    else:
                        stats['draft'] += 1
            
            return stats
        except Exception as e:
            print(f"Erreur lors du calcul des statistiques: {e}")
            return {'total': 0, 'requested': 0, 'draft': 0, 'published': 0}
    
    # ============================================
    # GESTION DES HÔTELS (BANQUE DE DONNÉES)
    # ============================================
    
    def get_hotels(self, user_id: str, partner_ids: List[str] = None) -> List[Dict]:
        """Récupère tous les hôtels de la banque avec filtrage optionnel par partenaires"""
        try:
            hotels_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels')
            
            # ⭐ PHASE 6: Filtrage par partenaires si fourni
            if partner_ids and len(partner_ids) > 0:
                # Firestore array_contains_any supporte max 10 éléments
                hotels_ref = hotels_ref.where('partnerIds', 'array_contains_any', partner_ids[:10])
            
            hotels = hotels_ref.order_by('name').stream()
            
            result = []
            for hotel in hotels:
                hotel_data = hotel.to_dict()
                hotel_data['id'] = hotel.id
                result.append(hotel_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des hôtels: {e}")
            return []
    
    def get_hotel(self, user_id: str, hotel_id: str) -> Optional[Dict]:
        """Récupère un hôtel spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels').document(hotel_id).get()
            if doc.exists:
                hotel_data = doc.to_dict()
                hotel_data['id'] = doc.id
                return hotel_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération de l'hôtel: {e}")
            return None
    
    def get_hotel_by_google_place_id(self, user_id: str, google_place_id: str) -> Optional[Dict]:
        """Récupère un hôtel par son Google Place ID (évite les doublons)"""
        try:
            hotels_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels')
            hotels = hotels_ref.where('googlePlaceId', '==', google_place_id).limit(1).stream()
            
            for hotel in hotels:
                hotel_data = hotel.to_dict()
                hotel_data['id'] = hotel.id
                return hotel_data
            
            return None
        except Exception as e:
            print(f"Erreur lors de la recherche par Google Place ID: {e}")
            return None
    
    def create_hotel(self, user_id: str, hotel_data: Dict) -> Optional[str]:
        """Crée un nouvel hôtel dans la banque"""
        try:
            # Initialise la structure complète
            hotel_doc = {
                'name': hotel_data.get('name'),
                'city': hotel_data.get('city'),
                'address': hotel_data.get('address', ''),
                'googlePlaceId': hotel_data.get('googlePlaceId', ''),
                
                'contact': {
                    'phone': hotel_data.get('contact', {}).get('phone', ''),
                    'email': hotel_data.get('contact', {}).get('email', ''),
                    'website': hotel_data.get('contact', {}).get('website', '')
                },
                
                'defaultPricing': {
                    'priceDouble': float(hotel_data.get('defaultPricing', {}).get('priceDouble', 0)),
                    'priceSolo': float(hotel_data.get('defaultPricing', {}).get('priceSolo', 0)),
                    'currency': 'EUR'
                },
                
                'photos': hotel_data.get('photos', []),
                
                'ratings': {
                    'averageRating': 0.0,
                    'totalRatings': 0,
                    'lastRatingAt': None
                },
                
                'usageStats': {
                    'usedInTrips': [],
                    'usedCount': 0,
                    'lastUsed': None
                },
                
                'createdAt': firestore.SERVER_TIMESTAMP,
                'createdBy': user_id,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels').add(hotel_doc)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création de l'hôtel: {e}")
            return None
    
    def update_hotel(self, user_id: str, hotel_id: str, data: Dict) -> bool:
        """Met à jour un hôtel"""
        try:
            data['updatedAt'] = firestore.SERVER_TIMESTAMP
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels').document(hotel_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de l'hôtel: {e}")
            return False
    
    def delete_hotel(self, user_id: str, hotel_id: str) -> bool:
        """Supprime un hôtel (vérifie qu'il n'est pas utilisé)"""
        try:
            # Vérifie l'utilisation
            hotel = self.get_hotel(user_id, hotel_id)
            if hotel and hotel.get('usageStats', {}).get('usedCount', 0) > 0:
                print(f"Impossible de supprimer l'hôtel: utilisé dans {hotel['usageStats']['usedCount']} voyage(s)")
                return False
            
            # Supprime toutes les reviews
            reviews = self.get_hotel_reviews(user_id, hotel_id)
            for review in reviews:
                self.delete_hotel_review(user_id, hotel_id, review['id'])
            
            # Supprime l'hôtel
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels').document(hotel_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression de l'hôtel: {e}")
            return False
    
    def search_hotels(self, user_id: str, query: str, city: Optional[str] = None) -> List[Dict]:
        """Recherche des hôtels par nom ou ville"""
        try:
            hotels = self.get_hotels(user_id)
            query_lower = query.lower()
            
            results = []
            for hotel in hotels:
                name_match = query_lower in hotel.get('name', '').lower()
                city_match = city is None or city.lower() in hotel.get('city', '').lower()
                
                if name_match and city_match:
                    results.append(hotel)
            
            return results
        except Exception as e:
            print(f"Erreur lors de la recherche d'hôtels: {e}")
            return []
    
    def increment_hotel_usage(self, user_id: str, hotel_id: str, trip_id: str) -> bool:
        """Incrémente les statistiques d'utilisation d'un hôtel"""
        try:
            hotel = self.get_hotel(user_id, hotel_id)
            if not hotel:
                return False
            
            used_in_trips = hotel.get('usageStats', {}).get('usedInTrips', [])
            
            # Ajoute le trip_id s'il n'est pas déjà présent
            if trip_id not in used_in_trips:
                used_in_trips.append(trip_id)
            
            self.update_hotel(user_id, hotel_id, {
                'usageStats.usedInTrips': used_in_trips,
                'usageStats.usedCount': len(used_in_trips),
                'usageStats.lastUsed': firestore.SERVER_TIMESTAMP
            })
            
            return True
        except Exception as e:
            print(f"Erreur lors de l'incrémentation de l'utilisation: {e}")
            return False
    
    def decrement_hotel_usage(self, user_id: str, hotel_id: str, trip_id: str) -> bool:
        """Décrémente les statistiques d'utilisation d'un hôtel"""
        try:
            hotel = self.get_hotel(user_id, hotel_id)
            if not hotel:
                return False
            
            used_in_trips = hotel.get('usageStats', {}).get('usedInTrips', [])
            
            # Retire le trip_id s'il est présent
            if trip_id in used_in_trips:
                used_in_trips.remove(trip_id)
            
            self.update_hotel(user_id, hotel_id, {
                'usageStats.usedInTrips': used_in_trips,
                'usageStats.usedCount': len(used_in_trips),
                'usageStats.lastUsed': firestore.SERVER_TIMESTAMP if len(used_in_trips) > 0 else None
            })
            
            return True
        except Exception as e:
            print(f"Erreur lors de la décrémentation de l'utilisation: {e}")
            return False
    
    # ============================================
    # GESTION DES RESTAURANTS
    # ============================================

    def get_restaurants(self, user_id: str, partner_ids: List[str] = None) -> List[Dict]:
        """Récupère tous les restaurants de la banque avec filtrage optionnel par partenaires"""
        try:
            restaurants_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/restaurants')
            
            # ⭐ PHASE 6: Filtrage par partenaires si fourni
            if partner_ids and len(partner_ids) > 0:
                # Firestore array_contains_any supporte max 10 éléments
                restaurants_ref = restaurants_ref.where('partnerIds', 'array_contains_any', partner_ids[:10])
            
            restaurants = restaurants_ref.order_by('name').stream()
            
            result = []
            for restaurant in restaurants:
                restaurant_data = restaurant.to_dict()
                restaurant_data['id'] = restaurant.id
                result.append(restaurant_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des restaurants: {e}")
            return []

    def get_restaurant(self, user_id: str, restaurant_id: str) -> Optional[Dict]:
        """Récupère un restaurant spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/restaurants').document(restaurant_id).get()
            if doc.exists:
                restaurant_data = doc.to_dict()
                restaurant_data['id'] = doc.id
                return restaurant_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du restaurant: {e}")
            return None

    def create_restaurant(self, user_id: str, restaurant_data: Dict) -> Optional[str]:
        """Crée un nouveau restaurant dans la banque"""
        try:
            restaurant_doc = {
                'name': restaurant_data.get('name'),
                'city': restaurant_data.get('city'),
                'address': restaurant_data.get('address', ''),
                'googlePlaceId': restaurant_data.get('googlePlaceId', ''),
                'cuisineType': restaurant_data.get('cuisineType', ''),
                'contact': {
                    'phone': restaurant_data.get('contact', {}).get('phone', ''),
                    'website': restaurant_data.get('contact', {}).get('website', '')
                },
                'photos': restaurant_data.get('photos', []),
                'ratings': {
                    'averageRating': 0.0,
                    'totalRatings': 0,
                    'lastRatingAt': None
                },
                'usageStats': {
                    'usedInTrips': [],
                    'usedCount': 0,
                    'lastUsed': None
                },
                'createdAt': firestore.SERVER_TIMESTAMP,
                'createdBy': user_id,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/restaurants').add(restaurant_doc)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du restaurant: {e}")
            return None

    def update_restaurant(self, user_id: str, restaurant_id: str, data: Dict) -> bool:
        """Met à jour un restaurant"""
        try:
            data['updatedAt'] = firestore.SERVER_TIMESTAMP
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/restaurants').document(restaurant_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du restaurant: {e}")
            return False

    def delete_restaurant(self, user_id: str, restaurant_id: str) -> bool:
        """Supprime un restaurant"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/restaurants').document(restaurant_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du restaurant: {e}")
            return False

    def search_restaurants(self, user_id: str, query: str, city: Optional[str] = None) -> List[Dict]:
        """Recherche des restaurants par nom ou ville"""
        try:
            restaurants = self.get_restaurants(user_id)
            query_lower = query.lower()
            
            results = []
            for restaurant in restaurants:
                name_match = query_lower in restaurant.get('name', '').lower()
                city_match = city is None or city.lower() in restaurant.get('city', '').lower()
                
                if name_match and city_match:
                    results.append(restaurant)
            
            return results
        except Exception as e:
            print(f"Erreur lors de la recherche de restaurants: {e}")
            return []

    # ============================================
    # GESTION DES SUGGESTIONS DE RESTAURANTS (PAR JOUR)
    # ============================================

    def get_day_restaurant_suggestions(self, user_id: str, trip_id: str, day_id: str) -> List[Dict]:
        """Récupère toutes les suggestions de restaurants pour un jour"""
        try:
            suggestions_ref = self.db.collection(
                f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days/{day_id}/restaurantSuggestions'
            )
            suggestions = suggestions_ref.order_by('createdAt').stream()
            
            result = []
            for suggestion in suggestions:
                suggestion_data = suggestion.to_dict()
                suggestion_data['id'] = suggestion.id
                
                # Enrichit avec les données complètes du restaurant
                restaurant_id = suggestion_data.get('restaurantId')
                if restaurant_id:
                    restaurant = self.get_restaurant(user_id, restaurant_id)
                    if restaurant:
                        suggestion_data['restaurant'] = restaurant
                
                result.append(suggestion_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des suggestions: {e}")
            return []

    def add_restaurant_suggestion(self, user_id: str, trip_id: str, day_id: str, restaurant_id: str, day_date: str = None) -> Optional[str]:
        """Ajoute une suggestion de restaurant à un jour"""
        try:
            # Vérifie que le restaurant existe
            restaurant = self.get_restaurant(user_id, restaurant_id)
            if not restaurant:
                print(f"Restaurant {restaurant_id} non trouvé")
                return None
            
            suggestion_data = {
                'restaurantId': restaurant_id,
                'dayDate': day_date,  # Date optionnelle pour le jour
                'createdAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection(
                f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days/{day_id}/restaurantSuggestions'
            ).add(suggestion_data)
            
            # Incrémente les stats d'utilisation du restaurant
            self.increment_restaurant_usage(user_id, restaurant_id, trip_id)
            
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de l'ajout de la suggestion: {e}")
            return None

    def remove_restaurant_suggestion(self, user_id: str, trip_id: str, day_id: str, suggestion_id: str) -> bool:
        """Retire une suggestion de restaurant"""
        try:
            # Récupère la suggestion pour obtenir le restaurant_id
            doc = self.db.collection(
                f'artifacts/{self.app_id}/users/{user_id}/trips/{trip_id}/days/{day_id}/restaurantSuggestions'
            ).document(suggestion_id).get()
            
            if doc.exists:
                suggestion_data = doc.to_dict()
                restaurant_id = suggestion_data.get('restaurantId')
                
                # Supprime la suggestion
                doc.reference.delete()
                
                # Décrémente les stats d'utilisation du restaurant
                if restaurant_id:
                    self.decrement_restaurant_usage(user_id, restaurant_id, trip_id)
                
                return True
            return False
        except Exception as e:
            print(f"Erreur lors de la suppression de la suggestion: {e}")
            return False

    def increment_restaurant_usage(self, user_id: str, restaurant_id: str, trip_id: str) -> bool:
        """Incrémente les statistiques d'utilisation d'un restaurant"""
        try:
            restaurant = self.get_restaurant(user_id, restaurant_id)
            if not restaurant:
                return False
            
            used_in_trips = restaurant.get('usageStats', {}).get('usedInTrips', [])
            
            # Ajoute le trip_id s'il n'est pas déjà présent
            if trip_id not in used_in_trips:
                used_in_trips.append(trip_id)
            
            self.update_restaurant(user_id, restaurant_id, {
                'usageStats.usedInTrips': used_in_trips,
                'usageStats.usedCount': len(used_in_trips),
                'usageStats.lastUsed': firestore.SERVER_TIMESTAMP
            })
            
            return True
        except Exception as e:
            print(f"Erreur lors de l'incrémentation de l'utilisation: {e}")
            return False

    def decrement_restaurant_usage(self, user_id: str, restaurant_id: str, trip_id: str) -> bool:
        """Décrémente les statistiques d'utilisation d'un restaurant"""
        try:
            restaurant = self.get_restaurant(user_id, restaurant_id)
            if not restaurant:
                return False
            
            used_in_trips = restaurant.get('usageStats', {}).get('usedInTrips', [])
            
            # Retire le trip_id s'il est présent
            if trip_id in used_in_trips:
                used_in_trips.remove(trip_id)
            
            self.update_restaurant(user_id, restaurant_id, {
                'usageStats.usedInTrips': used_in_trips,
                'usageStats.usedCount': len(used_in_trips),
                'usageStats.lastUsed': firestore.SERVER_TIMESTAMP if len(used_in_trips) > 0 else None
            })
            
            return True
        except Exception as e:
            print(f"Erreur lors de la décrémentation de l'utilisation: {e}")
            return False

    # ============================================
    # GESTION DES REVIEWS/ÉVALUATIONS D'HÔTELS
    # ============================================
    
    def get_hotel_reviews(self, user_id: str, hotel_id: str) -> List[Dict]:
        """Récupère toutes les évaluations d'un hôtel"""
        try:
            reviews_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels/{hotel_id}/reviews')
            reviews = reviews_ref.order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
            
            result = []
            for review in reviews:
                review_data = review.to_dict()
                review_data['id'] = review.id
                result.append(review_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des avis: {e}")
            return []
    
    def get_hotel_review(self, user_id: str, hotel_id: str, review_id: str) -> Optional[Dict]:
        """Récupère une évaluation spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels/{hotel_id}/reviews').document(review_id).get()
            if doc.exists:
                review_data = doc.to_dict()
                review_data['id'] = doc.id
                return review_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération de l'avis: {e}")
            return None
    
    def add_hotel_review(self, user_id: str, hotel_id: str, review_data: Dict) -> Optional[str]:
        """Ajoute une évaluation pour un hôtel"""
        try:
            review_doc = {
                'customerId': review_data.get('customerId'),
                'customerName': review_data.get('customerName'),
                'rating': int(review_data.get('rating', 0)),  # 1-5
                'comment': review_data.get('comment', ''),
                'tripId': review_data.get('tripId'),
                'visitDate': review_data.get('visitDate'),
                'createdAt': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels/{hotel_id}/reviews').add(review_doc)
            review_id = doc_ref[1].id
            
            # Recalcule la moyenne
            self.calculate_hotel_average_rating(user_id, hotel_id)
            
            return review_id
        except Exception as e:
            print(f"Erreur lors de l'ajout de l'avis: {e}")
            return None
    
    def update_hotel_review(self, user_id: str, hotel_id: str, review_id: str, data: Dict) -> bool:
        """Met à jour une évaluation"""
        try:
            data['updatedAt'] = firestore.SERVER_TIMESTAMP
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels/{hotel_id}/reviews').document(review_id).update(data)
            
            # Recalcule la moyenne
            self.calculate_hotel_average_rating(user_id, hotel_id)
            
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour de l'avis: {e}")
            return False
    
    def delete_hotel_review(self, user_id: str, hotel_id: str, review_id: str) -> bool:
        """Supprime une évaluation"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels/{hotel_id}/reviews').document(review_id).delete()
            
            # Recalcule la moyenne
            self.calculate_hotel_average_rating(user_id, hotel_id)
            
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression de l'avis: {e}")
            return False
    
    def calculate_hotel_average_rating(self, user_id: str, hotel_id: str) -> float:
        """Calcule et met à jour la moyenne des notes d'un hôtel"""
        try:
            reviews = self.get_hotel_reviews(user_id, hotel_id)
            
            if not reviews:
                # Aucun avis : note à 0
                self.update_hotel(user_id, hotel_id, {
                    'ratings.averageRating': 0.0,
                    'ratings.totalRatings': 0,
                    'ratings.lastRatingAt': None
                })
                return 0.0
            
            # Calcule la moyenne
            total = sum(review.get('rating', 0) for review in reviews)
            average = total / len(reviews)
            
            # Récupère la date du dernier avis
            last_review = reviews[0]  # Déjà triés par date DESC
            last_rating_date = last_review.get('createdAt')
            
            # Met à jour l'hôtel
            self.update_hotel(user_id, hotel_id, {
                'ratings.averageRating': round(average, 1),
                'ratings.totalRatings': len(reviews),
                'ratings.lastRatingAt': last_rating_date
            })
            
            return round(average, 1)
        except Exception as e:
            print(f"Erreur lors du calcul de la moyenne: {e}")
            return 0.0
    
    def get_customer_review_for_hotel(self, user_id: str, hotel_id: str, customer_id: str) -> Optional[Dict]:
        """Récupère l'avis d'un client spécifique pour un hôtel (pour éviter les doublons)"""
        try:
            reviews_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels/{hotel_id}/reviews')
            reviews = reviews_ref.where('customerId', '==', customer_id).limit(1).stream()
            
            for review in reviews:
                review_data = review.to_dict()
                review_data['id'] = review.id
                return review_data
            
            return None
        except Exception as e:
            print(f"Erreur lors de la recherche de l'avis client: {e}")
            return None
    
    # ============================================
    # GESTION DES PARTENAIRES (PARTNERS)
    # ============================================
    
    def get_partners(self, active_only: bool = True) -> List[Dict]:
        """Récupère tous les partenaires (collection globale)"""
        try:
            partners_ref = self.db.collection(f'artifacts/{self.app_id}/partners')
            
            if active_only:
                partners = partners_ref.where('isActive', '==', True).stream()
            else:
                partners = partners_ref.stream()
            
            result = []
            for partner in partners:
                partner_data = partner.to_dict()
                partner_data['id'] = partner.id
                result.append(partner_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des partenaires: {e}")
            return []
    
    def get_partner(self, partner_id: str) -> Optional[Dict]:
        """Récupère un partenaire spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/partners').document(partner_id).get()
            if doc.exists:
                partner_data = doc.to_dict()
                partner_data['id'] = doc.id
                return partner_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du partenaire: {e}")
            return None
    
    def create_partner(self, partner_data: Dict) -> Optional[str]:
        """Crée un nouveau partenaire (collection globale)"""
        try:
            partner_data['createdAt'] = firestore.SERVER_TIMESTAMP
            
            # Si un partnerId est fourni, l'utilise comme ID du document
            partner_id = partner_data.pop('partnerId', None)
            
            if partner_id:
                self.db.collection(f'artifacts/{self.app_id}/partners').document(partner_id).set(partner_data)
                return partner_id
            else:
                doc_ref = self.db.collection(f'artifacts/{self.app_id}/partners').add(partner_data)
                return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du partenaire: {e}")
            return None
    
    def update_partner(self, partner_id: str, data: Dict) -> bool:
        """Met à jour un partenaire"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/partners').document(partner_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du partenaire: {e}")
            return False
    
    def delete_partner(self, partner_id: str) -> bool:
        """Supprime un partenaire"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/partners').document(partner_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du partenaire: {e}")
            return False
    
    # ============================================
    # GESTION DES POIs (POINTS D'INTÉRÊT)
    # ============================================
    
    def get_pois(self, partner_ids: List[str] = None, city: str = None, category: str = None) -> List[Dict]:
        """Récupère les POIs avec filtres optionnels (collection globale)"""
        try:
            pois_ref = self.db.collection(f'artifacts/{self.app_id}/pois')
            
            # Filtre par partenaires si fourni
            if partner_ids and len(partner_ids) > 0:
                pois_ref = pois_ref.where('partnerIds', 'array_contains_any', partner_ids)
            
            pois = pois_ref.stream()
            
            result = []
            for poi in pois:
                poi_data = poi.to_dict()
                poi_data['id'] = poi.id
                
                # Filtres côté client (car Firestore limite les filtres composés)
                if city and poi_data.get('city', '').lower() != city.lower():
                    continue
                
                if category and poi_data.get('category') != category:
                    continue
                
                result.append(poi_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors de la récupération des POIs: {e}")
            return []
    
    def get_poi(self, poi_id: str) -> Optional[Dict]:
        """Récupère un POI spécifique"""
        try:
            doc = self.db.collection(f'artifacts/{self.app_id}/pois').document(poi_id).get()
            if doc.exists:
                poi_data = doc.to_dict()
                poi_data['id'] = doc.id
                return poi_data
            return None
        except Exception as e:
            print(f"Erreur lors de la récupération du POI: {e}")
            return None
    
    def create_poi(self, poi_data: Dict) -> Optional[str]:
        """Crée un nouveau POI (collection globale)"""
        try:
            poi_data['createdAt'] = firestore.SERVER_TIMESTAMP
            poi_data['updatedAt'] = firestore.SERVER_TIMESTAMP
            
            doc_ref = self.db.collection(f'artifacts/{self.app_id}/pois').add(poi_data)
            return doc_ref[1].id
        except Exception as e:
            print(f"Erreur lors de la création du POI: {e}")
            return None
    
    def update_poi(self, poi_id: str, data: Dict) -> bool:
        """Met à jour un POI"""
        try:
            data['updatedAt'] = firestore.SERVER_TIMESTAMP
            self.db.collection(f'artifacts/{self.app_id}/pois').document(poi_id).update(data)
            return True
        except Exception as e:
            print(f"Erreur lors de la mise à jour du POI: {e}")
            return False
    
    def delete_poi(self, poi_id: str) -> bool:
        """Supprime un POI"""
        try:
            self.db.collection(f'artifacts/{self.app_id}/pois').document(poi_id).delete()
            return True
        except Exception as e:
            print(f"Erreur lors de la suppression du POI: {e}")
            return False
    
    def get_pois_near(self, city: str, radius_km: int = 20, partner_ids: List[str] = None) -> List[Dict]:
        """Récupère les POIs à proximité d'une ville (utilise coordonnées + calcul distance)"""
        try:
            import math
            
            # Récupère tous les POIs (avec filtre partenaire si fourni)
            all_pois = self.get_pois(partner_ids=partner_ids)
            
            # Pour simplicité, filtre par ville exacte
            # TODO: Implémenter géocodage ville → lat/lng + calcul distance Haversine
            nearby_pois = []
            city_lower = city.lower()
            
            for poi in all_pois:
                poi_city = poi.get('city', '').lower()
                
                # Match exact ou ville contenue
                if city_lower in poi_city or poi_city in city_lower:
                    nearby_pois.append(poi)
            
            return nearby_pois
        except Exception as e:
            print(f"Erreur lors de la recherche de POIs à proximité: {e}")
            return []
    
    # ============================================
    # FILTRAGE PAR PARTENAIRES
    # ============================================
    
    def get_hotels_by_partners(self, user_id: str, partner_ids: List[str]) -> List[Dict]:
        """Récupère les hébergements d'un ou plusieurs partenaires"""
        try:
            if not partner_ids or len(partner_ids) == 0:
                return self.get_hotels(user_id)
            
            hotels_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/hotels')
            hotels_ref = hotels_ref.where('partnerIds', 'array_contains_any', partner_ids)
            hotels = hotels_ref.stream()
            
            result = []
            for hotel in hotels:
                hotel_data = hotel.to_dict()
                hotel_data['id'] = hotel.id
                result.append(hotel_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors du filtrage des hôtels par partenaires: {e}")
            return []
    
    def get_restaurants_by_partners(self, user_id: str, partner_ids: List[str]) -> List[Dict]:
        """Récupère les restaurants d'un ou plusieurs partenaires"""
        try:
            if not partner_ids or len(partner_ids) == 0:
                return self.get_restaurants(user_id)
            
            restaurants_ref = self.db.collection(f'artifacts/{self.app_id}/users/{user_id}/restaurants')
            restaurants_ref = restaurants_ref.where('partnerIds', 'array_contains_any', partner_ids)
            restaurants = restaurants_ref.stream()
            
            result = []
            for restaurant in restaurants:
                restaurant_data = restaurant.to_dict()
                restaurant_data['id'] = restaurant.id
                result.append(restaurant_data)
            
            return result
        except Exception as e:
            print(f"Erreur lors du filtrage des restaurants par partenaires: {e}")
            return []
