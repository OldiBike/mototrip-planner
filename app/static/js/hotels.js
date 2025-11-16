/**
 * Gestion de la page Banque d'Hôtels - Version TailwindCSS
 * CRUD complet + recherche + filtres + statistiques
 */

// Variables globales
let allHotels = [];
let filteredHotels = [];

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
 * Configure l'autocompletion RateHawk (appelé quand la modale s'ouvre)
 * Utilise la même logique que dashboard.js
 */
function setupRatehawkAutocomplete() {
    const urlInput = document.getElementById('ratehawkUrl');
    if (!urlInput) return;
    
    // Supprime les anciens listeners pour éviter les doublons
    if (urlInput.dataset.listenerAdded) return;
    
    urlInput.addEventListener('input', extractFromRatehawkUrl);
    urlInput.dataset.listenerAdded = 'true';
}

/**
 * Extrait les infos depuis une URL RateHawk et remplit automatiquement les champs
 * Copié depuis dashboard.js pour cohérence
 */
function extractFromRatehawkUrl(event) {
    const url = event.target.value.trim();
    const loadingDiv = document.getElementById('ratehawkLoading');
    
    if (!url || !url.includes('ratehawk.com')) {
        if (loadingDiv) loadingDiv.classList.add('hidden');
        return;
    }
    
    // Affiche le loading
    if (loadingDiv) loadingDiv.classList.remove('hidden');
    
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        
        // Format attendu: /hotel/{country}/{city}/{...}/{hotel_name}
        if (pathParts.length >= 5 && pathParts[0] === 'hotel') {
            const city = pathParts[2];
            const hotelName = pathParts[4];
            
            // Nettoie et formate la ville
            const cleanCity = city.split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            // Nettoie et formate le nom de l'hôtel
            const cleanHotelName = hotelName.replace(/_/g, ' ')
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Remplit les champs
            const cityInput = document.getElementById('hotelCity');
            const hotelInput = document.getElementById('hotelName');
            
            if (cityInput && !cityInput.value) {
                cityInput.value = cleanCity;
                cityInput.classList.add('bg-green-50');
                setTimeout(() => cityInput.classList.remove('bg-green-50'), 1000);
            }
            
            if (hotelInput && !hotelInput.value) {
                hotelInput.value = cleanHotelName;
                hotelInput.classList.add('bg-green-50');
                setTimeout(() => hotelInput.classList.remove('bg-green-50'), 1000);
            }
            
            // Affiche un message de succès
            showToast(`✅ Informations extraites : ${cleanHotelName} à ${cleanCity}`, 'success');
            
        } else {
            showToast('⚠️ Format d\'URL RateHawk non reconnu', 'warning');
        }
    } catch (error) {
        console.error('❌ Erreur extraction RateHawk:', error);
        showToast('Erreur lors de l\'extraction', 'error');
    } finally {
        // Masque le loading
        if (loadingDiv) {
            setTimeout(() => loadingDiv.classList.add('hidden'), 500);
        }
    }
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
            showToast('Erreur lors du chargement des hôtels', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur chargement hôtels:', error);
        showToast('Impossible de charger les hôtels', 'error');
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
    
    // Affiche les stats avec animation
    animateValue('statTotalHotels', 0, totalHotels, 500);
    animateValue('statCities', 0, totalCities, 500);
    document.getElementById('statAvgRating').textContent = avgRating;
    animateValue('statTotalReviews', 0, totalReviews, 500);
}

/**
 * Anime un compteur
 */
function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        element.textContent = Math.round(current);
    }, 16);
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
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    // Crée la grille de cartes
    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    
    hotels.forEach(hotel => {
        const card = document.createElement('div');
        card.className = 'animate-fade-in';
        card.innerHTML = createHotelCard(hotel);
        grid.appendChild(card);
    });
    
    container.innerHTML = '';
    container.appendChild(grid);
    
    // Ajoute les event listeners sur les cartes
    attachCardEventListeners();
}

/**
 * Crée la carte HTML d'un hôtel (Design Moderne)
 */
