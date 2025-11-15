/**
 * Dashboard Admin MotoTrip Planner - Version Flask
 * COMPLET avec Google Maps + Système de Médias
 */

// ============================================
// VARIABLES GLOBALES
// ============================================

let currentTripId = null;
let currentTripName = null;
let currentTripData = null;
let allDays = [];
let deleteCallback = null;

// Google Maps
let cityAutocomplete = null;
let hotelAutocomplete = null;
let searchCityAutocomplete = null;

// Système de médias
let selectedFilesGeneral = [];
let selectedFilesHotel = [];
let selectedHotelForUpload = null;
let allGeneralPhotos = [];
let allHotelPhotos = [];
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;
let currentPhotoToAssign = null;

// Firebase
const APP_ID = 'default-app-id';
const USER_ID = 'sam-user';

// ============================================
// INITIALISATION FIREBASE
// ============================================

function initFirebase() {
    if (!window.firebaseConfig) {
        console.error('Configuration Firebase non trouvée');
        return false;
    }
    
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(window.firebaseConfig);
            console.log('✅ Firebase initialisé');
        }
        return true;
    } catch (error) {
        console.error('❌ Erreur Firebase:', error);
        return false;
    }
}

// ============================================
// GESTION DES VOYAGES
// ============================================

async function addTrip(event) {
    event.preventDefault();
    const nameInput = document.getElementById('trip-name-input');
    const name = nameInput.value.trim();
    if (!name) return;
    
    try {
        const data = await fetchAPI('/admin/api/trips', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        if (data.success) {
            showToast('Voyage ajouté !', 'success');
            nameInput.value = '';
            await loadTrips();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function loadTrips() {
    try {
        const data = await fetchAPI('/admin/api/trips');
        const tripsList = document.getElementById('trips-list');
        
        if (!data.trips || data.trips.length === 0) {
            tripsList.innerHTML = '<p class="text-gray-500">Aucun voyage pour le moment. Ajoutez-en un !</p>';
            return;
        }
        
        tripsList.innerHTML = '';
        
        data.trips.forEach(trip => {
            const tripEl = document.createElement('div');
            const isSelected = String(trip.id) === String(currentTripId);
            tripEl.className = `trip-item flex justify-between items-center p-3 rounded-md cursor-pointer transition-colors hover:bg-gray-100 ${isSelected ? 'bg-blue-100 text-blue-800' : ''}`;
            tripEl.dataset.id = String(trip.id);
            tripEl.dataset.name = trip.name;
            
            tripEl.innerHTML = `
                <span class="font-medium flex-1">${trip.name}</span>
                <div class="flex items-center gap-2">
                    ${trip.publishedSlug ? '<span class="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1"><i class="fas fa-globe"></i>Publié</span>' : ''}
                    <button data-id="${trip.id}" data-name="${trip.name}" class="delete-trip-btn text-red-500 hover:text-red-700 opacity-50 hover:opacity-100 transition-opacity">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            tripEl.addEventListener('click', (e) => {
                if (e.target.closest('.delete-trip-btn')) return;
                selectTrip(trip.id, trip.name);
            });
            
            tripEl.querySelector('.delete-trip-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteTrip(trip.id, trip.name);
            });
            
            tripsList.appendChild(tripEl);
        });
    } catch (error) {
        console.error('Erreur chargement voyages:', error);
        showToast('Erreur de chargement des voyages', 'error');
    }
}

function deleteTrip(tripId, tripName) {
    showDeleteConfirm(`Voulez-vous vraiment supprimer le voyage "${tripName}" ?`, async () => {
        try {
            const data = await fetchAPI(`/admin/api/trips/${tripId}`, { method: 'DELETE' });
            
            if (data.success) {
                showToast('Voyage supprimé', 'success');
                if (currentTripId === tripId) {
                    currentTripId = null;
                    currentTripName = null;
                    document.getElementById('trip-details-container').classList.add('hidden');
                    document.getElementById('adapter-container').classList.add('hidden');
                }
                await loadTrips();
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

async function selectTrip(tripId, tripName) {
    currentTripId = String(tripId);
    currentTripName = tripName;
    
    document.getElementById('current-trip-name').textContent = tripName;
    document.getElementById('trip-details-container').classList.remove('hidden');
    document.getElementById('adapter-container').classList.remove('hidden');
    
    document.querySelectorAll('.trip-item').forEach(el => {
        if (String(el.dataset.id) === String(tripId)) {
            el.classList.add('bg-blue-100', 'text-blue-800');
            el.classList.remove('hover:bg-gray-100');
        } else {
            el.classList.remove('bg-blue-100', 'text-blue-800');
            el.classList.add('hover:bg-gray-100');
        }
    });
    
    await loadTripData();
    await loadDays();
}

async function loadTripData() {
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}`);
        
        if (data.success) {
            currentTripData = data.trip;
            const salePricePP = currentTripData.salePricePerPerson || 0;
            document.getElementById('sale-price-pp-input').value = salePricePP > 0 ? salePricePP : '';
            const ratehawkUrl = currentTripData.ratehawkListUrl || null;
            document.getElementById('view-hotel-list-btn').disabled = !ratehawkUrl;
            updatePublishButtons();
        }
    } catch (error) {
        console.error('Erreur chargement voyage:', error);
    }
}

// ============================================
// GESTION DES ÉTAPES
// ============================================

async function loadDays() {
    const daysList = document.getElementById('days-list');
    if (!currentTripId) {
        daysList.innerHTML = '';
        return;
    }
    
    showLoader('days-list');
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`);
        allDays = data.days || [];
        
        if (allDays.length === 0) {
            daysList.innerHTML = '<p class="text-gray-500">Aucune étape pour ce voyage. Ajoutez-en une !</p>';
            updateCostCalculator(data.costs || {}, data.sale_prices || {});
            return;
        }
        
        daysList.innerHTML = '';
        
        for (const day of allDays) {
            const hotelPhotosCount = await countHotelPhotos(day.id);
            
            const dayEl = document.createElement('div');
            dayEl.className = 'border border-gray-200 p-4 rounded-lg flex justify-between items-start';
            
            dayEl.innerHTML = `
                <div class="flex-grow overflow-hidden pr-2">
                    <h4 class="font-semibold text-lg">
                        ${day.dayName}
                        ${day.city ? `<span class="text-gray-500 font-normal text-base">• ${day.city}</span>` : ''}
                        ${day.nights && day.nights > 1 ? `<span class="ml-2 bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold"><i class="fas fa-moon mr-1"></i>${day.nights} nuits</span>` : ''}
                    </h4>
                    <p class="text-gray-700 truncate">
                        <i class="fas fa-hotel text-gray-500 w-4 mr-1"></i>
                        ${day.hotelName}
                        ${day.hotelLink ? `<a href="${day.hotelLink}" target="_blank" class="text-blue-500 hover:underline ml-2"><i class="fas fa-external-link-alt text-xs"></i></a>` : ''}
                    </p>
                    <p class="text-gray-600 text-sm mt-1">
                        <i class="fas fa-users text-gray-500 w-4 mr-1"></i> Double: <strong>${day.priceDouble.toFixed(2)}€</strong>
                        <i class="fas fa-user text-gray-500 w-4 ml-3 mr-1"></i> Solo: <strong>${day.priceSolo.toFixed(2)}€</strong>
                    </p>
                    <p class="text-gray-600 text-sm">
                        <i class="fas fa-map-signs text-gray-500 w-4 mr-1"></i> GPX: <strong>${day.gpxFile || 'N/A'}</strong>
                    </p>
                </div>
                <div class="flex flex-col items-center gap-3 ml-4 shrink-0">
                    <button data-id="${day.id}" class="edit-day-btn text-blue-500 hover:text-blue-700 opacity-60 hover:opacity-100 transition-opacity" title="Modifier l'étape">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button data-day-id="${day.id}" class="view-hotel-photos-btn relative text-indigo-600 hover:text-indigo-800 opacity-60 hover:opacity-100 transition-opacity ${hotelPhotosCount === 0 ? 'cursor-not-allowed opacity-30' : ''}" ${hotelPhotosCount === 0 ? 'disabled' : ''} title="Photos de l'hôtel (${hotelPhotosCount})">
                        <i class="fas fa-camera"></i>
                        ${hotelPhotosCount > 0 ? `<span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">${hotelPhotosCount}</span>` : ''}
                    </button>
                    <button data-id="${day.id}" class="delete-day-btn text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 transition-opacity" title="Supprimer l'étape">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            dayEl.querySelector('.edit-day-btn').addEventListener('click', () => openEditDayModal(day));
            
            const photoBtn = dayEl.querySelector('.view-hotel-photos-btn');
            if (photoBtn && hotelPhotosCount > 0) {
                photoBtn.addEventListener('click', () => openHotelLightbox(day.id));
            }
            
            dayEl.querySelector('.delete-day-btn').addEventListener('click', () => deleteDay(day.id, day.dayName));
            
            daysList.appendChild(dayEl);
        }
        
        updateCostCalculator(data.costs || {}, data.sale_prices || {});
    } catch (error) {
        console.error('Erreur chargement étapes:', error);
        daysList.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

function openAddDayModal() {
    const modal = document.getElementById('add-day-modal');
    const form = document.getElementById('add-day-form');
    const title = document.getElementById('day-modal-title');
    
    form.reset();
    document.getElementById('editing-day-id').value = '';
    title.textContent = 'Ajouter une nouvelle étape';
    document.getElementById('save-day-btn').textContent = 'Enregistrer l\'étape';
    
    toggleModal(modal, true);
    
    // Initialise l'autocomplétion au focus des champs
    setupAutocompleteOnFocus();
}

function openEditDayModal(day) {
    const modal = document.getElementById('add-day-modal');
    const title = document.getElementById('day-modal-title');
    
    document.getElementById('editing-day-id').value = day.id;
    document.getElementById('day-name').value = day.dayName;
    document.getElementById('day-city').value = day.city || '';
    document.getElementById('day-hotel-name').value = day.hotelName;
    document.getElementById('day-price-double').value = day.priceDouble;
    document.getElementById('day-price-solo').value = day.priceSolo;
    document.getElementById('day-nights').value = day.nights || 1;
    document.getElementById('day-gpx-file').value = day.gpxFile || '';
    document.getElementById('day-hotel-link').value = day.hotelLink || '';
    
    title.textContent = 'Modifier l\'étape';
    document.getElementById('save-day-btn').textContent = 'Enregistrer les modifications';
    
    toggleModal(modal, true);
    
    // Initialise l'autocomplétion au focus des champs
    setupAutocompleteOnFocus();
}

/**
 * Configure l'autocomplétion pour s'activer au premier focus
 */
function setupAutocompleteOnFocus() {
    const cityInput = document.getElementById('day-city');
    const hotelInput = document.getElementById('day-hotel-name');
    
    if (!cityInput || !hotelInput) return;
    
    // Ajoute des listeners one-time sur le focus
    const initOnFocus = () => {
        initGoogleMapsAutocomplete();
        cityInput.removeEventListener('focus', initOnFocus);
        hotelInput.removeEventListener('focus', initOnFocus);
    };
    
    cityInput.addEventListener('focus', initOnFocus, { once: true });
    hotelInput.addEventListener('focus', initOnFocus, { once: true });
}

/**
 * Initialise l'autocomplétion Google Maps pour les champs ville et hôtel
 */
function initGoogleMapsAutocomplete() {
    // Vérifie que les champs existent (modale ouverte)
    const cityInput = document.getElementById('day-city');
    const hotelInput = document.getElementById('day-hotel-name');

    if (!cityInput || !hotelInput) {
        return;
    }

    // Vérifie que Google Maps est disponible
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('⏳ Google Maps pas encore chargé, réessai dans 500ms...');
        setTimeout(() => initGoogleMapsAutocomplete(), 500);
        return;
    }

    try {
        // Détruit les anciennes instances si elles existent
        if (cityAutocomplete) {
            google.maps.event.clearInstanceListeners(cityInput);
            cityAutocomplete = null;
        }
        if (hotelAutocomplete) {
            google.maps.event.clearInstanceListeners(hotelInput);
            hotelAutocomplete = null;
        } 

        // Crée l'autocomplétion pour la ville
        cityAutocomplete = new google.maps.places.Autocomplete(cityInput, {
            types: ['(cities)'],
            fields: ['name', 'geometry', 'formatted_address', 'address_components']
        });

        cityAutocomplete.addListener('place_changed', () => {
            const place = cityAutocomplete.getPlace();
            if (!place.geometry) {
                // L'utilisateur n'a pas sélectionné une suggestion valide
                console.warn('❌ Aucune suggestion sélectionnée pour la ville');
                return;
            }
            
            // Utilise formatted_address ou extrait le nom de la ville
            let cityName = place.formatted_address || place.name;
            
            // Si on a les components, essaie d'extraire juste le nom de la ville
            if (place.address_components) {
                const cityComponent = place.address_components.find(
                    c => c.types.includes('locality') || c.types.includes('postal_town')
                );
                if (cityComponent) {
                    cityName = cityComponent.long_name;
                }
            }
            
            if (cityName) {
                cityInput.value = cityName;
                console.log('✅ Ville validée:', cityName);
            }
        });

        // Crée l'autocomplétion pour l'hôtel
        hotelAutocomplete = new google.maps.places.Autocomplete(hotelInput, {
            types: ['lodging'],
            fields: ['name', 'geometry', 'formatted_address', 'place_id', 'photos']
        });

        hotelAutocomplete.addListener('place_changed', () => {
            const place = hotelAutocomplete.getPlace();
            if (!place.geometry) {
                // L'utilisateur n'a pas sélectionné une suggestion valide
                console.warn('❌ Aucune suggestion sélectionnée pour l\'hôtel');
                return;
            }
            
            // Utilise le nom de l'hôtel
            const hotelName = place.name || place.formatted_address;
            
            if (hotelName) {
                hotelInput.value = hotelName;
                console.log('✅ Hôtel validé:', hotelName);
                if (place.place_id) {
                    hotelInput.dataset.placeId = place.place_id;
                }
            }
        });

        console.log('✅ Autocomplétion Google Maps activée');
    } catch (error) {
        console.error('❌ Erreur initialisation Google Maps:', error);
    }
}

function extractFromRatehawkUrl(event) {
    const url = event.target.value.trim();
    if (!url || !url.includes('ratehawk.com')) return;
    
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        
        if (pathParts.length >= 5 && pathParts[0] === 'hotel') {
            const city = pathParts[2];
            const hotelName = pathParts[4];
            
            const cleanCity = city.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            const cleanHotelName = hotelName.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ').replace(/\s+/g, ' ').trim();
            
            const cityInput = document.getElementById('day-city');
            const hotelInput = document.getElementById('day-hotel-name');
            
            if (cityInput && !cityInput.value) {
                cityInput.value = cleanCity;
                showToast(`🔍 Recherche de "${cleanCity}" sur Google Maps...`, 'success');
                // Déclenche une recherche Google Places pour valider
                triggerPlacesSearch(cityInput, cleanCity, 'city');
            }
            
            if (hotelInput && !hotelInput.value) {
                hotelInput.value = cleanHotelName;
                showToast(`🔍 Recherche de "${cleanHotelName}" sur Google Maps...`, 'success');
                // Déclenche une recherche Google Places pour valider
                triggerPlacesSearch(hotelInput, cleanHotelName, 'hotel');
            }
        }
    } catch (error) {
        console.error('Erreur extraction RateHawk:', error);
    }
}

/**
 * Déclenche une recherche Google Places pour valider un champ
 */
function triggerPlacesSearch(inputElement, searchQuery, type) {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('Google Maps pas disponible pour la validation');
        return;
    }
    
    const service = new google.maps.places.AutocompleteService();
    const placesService = new google.maps.places.PlacesService(document.createElement('div'));
    
    // Options de recherche selon le type
    const requestOptions = type === 'city' 
        ? { input: searchQuery, types: ['(cities)'] }
        : { input: searchQuery, types: ['lodging'] };
    
    service.getPlacePredictions(requestOptions, (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            // Prend la première prédiction
            const firstPrediction = predictions[0];
            
            // Récupère les détails de ce lieu
            placesService.getDetails(
                { placeId: firstPrediction.place_id },
                (place, detailStatus) => {
                    if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                        if (type === 'city') {
                            // Pour la ville, extrait le nom propre
                            let cityName = place.formatted_address || place.name;
                            
                            if (place.address_components) {
                                const cityComponent = place.address_components.find(
                                    c => c.types.includes('locality') || c.types.includes('postal_town')
                                );
                                if (cityComponent) {
                                    cityName = cityComponent.long_name;
                                }
                            }
                            
                            inputElement.value = cityName;
                            showToast(`✅ Ville validée: ${cityName}`, 'success');
                        } else {
                            // Pour l'hôtel, utilise le nom
                            const hotelName = place.name || place.formatted_address;
                            inputElement.value = hotelName;
                            
                            if (place.place_id) {
                                inputElement.dataset.placeId = place.place_id;
                            }
                            
                            showToast(`✅ Hôtel validé: ${hotelName}`, 'success');
                        }
                    } else {
                        console.warn(`Impossible de valider ${type}:`, detailStatus);
                        const itemType = type === 'city' ? 'ville' : 'hôtel';
                        showToast(`⚠️ ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} non trouvé sur Google Maps - nom manuel conservé`, 'error');
                    }
                }
            );
        } else {
            console.warn(`Aucune suggestion trouvée pour: ${searchQuery}`);
            const itemType = type === 'city' ? 'ville' : 'hôtel';
            showToast(`⚠️ ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} non trouvé sur Google Maps - nom manuel conservé`, 'error');
        }
    });
}

