/**
 * Gestion de la page Banque d'Hôtels
 * CRUD complet + recherche + filtres + statistiques
 */

// Variables globales
let allHotels = [];
let filteredHotels = [];
let currentHotelModal = null;

// Au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏨 Initialisation de la page Banque d\'Hôtels');
    
    // Charge les hôtels
    loadHotels();
    
    // Event listeners
    setupEventListeners();
});

/**
 * Configure tous les event listeners
 */
function setupEventListeners() {
    // Bouton Nouvel Hôtel
    document.getElementById('btnNewHotel').addEventListener('click', () => {
        openHotelModal();
    });
    
    // Bouton Enregistrer Hôtel
    document.getElementById('btnSaveHotel').addEventListener('click', () => {
        saveHotel();
    });
    
    // Recherche en temps réel
    document.getElementById('searchInput').addEventListener('input', (e) => {
        filterAndDisplayHotels();
    });
    
    // Filtre par ville
    document.getElementById('cityFilter').addEventListener('change', () => {
        filterAndDisplayHotels();
    });
    
    // Tri
    document.getElementById('sortBy').addEventListener('change', () => {
        filterAndDisplayHotels();
    });
}

/**
 * Charge tous les hôtels depuis l'API
 */
async function loadHotels() {
    try {
        const response = await fetch('/admin/api/hotels');
        const data = await response.json();
        
        if (data.success) {
            allHotels = data.hotels;
            console.log(`✅ ${allHotels.length} hôtel(s) chargé(s)`);
            
            // Met à jour l'interface
            updateStatistics();
            populateCityFilter();
            filterAndDisplayHotels();
        } else {
            showError('Erreur lors du chargement des hôtels');
        }
    } catch (error) {
        console.error('❌ Erreur chargement hôtels:', error);
        showError('Impossible de charger les hôtels');
    }
}

/**
 * Met à jour les statistiques globales
 */
function updateStatistics() {
    const totalHotels = allHotels.length;
    
    // Nombre de villes uniques
    const cities = new Set(allHotels.map(h => h.city));
    const totalCities = cities.size;
    
    // Note moyenne globale
    const hotelsWithRatings = allHotels.filter(h => h.ratings && h.ratings.averageRating > 0);
    const avgRating = hotelsWithRatings.length > 0
        ? (hotelsWithRatings.reduce((sum, h) => sum + h.ratings.averageRating, 0) / hotelsWithRatings.length).toFixed(1)
        : '0.0';
    
    // Total des avis
    const totalReviews = allHotels.reduce((sum, h) => {
        return sum + (h.ratings?.totalRatings || 0);
    }, 0);
    
    // Affiche les stats
    document.getElementById('statTotalHotels').textContent = totalHotels;
    document.getElementById('statCities').textContent = totalCities;
    document.getElementById('statAvgRating').textContent = avgRating;
    document.getElementById('statTotalReviews').textContent = totalReviews;
}

/**
 * Remplit le filtre des villes
 */
function populateCityFilter() {
    const cities = [...new Set(allHotels.map(h => h.city))].sort();
    const select = document.getElementById('cityFilter');
    
    // Vide les options existantes (sauf "Toutes les villes")
    select.innerHTML = '<option value="">Toutes les villes</option>';
    
    // Ajoute chaque ville
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = `${city} (${allHotels.filter(h => h.city === city).length})`;
        select.appendChild(option);
    });
}

/**
 * Filtre et affiche les hôtels selon les critères
 */
function filterAndDisplayHotels() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const cityFilter = document.getElementById('cityFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    // Filtre
    filteredHotels = allHotels.filter(hotel => {
        const matchesSearch = hotel.name.toLowerCase().includes(searchTerm) ||
                            hotel.city.toLowerCase().includes(searchTerm) ||
                            (hotel.address && hotel.address.toLowerCase().includes(searchTerm));
        
        const matchesCity = !cityFilter || hotel.city === cityFilter;
        
        return matchesSearch && matchesCity;
    });
    
    // Tri
    filteredHotels.sort((a, b) => {
        switch (sortBy) {
            case 'name':
                return a.name.localeCompare(b.name);
            case 'rating':
                return (b.ratings?.averageRating || 0) - (a.ratings?.averageRating || 0);
            case 'usage':
                return (b.usageStats?.usedCount || 0) - (a.usageStats?.usedCount || 0);
            case 'city':
                return a.city.localeCompare(b.city);
            default:
                return 0;
        }
    });
    
    // Affiche
    displayHotels(filteredHotels);
}