function createHotelCard(hotel) {
    const rating = hotel.ratings?.averageRating || 0;
    const totalReviews = hotel.ratings?.totalRatings || 0;
    const usedCount = hotel.usageStats?.usedCount || 0;
    
    // Récupère la première photo de l'hôtel
    const firstPhoto = hotel.photos && hotel.photos.length > 0 ? hotel.photos[0] : null;
    
    // Génère les étoiles
    const starsHTML = rating > 0 
        ? `<div class="flex items-center space-x-1">
            ${Array.from({length: 5}, (_, i) => 
                `<i class="fas fa-star ${i < Math.round(rating) ? 'text-yellow-400' : 'text-gray-300'} text-sm"></i>`
            ).join('')}
            <span class="text-sm font-semibold text-gray-700 ml-2">${rating.toFixed(1)}</span>
            <span class="text-xs text-gray-500">(${totalReviews})</span>
           </div>`
        : '<span class="text-sm text-gray-400">Aucune évaluation</span>';
    
    // Image avec vraie photo ou placeholder
    const imageHTML = firstPhoto 
        ? `<img src="${firstPhoto}" alt="${escapeHtml(hotel.name)}" class="w-full h-48 object-cover">`
        : `<div class="h-48 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
             <i class="fas fa-hotel text-white text-6xl opacity-30"></i>
           </div>`;
    
    return `
        <div class="hotel-card bg-white rounded-xl shadow-md overflow-hidden border border-gray-200" data-hotel-id="${hotel.id}">
            <!-- Image Réelle ou Placeholder -->
            <div class="relative">
                ${imageHTML}
                ${usedCount > 0 ? `
                    <div class="absolute top-3 right-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold shadow-lg">
                        <i class="fas fa-sync-alt mr-1"></i> ${usedCount}x
                    </div>
                ` : ''}
                ${hotel.photos && hotel.photos.length > 1 ? `
                    <div class="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                        <i class="fas fa-images mr-1"></i> ${hotel.photos.length} photos
                    </div>
                ` : ''}
            </div>
            
            <!-- Contenu -->
            <div class="p-5 space-y-3">
                <!-- Nom et Ville -->
                <div>
                    <h3 class="text-lg font-bold text-gray-900 truncate mb-1">${escapeHtml(hotel.name)}</h3>
                    <p class="text-sm text-gray-500 flex items-center">
                        <i class="fas fa-map-marker-alt mr-1 text-blue-500"></i>
                        ${escapeHtml(hotel.city)}
                    </p>
                </div>
                
                <!-- Évaluation et Utilisation -->
                <div class="pt-2 border-t border-gray-100">
                    ${starsHTML}
                    ${usedCount > 0 ? `
                        <div class="mt-2 text-xs text-gray-500">
                            <i class="fas fa-suitcase mr-1"></i>
                            Utilisé dans ${usedCount} voyage${usedCount > 1 ? 's' : ''}
                        </div>
                    ` : ''}
                </div>
                
                <!-- Actions -->
                <div class="flex items-center space-x-2 pt-3">
                    <button onclick="viewHotelDetails('${hotel.id}')" 
                            class="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition">
                        <i class="fas fa-eye mr-1"></i> Détails
                    </button>
                    <button onclick="editHotel('${hotel.id}')" 
                            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteHotel('${hotel.id}')" 
                            class="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 text-sm font-medium rounded-lg transition">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attache les event listeners sur les boutons des cartes
 */
function attachCardEventListeners() {
    // Les événements sont gérés inline dans le HTML pour plus de simplicité
    // avec TailwindCSS
}

/**
 * Ouvre la modale pour créer/modifier un hôtel
 */
function openHotelModal(hotel = null) {
    const modal = document.getElementById('hotelModal');
    
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
        document.getElementById('googlePlaceId').value = hotel.googlePlaceId || '';
        document.getElementById('downloadGooglePhotos').checked = false;
    } else {
        // Mode création
        document.getElementById('hotelModalTitle').textContent = 'Nouvel Hôtel';
        document.getElementById('downloadGooglePhotos').checked = true;
    }
    
    // Affiche la modale
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('opacity-100');
    }, 10);
    
    // Active l'autocompletion RateHawk
    setupRatehawkAutocomplete();
}

/**
 * Ferme la modale hôtel
 */
function closeHotelModal() {
    const modal = document.getElementById('hotelModal');
    modal.classList.remove('opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
}

/**
 * Sauvegarde un hôtel (création ou modification)
 */
async function saveHotel() {
    const hotelId = document.getElementById('hotelId').value;
    const isEdit = !!hotelId;
    
    // Récupère les données du formulaire (SANS les prix)
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
        downloadGooglePhotos: document.getElementById('downloadGooglePhotos').checked
    };
    
    // Validation
    if (!hotelData.name || !hotelData.city) {
        showToast('Veuillez remplir tous les champs obligatoires', 'error');
        return;
    }
    
    try {
        // Désactive le bouton
        const btnSave = document.getElementById('btnSaveHotel');
        const originalHTML = btnSave.innerHTML;
        btnSave.disabled = true;
        btnSave.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Enregistrement...';
        
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
            showToast(isEdit ? 'Hôtel modifié avec succès' : 'Hôtel créé avec succès', 'success');
            closeHotelModal();
            
            // Recharge les hôtels
            await loadHotels();
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
        }
        
        // Réactive le bouton
        btnSave.disabled = false;
        btnSave.innerHTML = originalHTML;
    } catch (error) {
        console.error('❌ Erreur sauvegarde hôtel:', error);
        showToast('Erreur lors de l\'enregistrement', 'error');
        
        // Réactive le bouton
        const btnSave = document.getElementById('btnSaveHotel');
        btnSave.disabled = false;
        btnSave.innerHTML = '<i class="fas fa-check mr-2"></i>Enregistrer';
    }
}

/**
 * Variable globale pour stocker l'hôtel actuellement affiché
 */
let currentHotelDetails = null;

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
            
            // Sauvegarde pour les boutons
            currentHotelDetails = hotel;
            
            // Construit le HTML des détails
            const detailsHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Informations -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-info-circle text-blue-600 mr-2"></i>
                            Informations
                        </h4>
                        <dl class="space-y-2">
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Nom</dt>
                                <dd class="text-sm text-gray-900 font-semibold">${escapeHtml(hotel.name)}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Ville</dt>
                                <dd class="text-sm text-gray-900">${escapeHtml(hotel.city)}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Adresse</dt>
                                <dd class="text-sm text-gray-900">${escapeHtml(hotel.address || 'Non renseignée')}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Téléphone</dt>
                                <dd class="text-sm text-gray-900">${escapeHtml(hotel.contact?.phone || 'Non renseigné')}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Email</dt>
                                <dd class="text-sm text-gray-900">${escapeHtml(hotel.contact?.email || 'Non renseigné')}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Site web</dt>
                                <dd class="text-sm text-blue-600">
                                    ${hotel.contact?.website 
                                        ? `<a href="${hotel.contact.website}" target="_blank" class="hover:underline">${hotel.contact.website}</a>` 
                                        : '<span class="text-gray-900">Non renseigné</span>'}
                                </dd>
                            </div>
                        </dl>
                    </div>
                    
                    <!-- Statistiques -->
                    <div class="bg-gray-50 rounded-lg p-4">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-chart-line text-blue-600 mr-2"></i>
                            Statistiques
                        </h4>
                        <dl class="space-y-2">
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Évaluation</dt>
                                <dd class="text-sm text-gray-900">
                                    ${hotel.ratings?.averageRating > 0 
                                        ? `⭐ ${hotel.ratings.averageRating.toFixed(1)} / 5` 
                                        : 'Aucune'}
                                </dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Nombre d'avis</dt>
                                <dd class="text-sm text-gray-900">${hotel.ratings?.totalRatings || 0}</dd>
                            </div>
                            <div class="flex justify-between">
                                <dt class="text-sm font-medium text-gray-600">Utilisé dans</dt>
                                <dd class="text-sm font-bold text-blue-600">${hotel.usageStats?.usedCount || 0} voyage(s)</dd>
                            </div>
                        </dl>
                    </div>
                </div>
                
                ${reviews.length > 0 ? `
                    <div class="mt-6">
                        <h4 class="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <i class="fas fa-comments text-blue-600 mr-2"></i>
                            Avis Clients (${reviews.length})
                        </h4>
                        <div class="space-y-3">
                            ${reviews.map(review => `
                                <div class="bg-gray-50 rounded-lg p-4">
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="font-semibold text-gray-900">${escapeHtml(review.customerName)}</span>
                                        <span class="text-yellow-400">
                                            ${'⭐'.repeat(review.rating)}
                                        </span>
                                    </div>
                                    <p class="text-sm text-gray-700 mb-1">${escapeHtml(review.comment || 'Aucun commentaire')}</p>
                                    <small class="text-xs text-gray-500">
                                        ${review.visitDate ? `Visite le ${review.visitDate}` : ''}
                                    </small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
            
            document.getElementById('hotelDetailsContent').innerHTML = detailsHTML;
            document.getElementById('detailsHotelName').textContent = hotel.name;
            
            // Gère le bouton Galerie
            const galleryBtn = document.getElementById('viewGalleryBtn');
            if (hotel.photos && hotel.photos.length > 0) {
                galleryBtn.classList.remove('hidden');
                galleryBtn.onclick = () => openGalleryModal(hotel);
            } else {
                galleryBtn.classList.add('hidden');
            }
            
            // Gère le bouton Upload Photos (toujours visible)
            const uploadBtn = document.getElementById('uploadPhotosBtn');
            uploadBtn.classList.remove('hidden');
            uploadBtn.onclick = () => openUploadPhotosModal(hotel);
            
            // Gère le bouton Modifier
            const editBtn = document.getElementById('editHotelBtn');
            editBtn.classList.remove('hidden');
            editBtn.onclick = () => {
                closeDetailsModal();
                editHotel(hotel.id);
            };
            
            // Affiche la modale
            const modal = document.getElementById('hotelDetailsModal');
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('opacity-100');
            }, 10);
        } else {
            showToast('Impossible de charger les détails', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur chargement détails:', error);
        showToast('Erreur lors du chargement des détails', 'error');
    }
}

/**
 * Ferme la modale de détails
 */
function closeDetailsModal() {
    const modal = document.getElementById('hotelDetailsModal');
    modal.classList.remove('opacity-100');
    setTimeout(() => {
        modal.classList.add('hidden');
    }, 300);
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
        confirmMessage += `\n\nAttention : Cet hôtel est utilisé dans ${usedCount} voyage(s).`;
    }
    
    if (!confirm(confirmMessage)) return;
    
    try {
        const response = await fetch(`/admin/api/hotels/${hotelId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Hôtel supprimé avec succès', 'success');
            await loadHotels();
        } else {
            showToast(data.error || 'Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('❌ Erreur suppression hôtel:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

/**
 * Ouvre la modale galerie avec les photos de l'hôtel
 */
function openGalleryModal(hotel) {
    const modal = document.getElementById('galleryModal');
    const grid = document.getElementById('galleryGrid');
    const titleEl = document.getElementById('galleryHotelName');
    
    // Met à jour le titre
    titleEl.textContent = `${hotel.name} - ${hotel.photos.length} photo${hotel.photos.length > 1 ? 's' : ''}`;
    
    // Vide la grille
    grid.innerHTML = '';
    
    // Ajoute chaque photo
    hotel.photos.forEach((photoUrl, index) => {
        const photoDiv = document.createElement('div');
        photoDiv.className = 'relative aspect-square rounded-lg overflow-hidden cursor-pointer group';
        photoDiv.innerHTML = `
            <img src="${photoUrl}" 
                 alt="${escapeHtml(hotel.name)} - Photo ${index + 1}" 
                 class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110">
            <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                <i class="fas fa-search-plus text-white text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></i>
            </div>
        `;
        
        // Ouvre l'image en plein écran au clic
        photoDiv.addEventListener('click', () => {
            window.open(photoUrl, '_blank');
        });
        
        grid.appendChild(photoDiv);
    });
    
    // Affiche la modale
    modal.classList.remove('hidden');
}

/**
 * Ferme la modale galerie
 */
function closeGalleryModal() {
    const modal = document.getElementById('galleryModal');
    modal.classList.add('hidden');
}

/**
 * Variables globales pour l'upload de photos
 */
let selectedFiles = [];
let currentUploadHotelId = null;

/**
 * Ouvre la modale d'upload de photos manuelles
 */
function openUploadPhotosModal(hotel) {
    currentUploadHotelId = hotel.id;
    selectedFiles = [];
    
    // Met à jour le nom de l'hôtel
    document.getElementById('uploadHotelName').textContent = hotel.name;
    
    // Reset l'interface
    document.getElementById('photoFiles').value = '';
    document.getElementById('photosPreview').classList.add('hidden');
    document.getElementById('uploadProgress').classList.add('hidden');
    document.getElementById('btnUploadPhotos').disabled = true;
    document.getElementById('previewGrid').innerHTML = '';
    
    // Affiche la modale
    const modal = document.getElementById('uploadPhotosModal');
    modal.classList.remove('hidden');
    
    // ✨ SUPPORT COPIER-COLLER (Cmd+V / Ctrl+V)
    const pasteHandler = (e) => {
        // Récupère les items du clipboard
        const items = e.clipboardData?.items;
        if (!items) return;
        
        const files = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Vérifie si c'est une image
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) {
                    files.push(file);
                }
            }
        }
        
        if (files.length > 0) {
            // Crée un événement fictif pour réutiliser handlePhotosSelected
            const fakeEvent = {
                target: { files: files }
            };
            handlePhotosSelected(fakeEvent);
            showToast(`📋 ${files.length} image(s) collée(s) !`, 'success');
        }
    };
    
    // Ajoute l'event listener
    document.addEventListener('paste', pasteHandler);
    
    // Stocke la référence pour pouvoir la retirer plus tard
    modal.dataset.pasteHandler = 'active';
    modal._pasteHandler = pasteHandler;
}

/**
 * Ferme la modale d'upload
 */
function closeUploadPhotosModal() {
    const modal = document.getElementById('uploadPhotosModal');
    modal.classList.add('hidden');
    selectedFiles = [];
    currentUploadHotelId = null;
    
    // ✨ Retire l'event listener paste
    if (modal._pasteHandler) {
        document.removeEventListener('paste', modal._pasteHandler);
        delete modal._pasteHandler;
        delete modal.dataset.pasteHandler;
    }
}

/**
 * Gère la sélection de photos
 */
function handlePhotosSelected(event) {
    const files = Array.from(event.target.files);
    
    // Validation
    const validFiles = [];
    for (const file of files) {
        // Vérifie le type
        if (!file.type.match(/image\/(jpeg|jpg|png)/)) {
            showToast(`${file.name}: Format non supporté (JPG, PNG uniquement)`, 'error');
            continue;
        }
        
        // Vérifie la taille (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            showToast(`${file.name}: Fichier trop volumineux (max 5MB)`, 'error');
            continue;
        }
        
        validFiles.push(file);
    }
    
    if (validFiles.length === 0) {
        return;
    }
    
    selectedFiles = validFiles;
    displayPhotosPreview();
    
    // Active le bouton upload
    document.getElementById('btnUploadPhotos').disabled = false;
}

/**
 * Affiche la prévisualisation des photos sélectionnées
 */
function displayPhotosPreview() {
    const previewDiv = document.getElementById('photosPreview');
    const grid = document.getElementById('previewGrid');
    const countSpan = document.getElementById('photoCount');
    
    countSpan.textContent = selectedFiles.length;
    grid.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = document.createElement('div');
            preview.className = 'relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200';
            preview.innerHTML = `
                <img src="${e.target.result}" 
                     alt="Preview ${index + 1}" 
                     class="w-full h-full object-cover">
                <div class="absolute top-2 right-2">
                    <button onclick="removeSelectedPhoto(${index})" 
                            class="bg-red-500 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center">
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
                <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 text-center truncate">
                    ${file.name}
                </div>
            `;
            grid.appendChild(preview);
        };
        reader.readAsDataURL(file);
    });
    
    previewDiv.classList.remove('hidden');
}