async function saveDayForm(event) {
    event.preventDefault();
    
    const editingId = document.getElementById('editing-day-id').value;
    const isEditing = !!editingId;
    
    const hotelInput = document.getElementById('day-hotel-name');
    const placeId = hotelInput.dataset.placeId;
    
    const dayData = {
        dayName: document.getElementById('day-name').value.trim(),
        city: document.getElementById('day-city').value.trim(),
        hotelName: document.getElementById('day-hotel-name').value.trim(),
        priceDouble: parseFloat(document.getElementById('day-price-double').value) || 0,
        priceSolo: parseFloat(document.getElementById('day-price-solo').value) || 0,
        nights: parseInt(document.getElementById('day-nights').value) || 1,
        gpxFile: document.getElementById('day-gpx-file').value.trim(),
        hotelLink: document.getElementById('day-hotel-link').value.trim()
    };
    
    try {
        let data;
        if (isEditing) {
            data = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(dayData)
            });
            showToast('Étape mise à jour !', 'success');
        } else {
            data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`, {
                method: 'POST',
                body: JSON.stringify(dayData)
            });
            showToast('Étape ajoutée !', 'success');
            
            // Si c'est une nouvelle étape ET qu'on a un placeId, télécharge les photos
            if (data.success && data.day_id && placeId) {
                showToast('📸 Téléchargement des photos de l\'hôtel...', 'success');
                await downloadHotelPhotosFromPlaces(placeId, dayData.hotelName, data.day_id);
            }
        }
        
        if (data.success) {
            toggleModal(document.getElementById('add-day-modal'), false);
            await loadDays();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function deleteDay(dayId, dayName) {
    showDeleteConfirm(`Voulez-vous vraiment supprimer l'étape "${dayName}" ?`, async () => {
        try {
            const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${dayId}`, { method: 'DELETE' });
            
            if (data.success) {
                showToast('Étape supprimée', 'success');
                await loadDays();
            }
        } catch (error) {
            showToast(error.message, 'error');
        }
    });
}

// ============================================
// CALCULATEUR DE COÛTS
// ============================================

function updateCostCalculator(costs, salePrices) {
    document.getElementById('total-double').textContent = (costs.total_double || 0).toFixed(2) + '€';
    document.getElementById('total-double-pp').textContent = (costs.cost_double_per_person || 0).toFixed(2) + '€';
    document.getElementById('total-solo').textContent = (costs.total_solo || 0).toFixed(2) + '€';
    document.getElementById('sale-double').textContent = (salePrices.sale_double || 0).toFixed(2) + '€';
    document.getElementById('sale-double-pp').textContent = (salePrices.sale_price_per_person || 0).toFixed(2) + '€';
    document.getElementById('sale-solo').textContent = (salePrices.sale_solo || 0).toFixed(2) + '€';
    document.getElementById('margin-per-person').textContent = (salePrices.margin_per_person || 0).toFixed(2) + '€';
    document.getElementById('margin-percent').textContent = '(' + (salePrices.margin_percent || 0).toFixed(1) + '%)';
}

let saveSalePriceTimeout = null;
async function handleSalePriceChange() {
    const salePricePP = parseFloat(document.getElementById('sale-price-pp-input').value) || 0;
    
    if (saveSalePriceTimeout) clearTimeout(saveSalePriceTimeout);
    
    saveSalePriceTimeout = setTimeout(async () => {
        if (currentTripId) {
            try {
                await fetchAPI(`/admin/api/trips/${currentTripId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ salePricePerPerson: salePricePP })
                });
                await loadDays();
            } catch (error) {
                console.error('Erreur sauvegarde prix:', error);
            }
        }
    }, 1000);
}

