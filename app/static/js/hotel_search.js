/**
 * hotel_search.js
 * Gestion de la recherche d'hôtels moto-friendly avec autocomplétion
 */

// État global
let currentHotels = [];
let selectedHotel = null;
let selectedRegionId = null;
let debounceTimer = null;

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    initSearchForm();
    initAutocomplete();
    setDefaultDates();
});

/**
 * Initialise le formulaire de recherche
 */
function initSearchForm() {
    const form = document.getElementById('hotelSearchForm');
    if (!form) return;
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        performSearch();
    });
}

/**
 * Initialise l'autocomplétion sur le champ ville
 */
function initAutocomplete() {
    const input = document.getElementById('cityRegion');
    if (!input) {
        console.error('❌ Input #cityRegion not found!');
        return;
    }
    
    console.log('✅ Initializing autocomplete on input:', input);
    
    // S'assurer que le parent a position: relative
    input.parentNode.style.position = 'relative';
    
    // Créer le conteneur de suggestions
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.id = 'citySuggestions';
    suggestionsDiv.className = 'autocomplete-suggestions';
    input.parentNode.appendChild(suggestionsDiv);
    
    console.log('✅ Suggestions div created:', suggestionsDiv);
    
    // Écouter les entrées clavier
    input.addEventListener('input', function() {
        const query = input.value.trim();
        
        // Réinitialiser le region_id si l'utilisateur modifie
        selectedRegionId = null;
        
        if (query.length < 2) {
            hideSuggestions();
            return;
        }
        
        // Debounce pour éviter trop de requêtes
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchSuggestions(query);
        }, 300);
    });
    
    // Fermer les suggestions si on clique ailleurs
    document.addEventListener('click', function(e) {
        if (e.target !== input && !suggestionsDiv.contains(e.target)) {
            hideSuggestions();
        }
    });
}

/**
 * Récupère les suggestions depuis l'API
 */
async function fetchSuggestions(query) {
    console.log('🔍 Fetching suggestions for:', query);
    const suggestionsDiv = document.getElementById('citySuggestions');
    
    try {
        suggestionsDiv.innerHTML = '<div class="suggestion-item loading">Recherche...</div>';
        suggestionsDiv.style.display = 'block';
        console.log('📡 Calling API...');
        
        const response = await fetch(`/api/hotels/suggest?q=${encodeURIComponent(query)}&lang=en`);
        const data = await response.json();
        
        console.log('📨 API Response:', data);
        console.log('📊 Suggestions count:', data.suggestions ? data.suggestions.length : 0);
        
        if (data.status === 'success' && data.suggestions.length > 0) {
            console.log('✅ Displaying', data.suggestions.length, 'suggestions');
            displaySuggestions(data.suggestions);
        } else {
            console.log('⚠️ No suggestions found');
            suggestionsDiv.innerHTML = '<div class="suggestion-item no-results">Aucun résultat trouvé</div>';
        }
        
    } catch (error) {
        console.error('❌ Error fetching suggestions:', error);
        suggestionsDiv.innerHTML = '<div class="suggestion-item error">Erreur lors de la recherche</div>';
    }
}

/**
 * Affiche les suggestions
 */
function displaySuggestions(suggestions) {
    console.log('🎨 displaySuggestions called with:', suggestions);
    const suggestionsDiv = document.getElementById('citySuggestions');
    suggestionsDiv.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        console.log('➕ Adding suggestion:', suggestion.display);
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion.display;
        item.dataset.type = suggestion.type;
        item.dataset.id = suggestion.id;
        item.dataset.regionId = suggestion.region_id || suggestion.id;
        
        item.addEventListener('click', function() {
            selectSuggestion(suggestion);
        });
        
        suggestionsDiv.appendChild(item);
    });
    
    suggestionsDiv.style.display = 'block';
    console.log('✅ Suggestions div displayed, children count:', suggestionsDiv.children.length);
    console.log('📏 Suggestions div dimensions:', {
        width: suggestionsDiv.offsetWidth,
        height: suggestionsDiv.offsetHeight,
        display: suggestionsDiv.style.display,
        position: window.getComputedStyle(suggestionsDiv).position
    });
}