/**
 * Retire une photo de la sélection
 */
function removeSelectedPhoto(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        document.getElementById('photosPreview').classList.add('hidden');
        document.getElementById('btnUploadPhotos').disabled = true;
    } else {
        displayPhotosPreview();
    }
}

/**
 * Upload les photos sélectionnées
 */
async function uploadSelectedPhotos() {
    if (!currentUploadHotelId || selectedFiles.length === 0) {
        return;
    }
    
    // Prépare le FormData
    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('photos', file);
    });
    
    // Désactive le bouton et affiche la progress
    const btnUpload = document.getElementById('btnUploadPhotos');
    const originalHTML = btnUpload.innerHTML;
    btnUpload.disabled = true;
    btnUpload.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Upload...';
    
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    progressDiv.classList.remove('hidden');
    
    try {
        // Simule la progression (en vrai, il faudrait XMLHttpRequest pour avoir la vraie progression)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress > 90) {
                clearInterval(progressInterval);
            }
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${progress}%`;
        }, 200);
        
        // Fait l'upload
        const response = await fetch(`/admin/api/hotels/${currentUploadHotelId}/upload-photos`, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        
        const data = await response.json();
        
        if (data.success) {
            showToast(`✅ ${data.uploaded_count} photo(s) uploadée(s) avec succès !`, 'success');
            
            // Recharge les hôtels
            await loadHotels();
            
            // Ferme la modale d'upload
            setTimeout(() => {
                closeUploadPhotosModal();
                
                // Raffraîchit les détails si ouverts
                if (currentHotelDetails && currentHotelDetails.id === currentUploadHotelId) {
                    viewHotelDetails(currentUploadHotelId);
                }
            }, 1000);
        } else {
            throw new Error(data.error || 'Erreur lors de l\'upload');
        }
    } catch (error) {
        console.error('❌ Erreur upload photos:', error);
        showToast('Erreur lors de l\'upload des photos', 'error');
        
        // Réactive le bouton
        btnUpload.disabled = false;
        btnUpload.innerHTML = originalHTML;
        progressDiv.classList.add('hidden');
    }
}

/**
 * Affiche un message toast
 */
function showToast(message, type = 'success') {
    // Crée le toast s'il n'existe pas
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300';
        document.body.appendChild(toast);
    }
    
    // Style selon le type
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        'bg-yellow-500 text-white'
    }`;
    
    toast.textContent = message;
    toast.style.opacity = '1';
    
    // Cache après 3s
    setTimeout(() => {
        toast.style.opacity = '0';
    }, 3000);
}

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}