// ============================================
// GESTION URL RATEHAWK
// ============================================

function openEncodeHotelListModal() {
    const modal = document.getElementById('encode-hotel-list-modal');
    const input = document.getElementById('ratehawk-url-input');
    input.value = currentTripData?.ratehawkListUrl || '';
    toggleModal(modal, true);
}

async function saveRatehawkUrl() {
    const url = document.getElementById('ratehawk-url-input').value.trim();
    if (!url) {
        showToast('Veuillez entrer une URL', 'error');
        return;
    }
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}`, {
            method: 'PUT',
            body: JSON.stringify({ ratehawkListUrl: url })
        });
        
        if (data.success) {
            showToast('URL enregistrée !', 'success');
            toggleModal(document.getElementById('encode-hotel-list-modal'), false);
            document.getElementById('view-hotel-list-btn').disabled = false;
            await loadTripData();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function viewHotelList() {
    const url = currentTripData?.ratehawkListUrl;
    if (url) {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        window.open(fullUrl, '_blank');
    }
}

// ============================================
// MODALE DE CONFIRMATION
// ============================================

function showDeleteConfirm(message, callback) {
    document.getElementById('delete-confirm-message').textContent = message;
    deleteCallback = callback;
    toggleModal(document.getElementById('delete-confirm-modal'), true);
}

// ============================================
// GESTION DE LA PUBLICATION
// ============================================

function openPublishModal() {
    if (!currentTripId) return;
    
    const modal = document.getElementById('publish-modal');
    const form = document.getElementById('publish-form');
    
    form.reset();
    document.getElementById('publishing-trip-id').value = currentTripId;
    document.getElementById('publish-price').value = currentTripData?.salePricePerPerson || '';
    document.getElementById('publish-active').checked = true;
    
    const suggestedSlug = generateSlugFromName(currentTripName);
    document.getElementById('publish-slug').value = suggestedSlug;
    updateSlugPreview(suggestedSlug);
    
    toggleModal(modal, true);
}

function generateSlugFromName(name) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function updateSlugPreview(slug) {
    const preview = document.getElementById('slug-preview');
    const previewUrl = document.getElementById('slug-preview-url');
    
    if (slug) {
        previewUrl.textContent = `app.oldibike.be/voyageperso/${slug}`;
        preview.classList.remove('hidden');
    } else {
        preview.classList.add('hidden');
    }
}

async function publishTrip(event) {
    event.preventDefault();
    
    const tripId = document.getElementById('publishing-trip-id').value;
    const slug = document.getElementById('publish-slug').value.trim();
    const description = document.getElementById('publish-description').value.trim();
    const pricePerPerson = parseFloat(document.getElementById('publish-price').value) || 0;
    const isActive = document.getElementById('publish-active').checked;
    
    const publishData = {
        slug: slug || null,
        description: description,
        pricePerPerson: pricePerPerson,
        isActive: isActive
    };
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${tripId}/publish`, {
            method: 'POST',
            body: JSON.stringify(publishData)
        });
        
        if (data.success) {
            showToast(`Voyage publié ! URL: ${data.url}`, 'success');
            toggleModal(document.getElementById('publish-modal'), false);
            await loadTrips();
            await loadTripData();
            updatePublishButtons();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function openUnpublishModal() {
    if (!currentTripId) return;
    toggleModal(document.getElementById('unpublish-modal'), true);
}

async function unpublishTrip() {
    if (!currentTripId) return;
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/unpublish`, { method: 'DELETE' });
        
        if (data.success) {
            showToast('Voyage dépublié', 'success');
            toggleModal(document.getElementById('unpublish-modal'), false);
            await loadTrips();
            await loadTripData();
            updatePublishButtons();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updatePublishButtons() {
    const publishBtn = document.getElementById('publish-trip-btn');
    const unpublishBtn = document.getElementById('unpublish-trip-btn');
    
    if (!currentTripData) {
        publishBtn.classList.add('hidden');
        unpublishBtn.classList.add('hidden');
        return;
    }
    
    const isPublished = currentTripData.publishedSlug;
    
    if (isPublished) {
        publishBtn.classList.add('hidden');
        unpublishBtn.classList.remove('hidden');
    } else {
        publishBtn.classList.remove('hidden');
        unpublishBtn.classList.add('hidden');
    }
}

// ============================================
// RECHERCHE D'HÔTELS À PROXIMITÉ
// ============================================

async function getAllUserHotels() {
    try {
        const data = await fetchAPI('/admin/api/trips');
        if (!data.trips || data.trips.length === 0) return [];
        
        const hotels = [];
        for (const trip of data.trips) {
            try {
                const daysData = await fetchAPI(`/admin/api/trips/${trip.id}/days`);
                if (daysData.days && daysData.days.length > 0) {
                    daysData.days.forEach(day => {
                        if (day.city && day.hotelName) {
                            hotels.push({ ...day, tripId: trip.id, tripName: trip.name });
                        }
                    });
                }
            } catch (error) {
                console.error(`Erreur chargement étapes voyage ${trip.id}:`, error);
            }
        }
        return hotels;
    } catch (error) {
        console.error('Erreur récupération hôtels:', error);
        return [];
    }
}

function geocodeCity(cityName) {
    return new Promise((resolve, reject) => {
        if (typeof google === 'undefined' || !google.maps) {
            reject(new Error('Google Maps non chargé'));
            return;
        }
        
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ 'address': cityName }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                resolve({
                    lat: location.lat(),
                    lng: location.lng(),
                    formattedAddress: results[0].formatted_address
                });
            } else {
                reject(new Error('Ville non trouvée'));
            }
        });
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

async function searchNearbyHotels() {
    const cityInput = document.getElementById('search-nearby-city-input');
    const searchLoader = document.getElementById('search-loader');
    const searchResults = document.getElementById('search-results');
    const noResults = document.getElementById('no-results');
    const resultsList = document.getElementById('results-list');
    const cityName = cityInput.value.trim();
    
    if (!cityName) {
        showToast("Veuillez entrer un nom de ville.", "error");
        return;
    }
    
    searchLoader.classList.remove('hidden');
    searchResults.classList.add('hidden');
    noResults.classList.add('hidden');
    
    try {
        const searchLocation = await geocodeCity(cityName);
        const allHotels = await getAllUserHotels();
        
        if (allHotels.length === 0) {
            searchLoader.classList.add('hidden');
            noResults.classList.remove('hidden');
            return;
        }
        
        const hotelsWithDistance = [];
        for (const hotel of allHotels) {
            try {
                const hotelLocation = await geocodeCity(hotel.city);
                const distance = calculateDistance(
                    searchLocation.lat,
                    searchLocation.lng,
                    hotelLocation.lat,
                    hotelLocation.lng
                );
                
                if (!isNaN(distance) && distance >= 0 && distance <= 20) {
                    hotelsWithDistance.push({ ...hotel, distance: distance });
                }
            } catch (error) {
                console.log(`Impossible de géolocaliser ${hotel.city}`);
            }
        }
        
        searchLoader.classList.add('hidden');
        
        if (hotelsWithDistance.length === 0) {
            noResults.classList.remove('hidden');
        } else {
            hotelsWithDistance.sort((a, b) => a.distance - b.distance);
            
            resultsList.innerHTML = '';
            hotelsWithDistance.forEach(hotel => {
                const resultEl = document.createElement('div');
                resultEl.className = 'bg-gray-50 p-4 rounded-lg hover:bg-gray-100 cursor-pointer border border-gray-200 transition-colors';
                resultEl.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex-1">
                            <h5 class="font-semibold text-gray-900">${hotel.hotelName}</h5>
                            <p class="text-sm text-gray-600">
                                <i class="fas fa-map-marker-alt mr-1"></i>${hotel.city}
                                <span class="ml-3 text-indigo-600 font-semibold">${hotel.distance.toFixed(1)} km</span>
                            </p>
                            <p class="text-xs text-gray-500 mt-1">
                                <i class="fas fa-suitcase mr-1"></i>Voyage: ${hotel.tripName}
                            </p>
                        </div>
                        <button class="ml-4 bg-indigo-600 text-white px-3 py-1 rounded text-sm hover:bg-indigo-700">
                            <i class="fas fa-check mr-1"></i>Utiliser
                        </button>
                    </div>
                `;
                
                resultEl.querySelector('button').addEventListener('click', () => useSelectedHotel(hotel));
                resultsList.appendChild(resultEl);
            });
            
            searchResults.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Erreur recherche:", error);
        searchLoader.classList.add('hidden');
        showToast("Ville introuvable. Vérifiez l'orthographe.", "error");
    }
}