/**
 * Sélectionne une suggestion
 */
function selectSuggestion(suggestion) {
    const input = document.getElementById('cityRegion');
    
    if (suggestion.type === 'region') {
        input.value = suggestion.name;
        selectedRegionId = suggestion.id;
    } else if (suggestion.type === 'hotel') {
        input.value = suggestion.name;
        selectedRegionId = suggestion.region_id;
    }
    
    hideSuggestions();
}

/**
 * Masque les suggestions
 */
function hideSuggestions() {
    const suggestionsDiv = document.getElementById('citySuggestions');
    if (suggestionsDiv) {
        suggestionsDiv.style.display = 'none';
    }
}

/**
 * Définit les dates par défaut (demain et après-demain)
 */
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(today);
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    document.getElementById('checkin').valueAsDate = tomorrow;
    document.getElementById('checkout').valueAsDate = dayAfter;
}

/**
 * Effectue la recherche d'hôtels
 */
async function performSearch() {
    // Vérifier qu'une région a été sélectionnée
    if (!selectedRegionId) {
        showError('Veuillez sélectionner une ville dans la liste de suggestions');
        return;
    }
    
    // Récupérer les données du formulaire
    const checkin = document.getElementById('checkin').value;
    const checkout = document.getElementById('checkout').value;
    const numRooms = parseInt(document.getElementById('numRooms').value);
    
    // Validation
    if (!checkin || !checkout) {
        showError('Veuillez remplir les dates de séjour');
        return;
    }
    
    // Construire le tableau de guests
    const guests = [];
    for (let i = 0; i < numRooms; i++) {
        guests.push({ adults: 2 });
    }
    
    // Préparer les données
    const searchData = {
        city_or_region: selectedRegionId,
        checkin: checkin,
        checkout: checkout,
        guests: guests,
        min_rating: 8.0,
        currency: 'EUR'
    };
    
    // Afficher le chargement
    showLoading(true);
    hideError();
    hideResults();
    
    try {
        // Appel API
        const response = await fetch('/api/hotels/search-moto-friendly', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(searchData)
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Erreur lors de la recherche');
        }
        
        if (data.status === 'success') {
            currentHotels = data.hotels || [];
            displayResults(data);
        } else {
            throw new Error(data.message || 'Erreur inconnue');
        }
        
    } catch (error) {
        console.error('Search error:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

/**
 * Affiche/masque le chargement
 */
function showLoading(show) {
    document.getElementById('loadingSection').style.display = show ? 'block' : 'none';
    document.getElementById('searchBtn').disabled = show;
}

/**
 * Affiche une erreur
 */
function showError(message) {
    const errorSection = document.getElementById('errorSection');
    const errorMessage = document.getElementById('errorMessage');
    
    errorMessage.textContent = message;
    errorSection.style.display = 'block';
    
    // Scroll vers l'erreur
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Masque l'erreur
 */
function hideError() {
    document.getElementById('errorSection').style.display = 'none';
}

/**
 * Masque les résultats
 */
function hideResults() {
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('resultsSection').style.display = 'none';
    document.getElementById('noResultsSection').style.display = 'none';
}

/**
 * Affiche les résultats de recherche
 */
function displayResults(data) {
    const stats = data.stats || {};
    const hotels = data.hotels || [];
    
    // Afficher les statistiques
    displayStats(stats);
    
    // Afficher les hôtels
    if (hotels.length > 0) {
        displayHotels(hotels);
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('noResultsSection').style.display = 'none';
    } else {
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('noResultsSection').style.display = 'block';
    }
}

/**
 * Affiche les statistiques
 */
function displayStats(stats) {
    document.getElementById('statFound').textContent = stats.total_found || 0;
    document.getElementById('statFiltered').textContent = stats.total_filtered || 0;
    document.getElementById('statRejectedRating').textContent = stats.rejected_low_rating || 0;
    document.getElementById('statRejectedParking').textContent = stats.rejected_no_parking || 0;
    
    document.getElementById('statsSection').style.display = 'block';
}

/**
 * Affiche la liste des hôtels
 */
function displayHotels(hotels) {
    const container = document.getElementById('hotelsList');
    const resultCount = document.getElementById('resultCount');
    
    resultCount.textContent = hotels.length;
    container.innerHTML = '';
    
    hotels.forEach(hotel => {
        const card = createHotelCard(hotel);
        container.appendChild(card);
    });
}

/**
 * Crée une carte d'hôtel
 */
function createHotelCard(hotel) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4';
    
    const badges = hotel.badges || {};
    const rating = hotel.rating || hotel.star_rating || 0;
    const minPrice = hotel.min_price || { amount: 'N/A', currency: 'EUR' };
    const name = hotel.name || hotel.hotel_name || 'Hotel';
    const address = hotel.address || hotel.region?.name || '';
    
    // Badge parking
    let parkingBadge = '';
    if (badges.parking_private) {
        parkingBadge = '<span class="badge bg-success me-1"><i class="fas fa-parking"></i> Parking privé</span>';
    } else if (badges.parking_available) {
        parkingBadge = '<span class="badge bg-warning text-dark me-1"><i class="fas fa-parking"></i> Parking</span>';
    }
    
    // Badge petit-déjeuner
    const breakfastBadge = badges.breakfast_included 
        ? '<span class="badge bg-info me-1"><i class="fas fa-coffee"></i> Petit-déj</span>'
        : '';
    
    // Badge note haute
    const ratingBadge = badges.high_rating
        ? '<span class="badge bg-primary me-1"><i class="fas fa-star"></i> Excellent</span>'
        : '';
    
    col.innerHTML = `
        <div class="card h-100 shadow-sm hover-shadow">
            <div class="card-body">
                <h5 class="card-title">
                    <i class="fas fa-hotel text-primary"></i> ${escapeHtml(name)}
                </h5>
                <p class="card-text text-muted mb-2">
                    <i class="fas fa-map-marker-alt"></i> ${escapeHtml(address)}
                </p>
                
                <div class="mb-2">
                    <span class="badge bg-warning text-dark">
                        <i class="fas fa-star"></i> ${rating.toFixed(1)}/10
                    </span>
                    ${parkingBadge}
                    ${breakfastBadge}
                    ${ratingBadge}
                </div>
                
                <div class="d-flex justify-content-between align-items-center mt-3">
                    <div>
                        <strong class="text-primary">
                            ${typeof minPrice.amount === 'number' ? minPrice.amount.toFixed(2) : minPrice.amount} ${minPrice.currency}
                        </strong>
                        <br>
                        <small class="text-muted">par nuit</small>
                    </div>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewHotelDetails('${hotel.id}')">
                            <i class="fas fa-eye"></i> Détails
                        </button>
                        <button class="btn btn-sm btn-success" onclick="addHotelToTrip('${hotel.id}')">
                            <i class="fas fa-plus"></i> Ajouter
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return col;
}

/**
 * Affiche les détails d'un hôtel dans une modale
 */
function viewHotelDetails(hotelId) {
    const hotel = currentHotels.find(h => h.id === hotelId);
    if (!hotel) {
        alert('Hôtel non trouvé');
        return;
    }
    
    selectedHotel = hotel;
    
    const modalTitle = document.getElementById('hotelModalTitle');
    const modalBody = document.getElementById('hotelModalBody');
    
    modalTitle.textContent = hotel.name || 'Détails de l\'hôtel';
    
    const badges = hotel.badges || {};
    const rating = hotel.rating || 0;
    
    modalBody.innerHTML = `
        <div class="hotel-details">
            <div class="mb-3">
                <h6><i class="fas fa-info-circle"></i> Informations générales</h6>
                <p><strong>Note:</strong> ${rating.toFixed(1)}/10</p>
                <p><strong>Adresse:</strong> ${escapeHtml(hotel.address || 'Non disponible')}</p>
            </div>
            
            <div class="mb-3">
                <h6><i class="fas fa-check-circle"></i> Équipements</h6>
                <ul>
                    <li>Parking: ${badges.parking_private ? '✅ Privé sécurisé' : 
                        (badges.parking_available ? '⚠️ Disponible (à vérifier)' : '❌ Non spécifié')}</li>
                    <li>Petit-déjeuner: ${badges.breakfast_included ? '✅ Inclus' : '❌ Non inclus'}</li>
                    <li>Note: ${badges.high_rating ? '✅ Excellente (≥9.0)' : '✅ Bonne (≥8.0)'}</li>
                </ul>
            </div>
            
            <div class="mb-3">
                <h6><i class="fas fa-euro-sign"></i> Tarifs</h6>
                <p class="lead">
                    À partir de <strong>${hotel.min_price?.amount || 'N/A'} ${hotel.min_price?.currency || 'EUR'}</strong> par nuit
                </p>
                <small class="text-muted">Prix pour la configuration de chambres sélectionnée</small>
            </div>
            
            <div class="alert alert-info">
                <i class="fas fa-lightbulb"></i> 
                <strong>Conseil:</strong> Vérifiez toujours le type de parking sur Google Maps avant de réserver.
            </div>
        </div>
    `;
    
    // Afficher la modale
    const modal = new bootstrap.Modal(document.getElementById('hotelDetailsModal'));
    modal.show();
}

/**
 * Ajoute un hôtel au voyage (placeholder - à implémenter)
 */
function addHotelToTrip(hotelId) {
    const hotel = currentHotels.find(h => h.id === hotelId);
    if (!hotel) {
        alert('Hôtel non trouvé');
        return;
    }
    
    // TODO: Implémenter l'ajout réel au voyage
    // Pour l'instant, afficher une confirmation
    if (confirm(`Voulez-vous ajouter "${hotel.name}" à votre voyage ?`)) {
        alert('Fonctionnalité en développement. L\'hôtel sera bientôt ajouté à votre voyage.');
        // À implémenter: appel API pour ajouter l'hôtel au voyage sélectionné
    }
}

/**
 * Échappe le HTML pour éviter les injections
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Styles CSS pour l'autocomplétion et autres effets
const style = document.createElement('style');
style.textContent = `
    .hover-shadow {
        transition: box-shadow 0.3s ease-in-out;
    }
    .hover-shadow:hover {
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
    }
    
    .autocomplete-suggestions {
        position: absolute;
        z-index: 1000;
        background: white;
        border: 1px solid #ced4da;
        border-top: none;
        border-radius: 0 0 0.25rem 0.25rem;
        max-height: 300px;
        overflow-y: auto;
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
        display: none;
        width: 100%;
    }
    
    .suggestion-item {
        padding: 0.75rem 1rem;
        cursor: pointer;
        border-bottom: 1px solid #f0f0f0;
        transition: background-color 0.2s;
    }
    
    .suggestion-item:hover {
        background-color: #f8f9fa;
    }
    
    .suggestion-item:last-child {
        border-bottom: none;
    }
    
    .suggestion-item.loading,
    .suggestion-item.no-results,
    .suggestion-item.error {
        cursor: default;
        color: #6c757d;
        font-style: italic;
    }
    
    .suggestion-item.error {
        color: #dc3545;
    }
    
    /* Style pour le conteneur parent du champ */
    #cityRegion {
        position: relative;
    }
`;
document.head.appendChild(style);