/**
 * Affiche la liste des hôtels
 */
function displayHotels(hotels) {
    const container = document.getElementById('hotelsContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (hotels.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('d-none');
        return;
    }
    
    emptyState.classList.add('d-none');
    
    // Crée la grille de cartes
    const grid = document.createElement('div');
    grid.className = 'row g-4';
    
    hotels.forEach(hotel => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = createHotelCard(hotel);
        grid.appendChild(col);
    });
    
    container.innerHTML = '';
    container.appendChild(grid);
    
    // Ajoute les event listeners sur les cartes
    attachCardEventListeners();
}

/**
 * Crée la carte HTML d'un hôtel
 */
function createHotelCard(hotel) {
    const rating = hotel.ratings?.averageRating || 0;
    const totalReviews = hotel.ratings?.totalRatings || 0;
    const usedCount = hotel.usageStats?.usedCount || 0;
    const priceDouble = hotel.defaultPricing?.priceDouble || 0;
    const priceSolo = hotel.defaultPricing?.priceSolo || 0;
    
    // Affiche les étoiles
    const stars = '⭐'.repeat(Math.round(rating));
    
    return `
        <div class="hotel-card" data-hotel-id="${hotel.id}">
            <div class="hotel-card-header">
                <h5 class="mb-1">${escapeHtml(hotel.name)}</h5>
                <small>
                    <i class="bi bi-geo-alt"></i> ${escapeHtml(hotel.city)}
                </small>
            </div>
            <div class="hotel-card-body">
                <!-- Évaluations -->
                <div class="mb-2">
                    ${rating > 0 ? `
                        <span class="rating-badge">
                            ${stars} ${rating.toFixed(1)}
                        </span>
                        <small class="text-muted ms-2">(${totalReviews} avis)</small>
                    ` : '<small class="text-muted">Aucune évaluation</small>'}
                </div>
                
                <!-- Prix -->
                <div class="mb-2">
                    <span class="price-tag">
                        <i class="bi bi-person-fill"></i> ${priceDouble.toFixed(0)}€
                    </span>
                    <span class="price-tag">
                        <i class="bi bi-person"></i> ${priceSolo.toFixed(0)}€
                    </span>
                </div>
                
                <!-- Utilisation -->
                <div class="mb-3">
                    <span class="usage-badge">
                        <i class="bi bi-graph-up"></i> Utilisé ${usedCount}x
                    </span>
                </div>
                
                <!-- Actions -->
                <div class="d-grid gap-2">
                    <button class="btn btn-sm btn-outline-primary btn-view" 
                            data-hotel-id="${hotel.id}">
                        <i class="bi bi-eye"></i> Détails
                    </button>
                    <div class="btn-group" role="group">
                        <button class="btn btn-sm btn-outline-secondary btn-edit" 
                                data-hotel-id="${hotel.id}">
                            <i class="bi bi-pencil"></i> Modifier
                        </button>
                        <button class="btn btn-sm btn-outline-danger btn-delete" 
                                data-hotel-id="${hotel.id}">
                            <i class="bi bi-trash"></i> Supprimer
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attache les event listeners sur les boutons des cartes
 */
function attachCardEventListeners() {
    // Boutons Détails
    document.querySelectorAll('.btn-view').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hotelId = e.currentTarget.dataset.hotelId;
            viewHotelDetails(hotelId);
        });
    });
    
    // Boutons Modifier
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hotelId = e.currentTarget.dataset.hotelId;
            editHotel(hotelId);
        });
    });
    
    // Boutons Supprimer
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const hotelId = e.currentTarget.dataset.hotelId;
            deleteHotel(hotelId);
        });
    });
}

/**
 * Ouvre la modale pour créer/modifier un hôtel
 */
function openHotelModal(hotel = null) {
    const modal = new bootstrap.Modal(document.getElementById('hotelModal'));
    currentHotelModal = modal;
    
    // Reset le formulaire
    document.getElementById('hotelForm').reset();
    document.getElementById('hotelId').value = '';
    
    if (hotel) {
        // Mode édition
        document.getElementById('hotelModalTitle').textContent = 'Modifier l\'hôtel';
        document.getElementById('hotelId').value = hotel.id;
        document.getElementById('hotelName').value = hotel.name;
        document.getElementById('hotelCity').value = hotel.city;
        document.getElementById('hotelAddress').value = hotel.address || '';
        document.getElementById('hotelPhone').value = hotel.contact?.phone || '';
        document.getElementById('hotelEmail').value = hotel.contact?.email || '';
        document.getElementById('hotelWebsite').value = hotel.contact?.website || '';
        document.getElementById('priceDouble').value = hotel.defaultPricing?.priceDouble || 0;
        document.getElementById('priceSolo').value = hotel.defaultPricing?.priceSolo || 0;
        document.getElementById('googlePlaceId').value = hotel.googlePlaceId || '';
        document.getElementById('downloadGooglePhotos').checked = false; // Désactivé en mode édition
    } else {
        // Mode création
        document.getElementById('hotelModalTitle').textContent = 'Nouvel Hôtel';
        document.getElementById('downloadGooglePhotos').checked = true;
    }
    
    modal.show();
}

/**
 * Sauvegarde un hôtel (création ou modification)
 */
async function saveHotel() {
    const hotelId = document.getElementById('hotelId').value;
    const isEdit = !!hotelId;
    
    // Récupère les données du formulaire
    const hotelData = {
        name: document.getElementById('hotelName').value.trim(),
        city: document.getElementById('hotelCity').value.trim(),
        address: document.getElementById('hotelAddress').value.trim(),
        googlePlaceId: document.getElementById('googlePlaceId').value.trim(),
        contact: {
            phone: document.getElementById('hotelPhone').value.trim(),
            email: document.getElementById('hotelEmail').value.trim(),
            website: document.getElementById('hotelWebsite').value.trim()
        },
        defaultPricing: {
            priceDouble: parseFloat(document.getElementById('priceDouble').value) || 0,
            priceSolo: parseFloat(document.getElementById('priceSolo').value) || 0
        }
    };
    
    // Validation
    if (!hotelData.name || !hotelData.city) {
        showError('Veuillez remplir tous les champs obligatoires');
        return;
    }
    
    try {
        // Désactive le bouton
        const btnSave = document.getElementById('btnSaveHotel');
        btnSave.disabled = true;
        btnSave.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enregistrement...';
        
        let response;
        if (isEdit) {
            // Modification
            response = await fetch(`/admin/api/hotels/${hotelId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hotelData)
            });
        } else {
            // Création
            response = await fetch('/admin/api/hotels', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(hotelData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess(isEdit ? 'Hôtel modifié avec succès' : 'Hôtel créé avec succès');
            currentHotelModal.hide();
            
            // TODO: Si downloadGooglePhotos est coché, lancer le téléchargement
            
            // Recharge les hôtels
            await loadHotels();
        } else {
            showError(data.error || 'Erreur lors de l\'enregistrement');
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde hôtel:', error);
        showError('Erreur lors de l\'enregistrement');
    } finally {
        // Réactive le bouton
        const btnSave = document.getElementById('btnSaveHotel');
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="bi bi-check-circle"></i> Enregistrer';
    }
}

/**
 * Affiche les détails d'un hôtel
 */
async function viewHotelDetails(hotelId) {
    try {
        const response = await fetch(`/admin/api/hotels/${hotelId}`);
        const data = await response.json();
        
        if (data.success) {
            const hotel = data.hotel;
            const reviews = hotel.reviews || [];
            
            // Construit le HTML des détails
            const detailsHTML = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="border-bottom pb-2 mb-3">Informations</h6>
                        <dl class="row">
                            <dt class="col-sm-4">Nom</dt>
                            <dd class="col-sm-8">${escapeHtml(hotel.name)}</dd>
                            
                            <dt class="col-sm-4">Ville</dt>
                            <dd class="col-sm-8">${escapeHtml(hotel.city)}</dd>
                            
                            <dt class="col-sm-4">Adresse</dt>
                            <dd class="col-sm-8">${escapeHtml(hotel.address || 'Non renseignée')}</dd>
                            
                            <dt class="col-sm-4">Téléphone</dt>
                            <dd class="col-sm-8">${escapeHtml(hotel.contact?.phone || 'Non renseigné')}</dd>
                            
                            <dt class="col-sm-4">Email</dt>
                            <dd class="col-sm-8">${escapeHtml(hotel.contact?.email || 'Non renseigné')}</dd>
                            
                            <dt class="col-sm-4">Site web</dt>
                            <dd class="col-sm-8">
                                ${hotel.contact?.website 
                                    ? `<a href="${hotel.contact.website}" target="_blank">${hotel.contact.website}</a>` 
                                    : 'Non renseigné'}
                            </dd>
                        </dl>
                    </div>
                    
                    <div class="col-md-6">
                        <h6 class="border-bottom pb-2 mb-3">Prix et Statistiques</h6>
                        <dl class="row">
                            <dt class="col-sm-6">Prix Double</dt>
                            <dd class="col-sm-6">${hotel.defaultPricing?.priceDouble || 0} €</dd>
                            
                            <dt class="col-sm-6">Prix Solo</dt>
                            <dd class="col-sm-6">${hotel.defaultPricing?.priceSolo || 0} €</dd>
                            
                            <dt class="col-sm-6">Évaluation</dt>
                            <dd class="col-sm-6">
                                ${hotel.ratings?.averageRating > 0 
                                    ? `⭐ ${hotel.ratings.averageRating.toFixed(1)} / 5` 
                                    : 'Aucune'}
                            </dd>
                            
                            <dt class="col-sm-6">Nombre d'avis</dt>
                            <dd class="col-sm-6">${hotel.ratings?.totalRatings || 0}</dd>
                            
                            <dt class="col-sm-6">Utilisé dans</dt>
                            <dd class="col-sm-6">${hotel.usageStats?.usedCount || 0} voyage(s)</dd>
                        </dl>
                    </div>
                </div>
                
                ${reviews.length > 0 ? `
                    <hr>
                    <h6 class="border-bottom pb-2 mb-3">Avis Clients (${reviews.length})</h6>
                    <div class="list-group">
                        ${reviews.map(review => `
                            <div class="list-group-item">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <strong>${escapeHtml(review.customerName)}</strong>
                                    <span class="badge bg-warning text-dark">
                                        ${'⭐'.repeat(review.rating)}
                                    </span>
                                </div>
                                <p class="mb-1">${escapeHtml(review.comment || 'Aucun commentaire')}</p>
                                <small class="text-muted">
                                    ${review.visitDate ? `Visite le ${review.visitDate}` : ''}
                                </small>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
            
            document.getElementById('hotelDetailsContent').innerHTML = detailsHTML;
            document.getElementById('detailsHotelName').textContent = hotel.name;
            
            const modal = new bootstrap.Modal(document.getElementById('hotelDetailsModal'));
            modal.show();
        } else {
            showError('Impossible de charger les détails');
        }
    } catch (error) {
        console.error('❌ Erreur chargement détails:', error);
        showError('Erreur lors du chargement des détails');
    }
}

/**
 * Édite un hôtel
 */
function editHotel(hotelId) {
    const hotel = allHotels.find(h => h.id === hotelId);
    if (hotel) {
        openHotelModal(hotel);
    }
}

/**
 * Supprime un hôtel
 */
async function deleteHotel(hotelId) {
    const hotel = allHotels.find(h => h.id === hotelId);
    if (!hotel) return;
    
    const usedCount = hotel.usageStats?.usedCount || 0;
    
    let confirmMessage = `Êtes-vous sûr de vouloir supprimer "${hotel.name}" ?`;
    if (usedCount > 0) {
        confirmMessage += `\n\nAttention : Cet hôtel est utilisé dans ${usedCount} voyage(s). La suppression sera impossible.`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const response = await fetch(`/admin/api/hotels/${hotelId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showSuccess('Hôtel supprimé avec succès');
            await loadHotels();
        } else {
            showError(data.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('❌ Erreur suppression hôtel:', error);
        showError('Erreur lors de la suppression');
    }
}

/**
 * Affiche un message de succès
 */
function showSuccess(message) {
    // Utilise Bootstrap Toast ou alert
    alert('✅ ' + message);
}

/**
 * Affiche un message d'erreur
 */
function showError(message) {
    alert('❌ ' + message);
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