function useSelectedHotel(hotel) {
    toggleModal(document.getElementById('nearby-hotels-modal'), false);
    document.getElementById('day-city').value = hotel.city;
    document.getElementById('day-hotel-name').value = hotel.hotelName;
    document.getElementById('day-price-double').value = hotel.priceDouble;
    document.getElementById('day-price-solo').value = hotel.priceSolo;
    document.getElementById('day-hotel-link').value = hotel.hotelLink || '';
    showToast(`✨ Hôtel sélectionné : ${hotel.hotelName} à ${hotel.city}`, "success");
}

/**
 * Initialise l'autocomplétion pour la recherche d'hôtels à proximité
 */
function initSearchAutocomplete() {
    if (searchCityAutocomplete) return; // Déjà initialisé
    
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('⏳ Google Maps pas encore disponible pour la recherche');
        return;
    }
    
    const searchInput = document.getElementById('search-nearby-city-input');
    if (searchInput) {
        searchCityAutocomplete = new google.maps.places.Autocomplete(searchInput, {
            types: ['(cities)'],
            fields: ['name', 'geometry']
        });
        
        searchCityAutocomplete.addListener('place_changed', () => {
            setTimeout(() => searchNearbyHotels(), 100);
        });
        
        console.log('✅ Autocomplétion recherche initialisée');
    }
}

// ============================================
// SYSTÈME DE MÉDIAS
// ============================================

/**
 * Compte les photos d'un hôtel (pour afficher le badge)
 * IMPORTANT: Utilise la collection globale et le nom d'hôtel comme clé
 */
async function countHotelPhotos(dayId) {
    // Ne compte pas si Firebase n'est pas initialisé
    if (typeof firebase === 'undefined' || !firebase.apps || firebase.apps.length === 0) return 0;
    if (!firebase.firestore) return 0;
    
    try {
        const db = firebase.firestore();
        
        // Récupère le nom de l'hôtel depuis l'étape
        const dayDoc = await db.collection(`artifacts/${APP_ID}/users/${USER_ID}/trips/${currentTripId}/days`).doc(dayId).get();
        if (!dayDoc.exists) return 0;
        
        const hotelName = dayDoc.data().hotelName;
        if (!hotelName) return 0;
        
        // Compte les photos globales pour cet hôtel (collection globale)
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'hotel')
            .where('hotelName', '==', hotelName);
        
        const snapshot = await mediaQuery.get();
        return snapshot.size;
    } catch (error) {
        console.error("Erreur lors du comptage des photos:", error);
        return 0;
    }
}

/**
 * Ouvre la modale de gestion des médias
 */
function openMediaManager() {
    if (!currentTripId || !currentTripName) {
        showToast("Veuillez sélectionner un voyage d'abord.", "error");
        return;
    }
    
    document.getElementById('media-trip-name').textContent = currentTripName;
    toggleModal(document.getElementById('media-manager-modal'), true);
    
    // Charge les données de l'onglet actif (par défaut: Général)
    loadGeneralPhotos();
    loadPopularTags();
    updateSpaceMonitoring();
}

/**
 * Ouvre la lightbox pour les photos d'un hôtel par l'ID de l'étape
 */
async function openHotelLightbox(dayId) {
    if (!firebase || !firebase.firestore || !firebase.storage) {
        showToast("Firebase non disponible", "error");
        return;
    }
    
    try {
        const db = firebase.firestore();
        
        // Récupère le nom de l'hôtel
        const dayDoc = await db.collection(`artifacts/${APP_ID}/users/${USER_ID}/trips/${currentTripId}/days`).doc(dayId).get();
        if (!dayDoc.exists) {
            showToast("Étape non trouvée.", "error");
            return;
        }
        
        const dayData = dayDoc.data();
        const hotelName = dayData.hotelName;
        
        if (!hotelName) {
            showToast("Pas de nom d'hôtel pour cette étape.", "error");
            return;
        }
        
        // Récupère toutes les photos de cet hôtel (collection globale)
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'hotel')
            .where('hotelName', '==', hotelName);
        
        const snapshot = await mediaQuery.get();
        
        if (snapshot.empty) {
            showToast("Aucune photo pour cet hôtel.", "error");
            return;
        }
        
        currentLightboxPhotos = [];
        snapshot.forEach(doc => {
            currentLightboxPhotos.push({ id: doc.id, ...doc.data() });
        });
        
        // Trie par date
        currentLightboxPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateA - dateB;
        });
        
        currentLightboxIndex = 0;
        
        // Met à jour l'en-tête
        document.getElementById('lightbox-hotel-name').textContent = hotelName;
        document.getElementById('lightbox-day-name').textContent = `${dayData.dayName}${dayData.city ? ' • ' + dayData.city : ''}`;
        
        // Affiche la première photo
        updateLightboxDisplay();
        
        // Ouvre la modale
        toggleModal(document.getElementById('hotel-lightbox-modal'), true);
        
    } catch (error) {
        console.error("Erreur lors de l'ouverture de la lightbox:", error);
        showToast("Erreur lors du chargement des photos.", "error");
    }
}

/**
 * Gestion des onglets Général / Hôtels
 */
function switchTab(tabName) {
    const tabGeneralBtn = document.getElementById('tab-general-btn');
    const tabHotelsBtn = document.getElementById('tab-hotels-btn');
    const tabGeneralContent = document.getElementById('tab-general-content');
    const tabHotelsContent = document.getElementById('tab-hotels-content');
    
    if (tabName === 'general') {
        tabGeneralBtn.classList.add('border-purple-600', 'text-gray-900');
        tabGeneralBtn.classList.remove('border-transparent', 'text-gray-600');
        tabHotelsBtn.classList.remove('border-purple-600', 'text-gray-900');
        tabHotelsBtn.classList.add('border-transparent', 'text-gray-600');
        
        tabGeneralContent.classList.remove('hidden');
        tabHotelsContent.classList.add('hidden');
        
        loadGeneralPhotos();
    } else {
        tabHotelsBtn.classList.add('border-purple-600', 'text-gray-900');
        tabHotelsBtn.classList.remove('border-transparent', 'text-gray-600');
        tabGeneralBtn.classList.remove('border-purple-600', 'text-gray-900');
        tabGeneralBtn.classList.add('border-transparent', 'text-gray-600');
        
        tabHotelsContent.classList.remove('hidden');
        tabGeneralContent.classList.add('hidden');
        
        loadHotelPhotos();
    }
}

/**
 * Gère le clic sur "Ajouter des photos (cols, routes)"
 */
function handleGeneralUploadClick() {
    document.getElementById('upload-general-input').click();
}

/**
 * Gère la sélection de fichiers pour upload général
 */
function handleGeneralFilesSelected(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    selectedFilesGeneral = files;
    
    // Affiche la modale de tagging
    document.getElementById('files-count').textContent = files.length;
    document.getElementById('tags-input').value = '';
    
    // Charge les tags suggérés
    loadSuggestedTags();
    
    toggleModal(document.getElementById('tagging-modal'), true);
}

/**
 * Charge les tags suggérés (tags populaires du voyage)
 */
