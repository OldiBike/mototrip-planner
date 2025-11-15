"""
Fonctions utilitaires pour l'application
"""
import re
import random
import string
from typing import Optional
from unicodedata import normalize


def slugify(text: str) -> str:
    """
    Convertit un texte en slug URL-friendly
    
    Exemple:
        "Alpes 10 jours" -> "alpes-10-jours"
        "Route des Cols Suisses" -> "route-des-cols-suisses"
    """
    # Normalise les caractères Unicode (enlève les accents)
    text = normalize('NFKD', text).encode('ascii', 'ignore').decode('utf-8')
    
    # Convertit en minuscules et remplace les espaces/caractères spéciaux par des tirets
    text = re.sub(r'[^\w\s-]', '', text.lower())
    text = re.sub(r'[-\s]+', '-', text)
    
    # Enlève les tirets en début et fin
    return text.strip('-')


def generate_unique_slug(base_text: str, existing_slugs: list) -> str:
    """
    Génère un slug unique en ajoutant un suffixe numérique si nécessaire
    
    Args:
        base_text: Le texte de base pour le slug
        existing_slugs: Liste des slugs déjà existants
    
    Returns:
        Un slug unique
    """
    base_slug = slugify(base_text)
    
    if base_slug not in existing_slugs:
        return base_slug
    
    # Ajoute un suffixe numérique
    counter = 1
    while f"{base_slug}-{counter}" in existing_slugs:
        counter += 1
    
    return f"{base_slug}-{counter}"


def generate_access_code(length: int = 6) -> str:
    """
    Génère un code d'accès aléatoire composé de chiffres
    
    Args:
        length: Longueur du code (par défaut 6)
    
    Returns:
        Un code numérique aléatoire
    """
    return ''.join(random.choices(string.digits, k=length))


def validate_access_code(code: str, expected_length: int = 6) -> bool:
    """
    Valide un code d'accès
    
    Args:
        code: Le code à valider
        expected_length: Longueur attendue du code
    
    Returns:
        True si le code est valide, False sinon
    """
    if not code:
        return False
    
    # Vérifie que le code ne contient que des chiffres
    if not code.isdigit():
        return False
    
    # Vérifie la longueur
    if len(code) != expected_length:
        return False
    
    return True


def format_price(price: float) -> str:
    """
    Formate un prix en euros avec 2 décimales
    
    Args:
        price: Le prix à formater
    
    Returns:
        Le prix formaté (ex: "1234.56€")
    """
    return f"{price:.2f}€"


def calculate_trip_costs(days: list) -> dict:
    """
    Calcule les coûts totaux d'un voyage
    
    Args:
        days: Liste des étapes du voyage avec priceDouble et priceSolo
    
    Returns:
        Dictionnaire avec les coûts calculés
    """
    total_double = sum(day.get('priceDouble', 0) for day in days)
    total_solo = sum(day.get('priceSolo', 0) for day in days)
    
    # Coût par personne en chambre double
    cost_double_per_person = total_double / 2 if total_double > 0 else 0
    
    return {
        'total_double': total_double,
        'total_solo': total_solo,
        'cost_double_per_person': cost_double_per_person
    }


def calculate_sale_prices(costs: dict, sale_price_per_person: float) -> dict:
    """
    Calcule les prix de vente et marges
    
    Args:
        costs: Dictionnaire des coûts (de calculate_trip_costs)
        sale_price_per_person: Prix de vente par personne
    
    Returns:
        Dictionnaire avec les prix de vente et marges
    """
    # Prix de vente pour une chambre double (2 personnes)
    sale_double = sale_price_per_person * 2
    
    # Calcul de la marge par personne
    margin_per_person = sale_price_per_person - costs['cost_double_per_person']
    
    # Calcul du pourcentage de marge
    margin_percent = 0
    if costs['cost_double_per_person'] > 0:
        margin_percent = (margin_per_person / costs['cost_double_per_person']) * 100
    
    # Prix de vente solo (applique la même marge en pourcentage)
    margin_multiplier = 1 + (margin_percent / 100)
    sale_solo = costs['total_solo'] * margin_multiplier
    
    return {
        'sale_double': sale_double,
        'sale_solo': sale_solo,
        'sale_price_per_person': sale_price_per_person,
        'margin_per_person': margin_per_person,
        'margin_percent': margin_percent
    }