async function loadSuggestedTags() {
    if (!firebase || !firebase.firestore) return;
    
    const suggestedTagsContainer = document.getElementById('suggested-tags');
    suggestedTagsContainer.innerHTML = '';
    
    try {
        const db = firebase.firestore();
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'general')
            .where('assignedTrips', 'array-contains', currentTripId);
        
        const snapshot = await mediaQuery.get();
        const tagsCount = {};
        
        snapshot.forEach(doc => {
            const tags = doc.data().tags || [];
            tags.forEach(tag => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
        });
        
        // Trie par popularité et affiche les 6 premiers
        const sortedTags = Object.entries(tagsCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([tag]) => tag);
        
        sortedTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.type = 'button';
            tagBtn.className = 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition-colors';
            tagBtn.textContent = tag;
            tagBtn.addEventListener('click', () => {
                const input = document.getElementById('tags-input');
                const currentTags = input.value.split(',').map(t => t.trim()).filter(t => t);
                if (!currentTags.includes(tag)) {
                    currentTags.push(tag);
                    input.value = currentTags.join(', ');
                }
            });
            suggestedTagsContainer.appendChild(tagBtn);
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des tags suggérés:", error);
    }
}

/**
 * Confirme l'upload des photos générales avec les tags
 */
async function confirmGeneralUpload() {
    if (!firebase || !firebase.firestore || !firebase.storage) {
        showToast("Firebase non disponible", "error");
        return;
    }
    
    const tagsInput = document.getElementById('tags-input').value.trim();
    
    if (!tagsInput) {
        showToast("Veuillez ajouter au moins un tag.", "error");
        return;
    }
    
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    
    if (tags.length === 0) {
        showToast("Veuillez ajouter au moins un tag valide.", "error");
        return;
    }
    
    // Désactive les boutons
    document.getElementById('confirm-upload-general-btn').disabled = true;
    document.getElementById('cancel-tagging-btn').disabled = true;
    
    // Affiche la barre de progression
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');
    progressContainer.classList.remove('hidden');
    
    try {
        const storage = firebase.storage();
        const db = firebase.firestore();
        const totalFiles = selectedFilesGeneral.length;
        let uploadedFiles = 0;
        
        for (const file of selectedFilesGeneral) {
            // Upload vers Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = storage.ref(`users/${USER_ID}/media/general/${fileName}`);
            
            await storageRef.put(file);
            const downloadURL = await storageRef.getDownloadURL();
            
            // Enregistre dans Firestore (collection globale)
            await db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`).add({
                type: 'general',
                fileName: file.name,
                storagePath: storageRef.fullPath,
                downloadURL: downloadURL,
                tags: tags,
                fileSize: file.size,
                assignedTrips: [currentTripId],
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            uploadedFiles++;
            const progress = Math.round((uploadedFiles / totalFiles) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
        
        showToast(`${totalFiles} photo(s) uploadée(s) avec succès !`, "success");
        
        // Ferme la modale
        toggleModal(document.getElementById('tagging-modal'), false);
        
        // Recharge la galerie
        loadGeneralPhotos();
        loadPopularTags();
        updateSpaceMonitoring();
        
        // Réinitialise
        selectedFilesGeneral = [];
        document.getElementById('upload-general-input').value = '';
        
    } catch (error) {
        console.error("Erreur lors de l'upload:", error);
        showToast("Erreur lors de l'upload des photos.", "error");
    } finally {
        // Réactive les boutons
        document.getElementById('confirm-upload-general-btn').disabled = false;
        document.getElementById('cancel-tagging-btn').disabled = false;
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    }
}

/**
 * Charge et affiche les photos générales (cols/routes)
 */
async function loadGeneralPhotos(filterTag = null) {
    if (!firebase || !firebase.firestore) return;
    
    const gridContainer = document.getElementById('general-photos-grid');
    const noPhotosMessage = document.getElementById('no-general-photos');
    
    gridContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Chargement...</p>';
    
    try {
        const db = firebase.firestore();
        
        // Requête vers la collection globale
        let mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'general')
            .where('assignedTrips', 'array-contains', currentTripId);
        
        // Note: Firebase ne permet pas de combiner array-contains avec array-contains-any
        // donc on filtre les tags côté client
        
        const snapshot = await mediaQuery.get();
        
        if (snapshot.empty) {
            gridContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        noPhotosMessage.classList.add('hidden');
        gridContainer.innerHTML = '';
        allGeneralPhotos = [];
        
        // Collecte toutes les photos
        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            
            // Filtre par tag si nécessaire
            if (filterTag && !photo.tags.includes(filterTag)) {
                return;
            }
            
            allGeneralPhotos.push(photo);
        });
        
        if (allGeneralPhotos.length === 0) {
            gridContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        // Trie par date
        allGeneralPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateB - dateA;
        });
        
        // Affiche les photos
        allGeneralPhotos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'relative group bg-gray-100 rounded-lg overflow-hidden aspect-square';
            photoCard.innerHTML = `
                <img src="${photo.downloadURL}" 
                     alt="${photo.fileName}" 
                     class="w-full h-full object-cover">
                
                <!-- Overlay avec tags -->
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <div class="flex flex-wrap gap-1">
                        ${photo.tags.map(tag => `
                            <span class="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Boutons d'action -->
                <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="download-photo-btn bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center"
                            data-url="${photo.downloadURL}"
                            data-filename="${photo.fileName}"
                            title="Télécharger">
                        <i class="fas fa-download text-xs"></i>
                    </button>
                    <button class="delete-photo-btn bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center"
                            data-id="${photo.id}"
                            data-path="${photo.storagePath}"
                            title="Supprimer">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `;
            
            gridContainer.appendChild(photoCard);
        });
        
        // Ajoute les listeners
        document.querySelectorAll('.download-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadPhoto(btn.dataset.url, btn.dataset.filename);
            });
        });
        
        document.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePhoto(btn.dataset.id, btn.dataset.path, 'general');
            });
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des photos:", error);
        gridContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Erreur de chargement</p>';
    }
}

/**
 * Charge les tags populaires pour le filtre
 */
async function loadPopularTags() {
    if (!firebase || !firebase.firestore) return;
    
    const container = document.getElementById('popular-tags-container');
    container.innerHTML = '';
    
    try {
        const db = firebase.firestore();
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'general')
            .where('assignedTrips', 'array-contains', currentTripId);
        
        const snapshot = await mediaQuery.get();
        const tagsCount = {};
        
        snapshot.forEach(doc => {
            const tags = doc.data().tags || [];
            tags.forEach(tag => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
        });
        
        // Trie par popularité
        const sortedTags = Object.entries(tagsCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sortedTags.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">Aucun tag pour le moment</p>';
            return;
        }
        
        sortedTags.forEach(([tag, count]) => {
            const tagBtn = document.createElement('button');
            tagBtn.type = 'button';
            tagBtn.className = 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition-colors flex items-center gap-2';
            tagBtn.innerHTML = `
                ${tag}
                <span class="bg-purple-300 text-purple-900 px-1.5 py-0.5 rounded-full text-xs font-bold">${count}</span>
            `;
            tagBtn.addEventListener('click', () => {
                document.getElementById('search-tags-input').value = tag;
                loadGeneralPhotos(tag);
            });
            container.appendChild(tagBtn);
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des tags:", error);
    }
}

/**
 * Gère le clic sur "Ajouter photos d'hôtel"
 */
function handleHotelUploadClick() {
    document.getElementById('upload-hotel-input').click();
}

/**
 * Gère la sélection de fichiers pour upload hôtel
 */
function handleHotelFilesSelected(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    selectedFilesHotel = files;
    
    // Affiche la modale de sélection d'hôtel
    document.getElementById('hotel-files-count').textContent = files.length;
    
    // Charge la liste des hôtels
    loadHotelsForSelection();
    
    toggleModal(document.getElementById('hotel-selection-modal'), true);
}

/**
 * Charge la liste des hôtels/étapes pour la sélection
 */
async function loadHotelsForSelection() {
    if (!firebase || !firebase.firestore) return;
    
    const listContainer = document.getElementById('hotels-list-selection');
    listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Chargement des hôtels...</p>';
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`);
        
        if (!data.days || data.days.length === 0) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Aucune étape dans ce voyage</p>';
            return;
        }
        
        listContainer.innerHTML = '';
        
        data.days.forEach(day => {
            const hotelOption = document.createElement('div');
            hotelOption.className = 'hotel-option border border-gray-300 rounded-md p-3 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-colors';
            hotelOption.dataset.dayId = day.id;
            hotelOption.dataset.hotelName = day.hotelName;
            hotelOption.dataset.dayName = day.dayName;
            hotelOption.dataset.city = day.city || '';
            hotelOption.innerHTML = `
                <p class="font-semibold text-gray-900">
                    <i class="fas fa-map-marker-alt text-gray-400 mr-2"></i>
                    ${day.dayName}${day.city ? ' • ' + day.city : ''}
                </p>
                <p class="text-sm text-gray-600 mt-1">
                    <i class="fas fa-hotel text-gray-400 mr-2"></i>
                    ${day.hotelName}
                </p>
            `;
            
            hotelOption.addEventListener('click', () => {
                // Désélectionne tous
                document.querySelectorAll('.hotel-option').forEach(opt => {
                    opt.classList.remove('bg-blue-100', 'border-blue-500');
                    opt.classList.add('border-gray-300');
                });
                
                // Sélectionne celui-ci
                hotelOption.classList.add('bg-blue-100', 'border-blue-500');
                hotelOption.classList.remove('border-gray-300');
                
                // Stocke la sélection
                selectedHotelForUpload = {
                    dayId: day.id,
                    hotelName: day.hotelName,
                    dayName: day.dayName
                };
                
                // Active le bouton d'upload
                document.getElementById('confirm-upload-hotel-btn').disabled = false;
            });
            
            listContainer.appendChild(hotelOption);
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des hôtels:", error);
        listContainer.innerHTML = '<p class="text-center text-red-500 py-4">Erreur de chargement</p>';
    }
}

/**
 * Confirme l'upload des photos d'hôtel
 */
async function confirmHotelUpload() {
    if (!firebase || !firebase.firestore || !firebase.storage) {
        showToast("Firebase non disponible", "error");
        return;
    }
    
    if (!selectedHotelForUpload) {
        showToast("Veuillez sélectionner un hôtel.", "error");
        return;
    }
    
    // Désactive les boutons
    document.getElementById('confirm-upload-hotel-btn').disabled = true;
    document.getElementById('cancel-hotel-selection-btn').disabled = true;
    
    // Affiche la barre de progression
    const progressContainer = document.getElementById('upload-hotel-progress-container');
    const progressBar = document.getElementById('upload-hotel-progress-bar');
    const progressText = document.getElementById('upload-hotel-progress-text');
    progressContainer.classList.remove('hidden');
    
    try {
        const storage = firebase.storage();
        const db = firebase.firestore();
        const totalFiles = selectedFilesHotel.length;
        let uploadedFiles = 0;
        
        for (const file of selectedFilesHotel) {
            // Upload vers Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const hotelSlug = selectedHotelForUpload.hotelName.toLowerCase().replace(/[^a-z0-9]/g, '_');
            const storageRef = storage.ref(`users/${USER_ID}/media/hotels/${hotelSlug}/${fileName}`);
            
            await storageRef.put(file);
            const downloadURL = await storageRef.getDownloadURL();
            
            // Enregistre dans Firestore (collection globale)
            await db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`).add({
                type: 'hotel',
                fileName: file.name,
                storagePath: storageRef.fullPath,
                downloadURL: downloadURL,
                hotelName: selectedHotelForUpload.hotelName,
                linkedDayId: selectedHotelForUpload.dayId,
                fileSize: file.size,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            uploadedFiles++;
            const progress = Math.round((uploadedFiles / totalFiles) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
        
        showToast(`${totalFiles} photo(s) d'hôtel uploadée(s) avec succès !`, "success");
        
        // Ferme la modale
        toggleModal(document.getElementById('hotel-selection-modal'), false);
        
        // Recharge
        loadHotelPhotos();
        updateSpaceMonitoring();
        loadDays(); // Pour mettre à jour les badges
        
        // Réinitialise
        selectedFilesHotel = [];
        selectedHotelForUpload = null;
        document.getElementById('upload-hotel-input').value = '';
        
    } catch (error) {
        console.error("Erreur lors de l'upload:", error);
        showToast("Erreur lors de l'upload des photos d'hôtel.", "error");
    } finally {
        // Réactive les boutons
        document.getElementById('confirm-upload-hotel-btn').disabled = false;
        document.getElementById('cancel-hotel-selection-btn').disabled = false;
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    }
}

/**
 * Charge et affiche les photos d'hôtels groupées par nom d'hôtel
 */
async function loadHotelPhotos(filterHotelName = null) {
    if (!firebase || !firebase.firestore) return;
    
    const listContainer = document.getElementById('hotels-photos-list');
    const noPhotosMessage = document.getElementById('no-hotel-photos');
    
    listContainer.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const db = firebase.firestore();
        
        // Récupère les étapes du voyage actuel
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`);
        
        if (!data.days || data.days.length === 0) {
            listContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        // Extrait les noms d'hôtels du voyage
        const hotelNamesInTrip = new Set();
        const daysByHotelName = {};
        
        data.days.forEach(day => {
            const hotelName = day.hotelName;
            if (hotelName) {
                hotelNamesInTrip.add(hotelName);
                if (!daysByHotelName[hotelName]) {
                    daysByHotelName[hotelName] = [];
                }
                daysByHotelName[hotelName].push(day);
            }
        });
        
        if (hotelNamesInTrip.size === 0) {
            listContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        // Charge TOUTES les photos d'hôtels (collection globale)
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'hotel');
        
        const snapshot = await mediaQuery.get();
        
        if (snapshot.empty) {
            listContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        noPhotosMessage.classList.add('hidden');
        listContainer.innerHTML = '';
        
        const allPhotos = [];
        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            allPhotos.push(photo);
        });
        
        // Trie par date
        allPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateB - dateA;
        });
        
        // Groupe les photos par nom d'hôtel
        const photosByHotelName = {};
        
        allPhotos.forEach(photo => {
            const hotelName = photo.hotelName;
            
            // Ne garde que les photos des hôtels présents dans ce voyage
            if (!hotelNamesInTrip.has(hotelName)) {
                return;
            }
            
            // Filtre si nécessaire
            if (filterHotelName && !hotelName.toLowerCase().includes(filterHotelName.toLowerCase())) {
                return;
            }
            
            if (!photosByHotelName[hotelName]) {
                photosByHotelName[hotelName] = [];
            }
            photosByHotelName[hotelName].push(photo);
        });
        
        if (Object.keys(photosByHotelName).length === 0) {
            listContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        // Affiche chaque groupe
        for (const [hotelName, photos] of Object.entries(photosByHotelName)) {
            const hotelSection = document.createElement('div');
            hotelSection.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';
            
            const daysWithThisHotel = daysByHotelName[hotelName] || [];
            
            hotelSection.innerHTML = `
                <div class="mb-3">
                    <h4 class="font-semibold text-lg text-gray-900">
                        <i class="fas fa-hotel text-indigo-500 mr-2"></i>
                        ${hotelName}
                    </h4>
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-map-marker-alt text-gray-400 mr-2"></i>
                        ${daysWithThisHotel.map(d => `${d.dayName}${d.city ? ' • ' + d.city : ''}`).join(' | ')}
                    </p>
                    ${daysWithThisHotel.length > 1 ? `<p class="text-xs text-green-600 mt-1"><i class="fas fa-check-circle mr-1"></i>Photos partagées entre ${daysWithThisHotel.length} étapes</p>` : ''}
                </div>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    ${photos.map(photo => `
                        <div class="relative group bg-white rounded-lg overflow-hidden aspect-square border border-gray-200">
                            <img src="${photo.downloadURL}" 
                                 alt="${photo.fileName}" 
                                 class="w-full h-full object-cover cursor-pointer"
                                 data-hotel-name="${hotelName}">
                            
                            <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="download-photo-btn bg-blue-600 hover:bg-blue-700 text-white w-7 h-7 rounded-full flex items-center justify-center"
                                        data-url="${photo.downloadURL}"
                                        data-filename="${photo.fileName}"
                                        title="Télécharger">
                                    <i class="fas fa-download text-xs"></i>
                                </button>
                                <button class="delete-photo-btn bg-red-600 hover:bg-red-700 text-white w-7 h-7 rounded-full flex items-center justify-center"
                                        data-id="${photo.id}"
                                        data-path="${photo.storagePath}"
                                        title="Supprimer">
                                    <i class="fas fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <p class="text-xs text-gray-500 mt-3 text-right">
                    ${photos.length} photo${photos.length > 1 ? 's' : ''}
                </p>
            `;
            
            listContainer.appendChild(hotelSection);
        }
        
        // Ajoute les listeners
        document.querySelectorAll('.download-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadPhoto(btn.dataset.url, btn.dataset.filename);
            });
        });
        
        document.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePhoto(btn.dataset.id, btn.dataset.path, 'hotel');
            });
        });
        
        // Listener pour ouvrir la lightbox
        document.querySelectorAll('[data-hotel-name]').forEach(img => {
            if (img.tagName === 'IMG') {
                img.addEventListener('click', () => {
                    openHotelLightboxByName(img.dataset.hotelName);
                });
            }
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des photos d'hôtels:", error);
        listContainer.innerHTML = '<p class="text-center text-red-500">Erreur de chargement</p>';
    }
}

/**
 * Met à jour l'affichage de la lightbox
 */
function updateLightboxDisplay() {
    const currentPhoto = currentLightboxPhotos[currentLightboxIndex];
    
    // Image principale
    document.getElementById('lightbox-main-image').src = currentPhoto.downloadURL;
    
    // Compteur
    document.getElementById('lightbox-current-index').textContent = currentLightboxIndex + 1;
    document.getElementById('lightbox-total-count').textContent = currentLightboxPhotos.length;
    
    // Miniatures
    const thumbnailsContainer = document.getElementById('lightbox-thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    currentLightboxPhotos.forEach((photo, index) => {
        const thumb = document.createElement('img');
        thumb.src = photo.downloadURL;
        thumb.alt = photo.fileName;
        thumb.className = `w-20 h-20 object-cover rounded cursor-pointer border-2 transition-all ${
            index === currentLightboxIndex ? 'border-purple-600 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
        }`;
        thumb.addEventListener('click', () => {
            currentLightboxIndex = index;
            updateLightboxDisplay();
        });
        thumbnailsContainer.appendChild(thumb);
    });
    
    // Bouton download
    const downloadBtn = document.getElementById('lightbox-download-btn');
    downloadBtn.onclick = () => downloadPhoto(currentPhoto.downloadURL, currentPhoto.fileName);
    
    // Navigation
    document.getElementById('lightbox-prev-btn').style.display = 
        currentLightboxPhotos.length > 1 ? 'flex' : 'none';
    document.getElementById('lightbox-next-btn').style.display = 
        currentLightboxPhotos.length > 1 ? 'flex' : 'none';
}