def sanitize_filename(filename: str) -> str:
    """
    Nettoie un nom de fichier pour le rendre sûr
    
    Args:
        filename: Le nom de fichier à nettoyer
    
    Returns:
        Un nom de fichier sécurisé
    """
    # Remplace les caractères dangereux
    filename = re.sub(r'[^\w\s.-]', '', filename)
    # Limite la longueur
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:255 - len(ext) - 1] + '.' + ext if ext else name[:255]
    
    return filename


def parse_ratehawk_url(url: str) -> Optional[dict]:
    """
    Extrait la ville et le nom de l'hôtel depuis une URL RateHawk
    
    Args:
        url: L'URL RateHawk
    
    Returns:
        Dictionnaire avec 'city' et 'hotelName' ou None si parsing échoue
    
    Exemple:
        "https://www.ratehawk.com/hotel/france/chemaudin/mid9010270/hotel_akena_besancon/"
        -> {'city': 'Chemaudin', 'hotelName': 'Hotel Akena Besancon'}
    """
    try:
        # Format URL: /hotel/pays/ville/id/nom-hotel/
        pattern = r'/hotel/([^/]+)/([^/]+)/([^/]+)/([^/]+)/?'
        match = re.search(pattern, url)
        
        if match:
            country = match.group(1)
            city = match.group(2)
            hotel_id = match.group(3)
            hotel_slug = match.group(4)
            
            # Nettoie et formate
            city_clean = city.replace('_', ' ').replace('-', ' ')
            hotel_clean = hotel_slug.replace('_', ' ').replace('-', ' ')
            
            # Capitalise
            city_formatted = ' '.join(word.capitalize() for word in city_clean.split())
            hotel_formatted = ' '.join(word.capitalize() for word in hotel_clean.split())
            
            return {
                'city': city_formatted,
                'hotelName': hotel_formatted
            }
    except Exception as e:
        print(f"Erreur lors du parsing de l'URL RateHawk: {e}")
    
    return None


def format_duration(nights: int) -> str:
    """
    Formate une durée en nuits
    
    Args:
        nights: Nombre de nuits
    
    Returns:
        Texte formaté (ex: "2 nuits")
    """
    if nights == 1:
        return "1 nuit"
    return f"{nights} nuits"


def get_file_extension(filename: str) -> str:
    """
    Récupère l'extension d'un fichier
    
    Args:
        filename: Nom du fichier
    
    Returns:
        L'extension (en minuscules, sans le point)
    """
    if '.' in filename:
        return filename.rsplit('.', 1)[1].lower()
    return ''


def is_image_file(filename: str) -> bool:
    """
    Vérifie si un fichier est une image
    
    Args:
        filename: Nom du fichier
    
    Returns:
        True si c'est une image, False sinon
    """
    image_extensions = {'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'}
    ext = get_file_extension(filename)
    return ext in image_extensions


def bytes_to_mb(bytes_size: int) -> float:
    """
    Convertit des bytes en mégabytes
    
    Args:
        bytes_size: Taille en bytes
    
    Returns:
        Taille en MB arrondie à 2 décimales
    """
    return round(bytes_size / (1024 * 1024), 2)


def mb_to_bytes(mb_size: float) -> int:
    """
    Convertit des mégabytes en bytes
    
    Args:
        mb_size: Taille en MB
    
    Returns:
        Taille en bytes
    """
    return int(mb_size * 1024 * 1024)