/**
 * Navigation précédent dans la lightbox
 */
function lightboxPrev() {
    if (currentLightboxIndex > 0) {
        currentLightboxIndex--;
    } else {
        currentLightboxIndex = currentLightboxPhotos.length - 1;
    }
    updateLightboxDisplay();
}

/**
 * Navigation suivant dans la lightbox
 */
function lightboxNext() {
    if (currentLightboxIndex < currentLightboxPhotos.length - 1) {
        currentLightboxIndex++;
    } else {
        currentLightboxIndex = 0;
    }
    updateLightboxDisplay();
}

/**
 * Ouvre la lightbox par nom d'hôtel
 */
async function openHotelLightboxByName(hotelName) {
    if (!firebase || !firebase.firestore) return;
    
    try {
        const db = firebase.firestore();
        
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'hotel')
            .where('hotelName', '==', hotelName);
        
        const snapshot = await mediaQuery.get();
        
        if (snapshot.empty) {
            showToast("Aucune photo pour cet hôtel.", "error");
            return;
        }
        
        currentLightboxPhotos = [];
        snapshot.forEach(doc => {
            currentLightboxPhotos.push({ id: doc.id, ...doc.data() });
        });
        
        currentLightboxPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateA - dateB;
        });
        
        currentLightboxIndex = 0;
        
        document.getElementById('lightbox-hotel-name').textContent = hotelName;
        document.getElementById('lightbox-day-name').textContent = '';
        
        updateLightboxDisplay();
        toggleModal(document.getElementById('hotel-lightbox-modal'), true);
        
    } catch (error) {
        console.error("Erreur lors de l'ouverture de la lightbox:", error);
        showToast("Erreur lors du chargement des photos.", "error");
    }
}

/**
 * Télécharge une photo
 */
async function downloadPhoto(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast("Photo téléchargée !", "success");
    } catch (error) {
        console.error("Erreur lors du téléchargement:", error);
        showToast("Erreur lors du téléchargement.", "error");
    }
}

/**
 * Supprime une photo
 */
async function deletePhoto(mediaId, storagePath, type) {
    if (!firebase || !firebase.firestore || !firebase.storage) return;
    
    showDeleteConfirm("Voulez-vous vraiment supprimer cette photo ?", async () => {
        try {
            const storage = firebase.storage();
            const db = firebase.firestore();
            
            // Supprime de Storage
            const storageRef = storage.ref(storagePath);
            await storageRef.delete();
            
            // Supprime de Firestore
            await db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`).doc(mediaId).delete();
            
            showToast("Photo supprimée.", "success");
            
            // Recharge
            if (type === 'general') {
                loadGeneralPhotos();
                loadPopularTags();
            } else {
                loadHotelPhotos();
                loadDays();
            }
            
            updateSpaceMonitoring();
            
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            showToast("Erreur lors de la suppression.", "error");
        }
    });
}

/**
 * Télécharge automatiquement les photos Google Places d'un hôtel
 */
async function downloadHotelPhotosFromPlaces(placeId, hotelName, dayId) {
    if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
        console.warn('Google Maps pas disponible pour télécharger les photos');
        return;
    }
    
    if (!firebase || !firebase.firestore || !firebase.storage) {
        console.warn('Firebase pas disponible pour télécharger les photos');
        return;
    }
    
    try {
        const placesService = new google.maps.places.PlacesService(document.createElement('div'));
        
        // Récupère les détails de l'hôtel avec les photos
        placesService.getDetails(
            { 
                placeId: placeId,
                fields: ['photos', 'name']
            },
            async (place, status) => {
                if (status !== google.maps.places.PlacesServiceStatus.OK || !place || !place.photos) {
                    console.warn('Aucune photo disponible pour cet hôtel');
                    showToast('⚠️ Pas de photos disponibles sur Google Maps', 'error');
                    return;
                }
                
                // Limite à 5 photos
                const photos = place.photos.slice(0, 5);
                
                console.log(`📸 ${photos.length} photo(s) trouvée(s) pour ${hotelName}`);
                
                let uploadedCount = 0;
                const storage = firebase.storage();
                const db = firebase.firestore();
                
                for (let i = 0; i < photos.length; i++) {
                    try {
                        const photo = photos[i];
                        
                        // Récupère l'URL de la photo en haute résolution
                        const photoUrl = photo.getUrl({ maxWidth: 1600, maxHeight: 1600 });
                        
                        // Envoie la requête au backend pour télécharger et uploader
                        const response = await fetchAPI('/admin/api/download-place-photo', {
                            method: 'POST',
                            body: JSON.stringify({
                                photoUrl: photoUrl,
                                hotelName: hotelName,
                                dayId: dayId,
                                fileIndex: i
                            })
                        });
                        
                        if (response.success) {
                            uploadedCount++;
                            console.log(`✅ Photo ${i + 1}/${photos.length} uploadée: ${response.fileName}`);
                        }
                        
                    } catch (photoError) {
                        console.error(`Erreur upload photo ${i + 1}:`, photoError);
                    }
                }
                
                if (uploadedCount > 0) {
                    showToast(`✅ ${uploadedCount} photo(s) Google Places téléchargée(s) automatiquement !`, 'success');
                    // Recharge la liste des étapes pour mettre à jour les badges
                    loadDays();
                } else {
                    showToast('⚠️ Échec du téléchargement des photos', 'error');
                }
            }
        );
        
    } catch (error) {
        console.error('Erreur téléchargement photos Places:', error);
        showToast('❌ Erreur lors du téléchargement des photos', 'error');
    }
}

/**
 * Met à jour le monitoring de l'espace utilisé
 */
async function updateSpaceMonitoring() {
    if (!firebase || !firebase.firestore) return;
    
    try {
        const db = firebase.firestore();
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`);
        const snapshot = await mediaQuery.get();
        
        let totalSizeGeneral = 0;
        let totalSizeHotels = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'general') {
                totalSizeGeneral += data.fileSize || 0;
            } else {
                totalSizeHotels += data.fileSize || 0;
            }
        });
        
        const totalMBGeneral = (totalSizeGeneral / (1024 * 1024)).toFixed(2);
        const totalMBHotels = (totalSizeHotels / (1024 * 1024)).toFixed(2);
        const totalGB = 5;
        
        const percentGeneral = (totalSizeGeneral / (totalGB * 1024 * 1024 * 1024)) * 100;
        const percentHotels = (totalSizeHotels / (totalGB * 1024 * 1024 * 1024)) * 100;
        
        document.getElementById('space-used-general').textContent = totalMBGeneral + ' MB';
        document.getElementById('space-bar-general').style.width = Math.min(percentGeneral, 100) + '%';
        
        document.getElementById('space-used-hotels').textContent = totalMBHotels + ' MB';
        document.getElementById('space-bar-hotels').style.width = Math.min(percentHotels, 100) + '%';
        
    } catch (error) {
        console.error("Erreur lors du calcul de l'espace:", error);
    }
}

// ============================================
// UTILITAIRES
// ============================================

function showLoader(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
}

function toggleModal(modal, show) {
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (!toast || !toastMessage) return;
    
    toastMessage.textContent = message;
    toast.classList.remove('bg-green-500', 'bg-red-500', 'hidden', 'opacity-0');
    toast.classList.add(type === 'success' ? 'bg-green-500' : 'bg-red-500', 'opacity-100');
    
    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

async function fetchAPI(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Erreur API');
    }
    
    return data;
}

// ============================================
// EVENT LISTENERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialise Firebase
    initFirebase();
    
    // Initialise l'autocomplétion de recherche si Google Maps est disponible
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        console.log('✅ Google Maps API chargée et prête.');
        initSearchAutocomplete();
    }
    
    const addTripForm = document.getElementById('add-trip-form');
    if (addTripForm) addTripForm.addEventListener('submit', addTrip);
    
    const addDayForm = document.getElementById('add-day-form');
    if (addDayForm) addDayForm.addEventListener('submit', saveDayForm);
    
    const addDayModalBtn = document.getElementById('add-day-modal-btn');
    if (addDayModalBtn) addDayModalBtn.addEventListener('click', openAddDayModal);
    
    const cancelAddDayBtn = document.getElementById('cancel-add-day-btn');
    if (cancelAddDayBtn) cancelAddDayBtn.addEventListener('click', () => {
        toggleModal(document.getElementById('add-day-modal'), false);
    });
    
    const hotelLinkInput = document.getElementById('day-hotel-link');
    if (hotelLinkInput) hotelLinkInput.addEventListener('input', extractFromRatehawkUrl);
    
    const openHotelLinkBtn = document.getElementById('open-hotel-link-btn');
    if (openHotelLinkBtn) openHotelLinkBtn.addEventListener('click', () => {
        const url = document.getElementById('day-hotel-link').value.trim();
        if (url) window.open(url.startsWith('http') ? url : `https://${url}`, '_blank');
    });
    
    const salePriceInput = document.getElementById('sale-price-pp-input');
    if (salePriceInput) salePriceInput.addEventListener('input', handleSalePriceChange);
    
    const encodeBtn = document.getElementById('encode-hotel-list-btn');
    if (encodeBtn) encodeBtn.addEventListener('click', openEncodeHotelListModal);
    
    const viewBtn = document.getElementById('view-hotel-list-btn');
    if (viewBtn) viewBtn.addEventListener('click', viewHotelList);
    
    const saveRatehawkBtn = document.getElementById('save-hotel-list-url-btn');
    if (saveRatehawkBtn) saveRatehawkBtn.addEventListener('click', saveRatehawkUrl);
    
    const cancelEncodeBtn = document.getElementById('cancel-encode-hotel-list-btn');
    if (cancelEncodeBtn) cancelEncodeBtn.addEventListener('click', () => toggleModal(document.getElementById('encode-hotel-list-modal'), false));
    
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', () => {
        if (deleteCallback) deleteCallback();
        deleteCallback = null;
        toggleModal(document.getElementById('delete-confirm-modal'), false);
    });
    
    const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
    if (cancelDeleteBtn) cancelDeleteBtn.addEventListener('click', () => {
        deleteCallback = null;
        toggleModal(document.getElementById('delete-confirm-modal'), false);
    });
    
    const publishBtn = document.getElementById('publish-trip-btn');
    if (publishBtn) publishBtn.addEventListener('click', openPublishModal);
    
    const unpublishBtn = document.getElementById('unpublish-trip-btn');
    if (unpublishBtn) unpublishBtn.addEventListener('click', openUnpublishModal);
    
    const publishForm = document.getElementById('publish-form');
    if (publishForm) publishForm.addEventListener('submit', publishTrip);
    
    const confirmUnpublishBtn = document.getElementById('confirm-unpublish-btn');
    if (confirmUnpublishBtn) confirmUnpublishBtn.addEventListener('click', unpublishTrip);
    
    const publishSlugInput = document.getElementById('publish-slug');
    if (publishSlugInput) publishSlugInput.addEventListener('input', (e) => updateSlugPreview(e.target.value));
    
    const closePublishModalBtn = document.getElementById('close-publish-modal-btn');
    if (closePublishModalBtn) closePublishModalBtn.addEventListener('click', () => toggleModal(document.getElementById('publish-modal'), false));
    
    const cancelPublishBtn = document.getElementById('cancel-publish-btn');
    if (cancelPublishBtn) cancelPublishBtn.addEventListener('click', () => toggleModal(document.getElementById('publish-modal'), false));
    
    const cancelUnpublishBtn = document.getElementById('cancel-unpublish-btn');
    if (cancelUnpublishBtn) cancelUnpublishBtn.addEventListener('click', () => toggleModal(document.getElementById('unpublish-modal'), false));
    
    const searchNearbyBtn = document.getElementById('search-nearby-hotels-btn');
    if (searchNearbyBtn) {
        searchNearbyBtn.addEventListener('click', () => {
            document.getElementById('search-nearby-city-input').value = '';
            document.getElementById('search-results').classList.add('hidden');
            document.getElementById('no-results').classList.add('hidden');
            document.getElementById('search-loader').classList.add('hidden');
            toggleModal(document.getElementById('nearby-hotels-modal'), true);
            // L'autocomplétion est déjà initialisée au chargement de Google Maps
        });
    }
    
    const performSearchBtn = document.getElementById('perform-search-btn');
    if (performSearchBtn) performSearchBtn.addEventListener('click', searchNearbyHotels);
    
    const closeNearbyBtn = document.getElementById('close-nearby-hotels-btn');
    if (closeNearbyBtn) closeNearbyBtn.addEventListener('click', () => toggleModal(document.getElementById('nearby-hotels-modal'), false));
    
    const searchNearbyCityInput = document.getElementById('search-nearby-city-input');
    if (searchNearbyCityInput) searchNearbyCityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchNearbyHotels();
    });
    
    const manageMediaBtn = document.getElementById('manage-media-btn');
    if (manageMediaBtn) manageMediaBtn.addEventListener('click', openMediaManager);
    
    // Système de médias - Onglets
    const tabGeneralBtn = document.getElementById('tab-general-btn');
    if (tabGeneralBtn) tabGeneralBtn.addEventListener('click', () => switchTab('general'));
    
    const tabHotelsBtn = document.getElementById('tab-hotels-btn');
    if (tabHotelsBtn) tabHotelsBtn.addEventListener('click', () => switchTab('hotels'));
    
    // Système de médias - Upload général
    const uploadGeneralBtn = document.getElementById('upload-general-btn');
    if (uploadGeneralBtn) uploadGeneralBtn.addEventListener('click', handleGeneralUploadClick);
    
    const uploadGeneralInput = document.getElementById('upload-general-input');
    if (uploadGeneralInput) uploadGeneralInput.addEventListener('change', handleGeneralFilesSelected);
    
    const confirmUploadGeneralBtn = document.getElementById('confirm-upload-general-btn');
    if (confirmUploadGeneralBtn) confirmUploadGeneralBtn.addEventListener('click', confirmGeneralUpload);
    
    const cancelTaggingBtn = document.getElementById('cancel-tagging-btn');
    if (cancelTaggingBtn) cancelTaggingBtn.addEventListener('click', () => {
        toggleModal(document.getElementById('tagging-modal'), false);
        selectedFilesGeneral = [];
        document.getElementById('upload-general-input').value = '';
    });
    
    // Système de médias - Upload hôtel
    const uploadHotelBtn = document.getElementById('upload-hotel-btn');
    if (uploadHotelBtn) uploadHotelBtn.addEventListener('click', handleHotelUploadClick);
    
    const uploadHotelInput = document.getElementById('upload-hotel-input');
    if (uploadHotelInput) uploadHotelInput.addEventListener('change', handleHotelFilesSelected);
    
    const confirmUploadHotelBtn = document.getElementById('confirm-upload-hotel-btn');
    if (confirmUploadHotelBtn) confirmUploadHotelBtn.addEventListener('click', confirmHotelUpload);
    
    const cancelHotelSelectionBtn = document.getElementById('cancel-hotel-selection-btn');
    if (cancelHotelSelectionBtn) cancelHotelSelectionBtn.addEventListener('click', () => {
        toggleModal(document.getElementById('hotel-selection-modal'), false);
        selectedFilesHotel = [];
        selectedHotelForUpload = null;
        document.getElementById('upload-hotel-input').value = '';
    });
    
    // Système de médias - Lightbox
    const closeLightboxBtn = document.getElementById('close-lightbox-btn');
    if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', () => {
        toggleModal(document.getElementById('hotel-lightbox-modal'), false);
    });
    
    const lightboxPrevBtn = document.getElementById('lightbox-prev-btn');
    if (lightboxPrevBtn) lightboxPrevBtn.addEventListener('click', lightboxPrev);
    
    const lightboxNextBtn = document.getElementById('lightbox-next-btn');
    if (lightboxNextBtn) lightboxNextBtn.addEventListener('click', lightboxNext);
    
    // Système de médias - Recherche
    const searchTagsInput = document.getElementById('search-tags-input');
    if (searchTagsInput) {
        let searchTagsTimeout = null;
        searchTagsInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.trim();
            if (searchTagsTimeout) clearTimeout(searchTagsTimeout);
            searchTagsTimeout = setTimeout(() => {
                if (searchTerm) {
                    loadGeneralPhotos(searchTerm);
                } else {
                    loadGeneralPhotos();
                }
            }, 300);
        });
    }
    
    const searchHotelsInput = document.getElementById('search-hotels-input');
    if (searchHotelsInput) {
        let searchHotelsTimeout = null;
        searchHotelsInput.addEventListener('input', (event) => {
            const searchTerm = event.target.value.trim();
            if (searchHotelsTimeout) clearTimeout(searchHotelsTimeout);
            searchHotelsTimeout = setTimeout(() => {
                if (searchTerm) {
                    loadHotelPhotos(searchTerm);
                } else {
                    loadHotelPhotos();
                }
            }, 300);
        });
    }
    
    // Système de médias - Fermeture modales
    const closeMediaManagerBtn = document.getElementById('close-media-manager-btn');
    if (closeMediaManagerBtn) closeMediaManagerBtn.addEventListener('click', () => {
        toggleModal(document.getElementById('media-manager-modal'), false);
    });
    
    // Navigation clavier dans la lightbox
    document.addEventListener('keydown', (e) => {
        const lightboxModal = document.getElementById('hotel-lightbox-modal');
        if (lightboxModal && !lightboxModal.classList.contains('hidden')) {
            if (e.key === 'ArrowLeft') {
                lightboxPrev();
            } else if (e.key === 'ArrowRight') {
                lightboxNext();
            } else if (e.key === 'Escape') {
                toggleModal(lightboxModal, false);
            }
        }
    });
    
    loadTrips();
});
