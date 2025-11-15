/**
 * Dashboard Admin Optimisé - MotoTrip Planner
 * Version avec vue en grille et gestion des demandes
 */

// ============================================
// VARIABLES GLOBALES
// ============================================

let allTrips = [];
let allRequests = [];
let filteredTrips = [];
let currentFilter = 'all';
let searchTerm = '';
let stats = {
    trips: { total: 0, requested: 0, draft: 0, published: 0 },
    customers: 0,
    newRequests: 0
};

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadDashboardData();
    startPolling();
});

function initializeEventListeners() {
    // Onglets
    document.getElementById('tab-trips-btn')?.addEventListener('click', () => switchTab('trips'));
    document.getElementById('tab-requests-btn')?.addEventListener('click', () => switchTab('requests'));
    
    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.target.dataset.filter;
            updateFilterButtons();
            filterTrips();
        });
    });
    
    // Recherche
    document.getElementById('search-trips-input')?.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        filterTrips();
    });
    
    // Nouveau voyage
    document.getElementById('add-trip-btn-new')?.addEventListener('click', openQuickAddTripModal);
    document.getElementById('quick-add-trip-form')?.addEventListener('submit', handleQuickAddTrip);
    document.getElementById('cancel-quick-add-btn')?.addEventListener('click', () => toggleModal('quick-add-trip-modal', false));
    
    // Nouvelle demande manuelle
    document.getElementById('add-request-btn')?.addEventListener('click', openManualRequestModal);
    document.getElementById('manual-request-form')?.addEventListener('submit', handleManualRequestSubmit);
    document.getElementById('cancel-manual-request-btn')?.addEventListener('click', () => toggleModal('manual-request-modal', false));
    
    // Fermeture modale détails demande
    document.getElementById('close-request-details-btn')?.addEventListener('click', () => toggleModal('request-details-modal', false));
    
    // Fermeture panneau construction
    document.getElementById('close-panel-btn')?.addEventListener('click', () => {
        document.getElementById('trip-details-panel').classList.add('hidden');
    });
    
    // Bouton retour dans la section construction
    document.getElementById('back-to-grid-btn')?.addEventListener('click', backToGrid);
    
    // Boutons dans la section construction
    document.getElementById('add-day-modal-btn')?.addEventListener('click', openAddDayModal);
    document.getElementById('manage-media-btn')?.addEventListener('click', openMediaManager);
    
    // Gestion des modales d'ajout d'étape
    document.getElementById('cancel-add-day-btn')?.addEventListener('click', () => {
        toggleModal('add-day-modal', false);
    });
    
    document.getElementById('add-day-form')?.addEventListener('submit', saveDayForm);
    
    // Gestion modale médias
    document.getElementById('tab-general-btn')?.addEventListener('click', () => switchMediaTab('general'));
    document.getElementById('tab-hotels-btn')?.addEventListener('click', () => switchMediaTab('hotels'));
    document.getElementById('close-media-manager-btn')?.addEventListener('click', () => {
        toggleModal('media-manager-modal', false);
    });
}

// ============================================
// GESTION DES ÉTAPES - AJOUT/ÉDITION
// ============================================

// Variables Google Maps
let cityAutocomplete = null;
let hotelAutocomplete = null;

function openAddDayModal() {
    if (!currentTripId) {
        showToast('Sélectionnez un voyage d\'abord', 'error');
        return;
    }
    
    const modal = document.getElementById('add-day-modal');
    const form = document.getElementById('add-day-form');
    const title = document.getElementById('day-modal-title');
    
    form.reset();
    document.getElementById('editing-day-id').value = '';
    title.textContent = 'Ajouter une nouvelle étape';
    document.getElementById('save-day-btn').textContent = 'Enregistrer l\'étape';
    
    // ⭐ NOUVEAU : Reset le sélecteur d'hôtels
    if (window.hotelSelector) {
        window.hotelSelector.reset();
    }
    
    toggleModal('add-day-modal', true);
    
    // Initialise l'autocomplétion au focus des champs
    setupAutocompleteOnFocus();
}

/**
 * ⭐ NOUVEAU : Ouvre la modale d'édition d'une étape avec pré-remplissage
 */
async function openEditDayModal(dayId) {
    if (!currentTripId) {
        showToast('Sélectionnez un voyage d\'abord', 'error');
        return;
    }
    
    try {
        // Charge les données de l'étape
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${dayId}`);
        const day = data.day;
        
        if (!day) {
            showToast('Étape introuvable', 'error');
            return;
        }
        
        // Pré-remplit le formulaire
        document.getElementById('editing-day-id').value = dayId;
        document.getElementById('day-name').value = day.dayName || '';
        document.getElementById('day-city').value = day.city || '';
        document.getElementById('day-hotel-name').value = day.hotelName || '';
        document.getElementById('day-price-double').value = day.priceDouble || 0;
        document.getElementById('day-price-solo').value = day.priceSolo || 0;
        document.getElementById('day-nights').value = day.nights || 1;
        document.getElementById('day-gpx-file').value = day.gpxFile || '';
        document.getElementById('day-hotel-link').value = day.hotelLink || '';
        
        // Change le titre de la modale
        document.getElementById('day-modal-title').textContent = 'Modifier l\'étape';
        document.getElementById('save-day-btn').textContent = 'Mettre à jour';
        
        // ⭐ NOUVEAU : Si l'étape a un hotelId, pré-sélectionne l'hôtel dans la banque
        if (day.hotelId && window.hotelSelector) {
            window.hotelSelector.preselect(day.hotelId);
        } else if (window.hotelSelector) {
            window.hotelSelector.reset();
        }
        
        toggleModal('add-day-modal', true);
        
        // Initialise l'autocomplétion au focus des champs
        setupAutocompleteOnFocus();
        
    } catch (error) {
        console.error('Erreur chargement étape:', error);
        showToast('Erreur lors du chargement de l\'étape', 'error');
    }
}

/**
 * Configure l'autocomplétion pour s'activer au premier focus
 */
function setupAutocompleteOnFocus() {
    const cityInput = document.getElementById('day-city');
    const hotelInput = document.getElementById('day-hotel-name');
    const hotelLinkInput = document.getElementById('day-hotel-link');
    
    if (!cityInput || !hotelInput) return;
    
    // Ajoute listener pour extraction RateHawk
    if (hotelLinkInput && !hotelLinkInput.dataset.listenerAdded) {
        hotelLinkInput.addEventListener('input', extractFromRatehawkUrl);
        hotelLinkInput.dataset.listenerAdded = 'true';
    }
    
    // Ajoute des listeners one-time sur le focus pour l'autocomplétion
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

/**
 * Extrait les infos depuis une URL RateHawk et remplit automatiquement les champs
 */
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
    
    // ⭐ NOUVEAU : Récupère l'ID de l'hôtel sélectionné depuis la banque
    const selectedHotelId = window.hotelSelector ? window.hotelSelector.getSelectedHotelId() : null;
    
    const dayData = {
        dayName: document.getElementById('day-name').value.trim(),
        city: document.getElementById('day-city').value.trim(),
        hotelName: document.getElementById('day-hotel-name').value.trim(),
        priceDouble: parseFloat(document.getElementById('day-price-double').value) || 0,
        priceSolo: parseFloat(document.getElementById('day-price-solo').value) || 0,
        nights: parseInt(document.getElementById('day-nights').value) || 1,
        gpxFile: document.getElementById('day-gpx-file').value.trim(),
        hotelLink: document.getElementById('day-hotel-link').value.trim(),
        hotelId: selectedHotelId  // ⭐ NOUVEAU : null si saisie manuelle, sinon ID de l'hôtel
    };
    
    // Récupère la checkbox et le place_id de l'hôtel
    const autoFetchCheckbox = document.getElementById('auto-fetch-google-photos');
    const shouldAutoFetch = autoFetchCheckbox && autoFetchCheckbox.checked;
    const hotelInput = document.getElementById('day-hotel-name');
    const placeId = hotelInput?.dataset?.placeId;
    
    try {
        let data;
        let dayId;
        
        if (isEditing) {
            data = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${editingId}`, {
                method: 'PUT',
                body: JSON.stringify(dayData)
            });
            dayId = editingId;
            showToast('Étape mise à jour !', 'success');
        } else {
            data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`, {
                method: 'POST',
                body: JSON.stringify(dayData)
            });
            dayId = data.day_id;
            showToast('Étape ajoutée !', 'success');
        }
        
        if (data.success) {
            toggleModal('add-day-modal', false);
            
            // Si checkbox cochée et qu'on a un hôtel, tente de télécharger les photos Google
            if (shouldAutoFetch && dayId && dayData.hotelName && !isEditing) {
                await fetchGooglePhotosForHotel(dayId, dayData.hotelName, placeId);
            }
            
            await loadDaysForConstruction();
            await loadDashboardData(); // Recharge pour mettre à jour les stats
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Télécharge automatiquement les photos Google Places pour un hôtel
 */
async function fetchGooglePhotosForHotel(dayId, hotelName, placeId = null) {
    try {
        showToast('📸 Recherche de photos Google...', 'info');
        
        const requestBody = placeId ? { placeId } : {};
        
        const response = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${dayId}/fetch-google-photos`, {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
        
        if (response.success) {
            if (response.skipped) {
                showToast(`✅ ${response.message}`, 'success');
            } else if (response.photos_downloaded > 0) {
                showToast(`✅ ${response.photos_downloaded} photo(s) téléchargée(s) pour ${hotelName} !`, 'success');
            } else {
                showToast(`ℹ️ ${response.message || 'Aucune photo disponible sur Google'}`, 'info');
            }
        } else {
            console.warn('Impossible de télécharger les photos:', response.message);
            showToast(`⚠️ ${response.message || 'Photos non disponibles'}`, 'warning');
        }
    } catch (error) {
        console.error('Erreur téléchargement photos Google:', error);
        // N'affiche pas d'erreur bloquante à l'utilisateur
        // Les photos peuvent être ajoutées manuellement
    }
}

// ============================================
// GESTION DES MÉDIAS
// ============================================

// Variables Firebase pour médias
const APP_ID = 'default-app-id';
const USER_ID = 'sam-user';
let selectedFilesGeneral = [];
let selectedFilesHotel = [];
let selectedHotelForUpload = null;
let allGeneralPhotos = [];
let allHotelPhotos = [];
let currentLightboxPhotos = [];
let currentLightboxIndex = 0;

function openMediaManager() {
    if (!currentTripId || !currentTripData) {
        showToast('Sélectionnez un voyage d\'abord', 'error');
        return;
    }
    
    document.getElementById('media-trip-name').textContent = currentTripData.name || 'Voyage';
    toggleModal('media-manager-modal', true);
    
    // Charge l'onglet général par défaut
    switchMediaTab('general');
}

function switchMediaTab(tabName) {
    const tabGeneralBtn = document.getElementById('tab-general-btn');
    const tabHotelsBtn = document.getElementById('tab-hotels-btn');
    const tabGeneralContent = document.getElementById('tab-general-content');
    const tabHotelsContent = document.getElementById('tab-hotels-content');
    
    if (tabName === 'general') {
        tabGeneralBtn?.classList.add('border-purple-600', 'text-gray-900');
        tabGeneralBtn?.classList.remove('border-transparent', 'text-gray-600');
        tabHotelsBtn?.classList.remove('border-purple-600', 'text-gray-900');
        tabHotelsBtn?.classList.add('border-transparent', 'text-gray-600');
        
        tabGeneralContent?.classList.remove('hidden');
        tabHotelsContent?.classList.add('hidden');
        
        loadGeneralPhotos();
    } else {
        tabHotelsBtn?.classList.add('border-purple-600', 'text-gray-900');
        tabHotelsBtn?.classList.remove('border-transparent', 'text-gray-600');
        tabGeneralBtn?.classList.remove('border-purple-600', 'text-gray-900');
        tabGeneralBtn?.classList.add('border-transparent', 'text-gray-600');
        
        tabHotelsContent?.classList.remove('hidden');
        tabGeneralContent?.classList.add('hidden');
        
        loadHotelPhotos();
    }
}

async function loadGeneralPhotos(filterTag = null) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        showToast('Firebase non disponible', 'error');
        return;
    }
    
    const gridContainer = document.getElementById('general-photos-grid');
    const noPhotosMessage = document.getElementById('no-general-photos');
    
    if (!gridContainer) return;
    
    gridContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Chargement...</p>';
    
    try {
        const db = firebase.firestore();
        
        let mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'general')
            .where('assignedTrips', 'array-contains', currentTripId);
        
        const snapshot = await mediaQuery.get();
        
        if (snapshot.empty) {
            gridContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }
        
        noPhotosMessage?.classList.add('hidden');
        gridContainer.innerHTML = '';
        allGeneralPhotos = [];
        
        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            if (filterTag && !photo.tags?.includes(filterTag)) {
                return;
            }
            allGeneralPhotos.push(photo);
        });
        
        if (allGeneralPhotos.length === 0) {
            gridContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }
        
        allGeneralPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateB - dateA;
        });
        
        allGeneralPhotos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'relative group bg-gray-100 rounded-lg overflow-hidden aspect-square';
            photoCard.innerHTML = `
                <img src="${photo.downloadURL}" 
                     alt="${photo.fileName}" 
                     class="w-full h-full object-cover">
                
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <div class="flex flex-wrap gap-1">
                        ${(photo.tags || []).map(tag => `
                            <span class="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
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
        console.error('Erreur chargement photos:', error);
        gridContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Erreur de chargement</p>';
    }
}

async function loadHotelPhotos(filterHotelName = null) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        showToast('Firebase non disponible', 'error');
        return;
    }
    
    const listContainer = document.getElementById('hotels-photos-list');
    const noPhotosMessage = document.getElementById('no-hotel-photos');
    
    if (!listContainer) return;
    
    listContainer.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`);
        
        if (!data.days || data.days.length === 0) {
            listContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }
        
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
            noPhotosMessage?.classList.remove('hidden');
            return;
        }
        
        const db = firebase.firestore();
        const mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'hotel');
        
        const snapshot = await mediaQuery.get();
        
        if (snapshot.empty) {
            listContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }
        
        noPhotosMessage?.classList.add('hidden');
        listContainer.innerHTML = '';
        
        const allPhotos = [];
        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            allPhotos.push(photo);
        });
        
        allPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateB - dateA;
        });
        
        const photosByHotelName = {};
        
        allPhotos.forEach(photo => {
            const hotelName = photo.hotelName;
            if (!hotelNamesInTrip.has(hotelName)) return;
            if (filterHotelName && !hotelName.toLowerCase().includes(filterHotelName.toLowerCase())) return;
            
            if (!photosByHotelName[hotelName]) {
                photosByHotelName[hotelName] = [];
            }
            photosByHotelName[hotelName].push(photo);
        });
        
        if (Object.keys(photosByHotelName).length === 0) {
            listContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }
        
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
        
    } catch (error) {
        console.error('Erreur chargement photos hôtels:', error);
        listContainer.innerHTML = '<p class="text-center text-red-500">Erreur de chargement</p>';
    }
}

async function downloadPhoto(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast('Photo téléchargée !', 'success');
    } catch (error) {
        console.error('Erreur téléchargement:', error);
        showToast('Erreur lors du téléchargement', 'error');
    }
}

async function deletePhoto(mediaId, storagePath, type) {
    if (!firebase || !firebase.firestore || !firebase.storage) return;
    
    if (!confirm('Voulez-vous vraiment supprimer cette photo ?')) return;
    
    try {
        const storage = firebase.storage();
        const db = firebase.firestore();
        
        const storageRef = storage.ref(storagePath);
        await storageRef.delete();
        
        await db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`).doc(mediaId).delete();
        
        showToast('Photo supprimée', 'success');
        
        if (type === 'general') {
            loadGeneralPhotos();
        } else {
            loadHotelPhotos();
            loadDaysForConstruction();
        }
        
    } catch (error) {
        console.error('Erreur suppression:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

function switchTab(tab) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active', 'border-blue-600', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-600');
    });
    
    if (tab === 'trips') {
        document.getElementById('tab-trips-btn').classList.add('active', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-trips-content').classList.remove('hidden');
        document.getElementById('tab-requests-content').classList.add('hidden');
    } else if (tab === 'requests') {
        document.getElementById('tab-requests-btn').classList.add('active', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-requests-content').classList.remove('hidden');
        document.getElementById('tab-trips-content').classList.add('hidden');
        loadRequests();
    }
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadDashboardData() {
    try {
        // Charge statistiques
        const statsData = await fetchAPI('/admin/api/dashboard/stats');
        if (statsData.success) {
            stats = statsData.stats;
            updateStatsDisplay();
        }
        
        // Charge voyages
        const tripsData = await fetchAPI('/admin/api/trips');
        if (tripsData.success) {
            allTrips = tripsData.trips;
            
            // Enrichit avec statut et nombre d'étapes
            for (let trip of allTrips) {
                const daysData = await fetchAPI(`/admin/api/trips/${trip.id}/days`);
                trip.daysCount = daysData.days ? daysData.days.length : 0;
                trip.status = getStatusTrip(trip);
            }
            
            filterTrips();
        }
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showToast('Erreur de chargement', 'error');
    }
}

function getStatusTrip(trip) {
    if (trip.publishedSlug) return 'published';
    if (trip.daysCount > 0) return 'draft';
    return 'requested';
}

function updateStatsDisplay() {
    document.getElementById('stat-total').textContent = stats.trips.total;
    document.getElementById('stat-requested').textContent = stats.trips.requested;
    document.getElementById('stat-draft').textContent = stats.trips.draft;
    document.getElementById('stat-published').textContent = stats.trips.published;
    document.getElementById('clients-count').textContent = `(${stats.customers})`;
    
    // Badge demandes
    const badge = document.getElementById('requests-badge');
    if (stats.newRequests > 0) {
        badge.textContent = stats.newRequests;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// ============================================
// AFFICHAGE GRILLE VOYAGES
// ============================================

function filterTrips() {
    filteredTrips = allTrips.filter(trip => {
        // Filtre par statut
        if (currentFilter !== 'all' && trip.status !== currentFilter) {
            return false;
        }
        
        // Filtre par recherche
        if (searchTerm && !trip.name.toLowerCase().includes(searchTerm)) {
            return false;
        }
        
        return true;
    });
    
    displayTripsGrid();
}

function displayTripsGrid() {
    const grid = document.getElementById('trips-grid');
    const noTrips = document.getElementById('no-trips-message');
    
    if (filteredTrips.length === 0) {
        grid.classList.add('hidden');
        noTrips.classList.remove('hidden');
        return;
    }
    
    grid.classList.remove('hidden');
    noTrips.classList.add('hidden');
    
    grid.innerHTML = filteredTrips.map(trip => createTripCard(trip)).join('');
    
    // Event listeners sur les cartes
    document.querySelectorAll('.trip-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                const tripId = card.dataset.id;
                openTripDetails(tripId);
            }
        });
    });
    
    document.querySelectorAll('.delete-trip-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTrip(btn.dataset.id, btn.dataset.name);
        });
    });
}

function createTripCard(trip) {
    const statusBadge = getStatusBadge(trip.status);
    const statusColor = getStatusColor(trip.status);
    
    return `
        <div class="trip-card bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer border-t-4 ${statusColor}" data-id="${trip.id}">
            <div class="p-6">
                <!-- En-tête -->
                <div class="flex justify-between items-start mb-4">
                    <h3 class="text-xl font-semibold text-gray-900 flex-1 pr-2">${trip.name}</h3>
                    ${statusBadge}
                </div>
                
                <!-- Infos -->
                <div class="space-y-2 mb-4">
                    <div class="flex items-center text-sm text-gray-600">
                        <i class="fas fa-map-marked-alt w-5 mr-2"></i>
                        <span>${trip.daysCount} étape${trip.daysCount > 1 ? 's' : ''}</span>
                    </div>
                    ${trip.salePricePerPerson ? `
                        <div class="flex items-center text-sm text-gray-600">
                            <i class="fas fa-euro-sign w-5 mr-2"></i>
                            <span>${trip.salePricePerPerson.toFixed(0)}€ / personne</span>
                        </div>
                    ` : ''}
                    ${trip.publishedSlug ? `
                        <div class="flex items-center text-sm text-green-600">
                            <i class="fas fa-globe w-5 mr-2"></i>
                            <span>Publié</span>
                        </div>
                    ` : ''}
                </div>
                
                <!-- Actions -->
                <div class="flex gap-2 pt-4 border-t">
                    <button class="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium">
                        <i class="fas fa-edit mr-1"></i>Éditer
                    </button>
                    <button class="delete-trip-card-btn px-3 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 text-sm"
                            data-id="${trip.id}" data-name="${trip.name}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getStatusBadge(status) {
    const badges = {
        requested: '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">🟡 Demandé</span>',
        draft: '<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full">🔵 Construction</span>',
        published: '<span class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">🟢 Publié</span>'
    };
    return badges[status] || '';
}

function getStatusColor(status) {
    const colors = {
        requested: 'border-yellow-500',
        draft: 'border-indigo-500',
        published: 'border-green-500'
    };
    return colors[status] || 'border-gray-300';
}

function updateFilterButtons() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === currentFilter) {
            btn.classList.remove('bg-gray-200', 'text-gray-700');
            btn.classList.add('bg-blue-600', 'text-white', 'active');
        } else {
            btn.classList.remove('bg-blue-600', 'text-white', 'active');
            btn.classList.add('bg-gray-200', 'text-gray-700');
        }
    });
}

// ============================================
// GESTION VOYAGES
// ============================================

function openQuickAddTripModal() {
    toggleModal('quick-add-trip-modal', true);
    document.getElementById('quick-trip-name').value = '';
    document.getElementById('quick-trip-name').focus();
}

async function handleQuickAddTrip(e) {
    e.preventDefault();
    const name = document.getElementById('quick-trip-name').value.trim();
    
    if (!name) return;
    
    try {
        const data = await fetchAPI('/admin/api/trips', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
        
        if (data.success) {
            showToast('Voyage créé avec succès !', 'success');
            toggleModal('quick-add-trip-modal', false);
            await loadDashboardData();
            // Ouvre directement le voyage
            openTripDetails(data.trip_id);
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deleteTrip(tripId, tripName) {
    if (!confirm(`Voulez-vous vraiment supprimer le voyage "${tripName}" ?`)) {
        return;
    }
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${tripId}`, { method: 'DELETE' });
        
        if (data.success) {
            showToast('Voyage supprimé', 'success');
            await loadDashboardData();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

let currentTripId = null;
let currentTripData = null;

async function openTripDetails(tripId) {
    // Affiche la section construction et cache la grille
    currentTripId = tripId;
    const trip = allTrips.find(t => t.id === tripId);
    if (!trip) return;
    
    // Cache la grille et les onglets
    document.getElementById('stats-cards').classList.add('hidden');
    document.querySelector('.bg-white.rounded-lg.shadow-md.mb-6').classList.add('hidden'); // onglets
    document.getElementById('tab-trips-content').classList.add('hidden');
    
    // Affiche la section construction
    document.getElementById('trip-construction-section').classList.remove('hidden');
    document.getElementById('construction-trip-name').textContent = trip.name;
    
    // Charge les données du voyage
    await loadTripDataForConstruction(tripId);
}

async function loadTripDataForConstruction(tripId) {
    try {
        // Charge le voyage
        const tripData = await fetchAPI(`/admin/api/trips/${tripId}`);
        if (tripData.success) {
            currentTripData = tripData.trip;
            const salePricePP = currentTripData.salePricePerPerson || 0;
            document.getElementById('sale-price-pp-input').value = salePricePP > 0 ? salePricePP : '';
        }
        
        // Charge les étapes
        await loadDaysForConstruction();
    } catch (error) {
        console.error('Erreur chargement voyage:', error);
        showToast('Erreur de chargement', 'error');
    }
}

async function loadDaysForConstruction() {
    const daysList = document.getElementById('days-list');
    if (!currentTripId) {
        daysList.innerHTML = '';
        return;
    }
    
    daysList.innerHTML = '<p class="text-gray-500">Chargement...</p>';
    
    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days`);
        const days = data.days || [];
        
        if (days.length === 0) {
            daysList.innerHTML = '<p class="text-gray-500">Aucune étape pour ce voyage. Ajoutez-en une !</p>';
            updateCostCalculator(data.costs || {}, data.sale_prices || {});
            return;
        }
        
        daysList.innerHTML = '';
        
        for (const day of days) {
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
                    <button data-id="${day.id}" class="delete-day-btn text-red-500 hover:text-red-700 opacity-60 hover:opacity-100 transition-opacity" title="Supprimer l'étape">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            
            daysList.appendChild(dayEl);
        }
        
        updateCostCalculator(data.costs || {}, data.sale_prices || {});
        
        // Event listeners
        document.querySelectorAll('.edit-day-btn').forEach(btn => {
            btn.addEventListener('click', () => openEditDayModal(btn.dataset.id));
        });
        
        document.querySelectorAll('.delete-day-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (confirm('Supprimer cette étape ?')) {
                    try {
                        await fetchAPI(`/admin/api/trips/${currentTripId}/days/${btn.dataset.id}`, { method: 'DELETE' });
                        showToast('Étape supprimée', 'success');
                        await loadDaysForConstruction();
                    } catch (error) {
                        showToast(error.message, 'error');
                    }
                }
            });
        });
    } catch (error) {
        console.error('Erreur chargement étapes:', error);
        daysList.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

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

function backToGrid() {
    // Cache la section construction
    document.getElementById('trip-construction-section').classList.add('hidden');
    
    // Réaffiche la grille et les onglets
    document.getElementById('stats-cards').classList.remove('hidden');
    document.querySelector('.bg-white.rounded-lg.shadow-md.mb-6').classList.remove('hidden');
    document.getElementById('tab-trips-content').classList.remove('hidden');
    
    currentTripId = null;
    currentTripData = null;
}

// ============================================
// GESTION DEMANDES
// ============================================

async function loadRequests() {
    try {
        const data = await fetchAPI('/admin/api/trip-requests');
        if (data.success) {
            allRequests = data.requests;
            displayRequests();
        }
    } catch (error) {
        console.error('Erreur chargement demandes:', error);
        showToast('Erreur de chargement des demandes', 'error');
    }
}

function displayRequests() {
    const list = document.getElementById('requests-list');
    const noRequests = document.getElementById('no-requests-message');
    
    if (allRequests.length === 0) {
        list.innerHTML = '';
        noRequests.classList.remove('hidden');
        return;
    }
    
    noRequests.classList.add('hidden');
    list.innerHTML = allRequests.map(req => createRequestCard(req)).join('');
    
    // Event listeners
    document.querySelectorAll('.view-request-btn').forEach(btn => {
        btn.addEventListener('click', () => viewRequestDetails(btn.dataset.id));
    });
    
    document.querySelectorAll('.create-trip-from-request-btn').forEach(btn => {
        btn.addEventListener('click', () => createTripFromRequest(btn.dataset.id));
    });
    
    document.querySelectorAll('.mark-processing-btn').forEach(btn => {
        btn.addEventListener('click', () => updateRequestStatus(btn.dataset.id, 'processing'));
    });
}

function createRequestCard(request) {
    const statusIcon = getRequestStatusIcon(request.status);
    const statusText = getRequestStatusText(request.status);
    const customer = request.customerInfo || {};
    const details = request.tripDetails || {};
    
    const date = request.requestDate?.toDate ? 
        request.requestDate.toDate().toLocaleDateString('fr-FR') : 
        'Date inconnue';
    
    return `
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
            <div class="flex justify-between items-start mb-3">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        ${statusIcon}
                        <h4 class="font-semibold text-gray-900">${customer.name || 'Client inconnu'} - ${details.region || 'Région'} ${details.duration || '?'}j</h4>
                    </div>
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-calendar mr-1"></i>${date}
                        ${details.persons ? ` | <i class="fas fa-users mr-1"></i>${details.persons} pers` : ''}
                        ${details.kmPerDay ? ` | <i class="fas fa-road mr-1"></i>${details.kmPerDay} km/j` : ''}
                    </p>
                    ${request.source === 'public_form' ? '<p class="text-xs text-blue-600 mt-1"><i class="fas fa-globe mr-1"></i>Demande depuis le site web</p>' : ''}
                </div>
                <span class="text-xs px-2 py-1 rounded-full ${getRequestStatusClass(request.status)}">${statusText}</span>
            </div>
            
            <div class="flex gap-2">
                <button class="view-request-btn flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm font-medium"
                        data-id="${request.id}">
                    <i class="fas fa-eye mr-1"></i>Voir détails
                </button>
                ${request.status === 'new' ? `
                    <button class="create-trip-from-request-btn px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium whitespace-nowrap"
                            data-id="${request.id}">
                        <i class="fas fa-plus mr-1"></i>Créer voyage
                    </button>
                    <button class="mark-processing-btn px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                            data-id="${request.id}" title="Marquer en traitement">
                        <i class="fas fa-check"></i>
                    </button>
                ` : ''}
                ${request.status === 'completed' && request.linkedTripId ? `
                    <a href="/admin/dashboard?trip=${request.linkedTripId}" 
                       class="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 text-sm font-medium whitespace-nowrap">
                        <i class="fas fa-arrow-right mr-1"></i>Voir voyage
                    </a>
                ` : ''}
            </div>
        </div>
    `;
}

function getRequestStatusIcon(status) {
    const icons = {
        new: '<span class="text-2xl">🆕</span>',
        processing: '<span class="text-2xl">⏳</span>',
        completed: '<span class="text-2xl">✅</span>',
        rejected: '<span class="text-2xl">❌</span>'
    };
    return icons[status] || '';
}

function getRequestStatusText(status) {
    const texts = {
        new: 'Nouveau',
        processing: 'En cours',
        completed: 'Terminé',
        rejected: 'Refusé'
    };
    return texts[status] || status;
}

function getRequestStatusClass(status) {
    const classes = {
        new: 'bg-red-100 text-red-800',
        processing: 'bg-yellow-100 text-yellow-800',
        completed: 'bg-green-100 text-green-800',
        rejected: 'bg-gray-100 text-gray-800'
    };
    return classes[status] || '';
}

function viewRequestDetails(requestId) {
    const request = allRequests.find(r => r.id === requestId);
    if (!request) return;
    
    const customer = request.customerInfo || {};
    const details = request.tripDetails || {};
    
    const date = request.requestDate?.toDate ? 
        request.requestDate.toDate().toLocaleDateString('fr-FR') : 
        'Date inconnue';
    
    const content = `
        <div class="space-y-4">
            <div class="bg-blue-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-900 mb-2"><i class="fas fa-user mr-2"></i>Informations Client</h4>
                <div class="space-y-1 text-sm">
                    <p><strong>Nom:</strong> ${customer.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${customer.email || 'N/A'}</p>
                    <p><strong>Téléphone:</strong> ${customer.phone || 'N/A'}</p>
                </div>
            </div>
            
            <div class="bg-green-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-900 mb-2"><i class="fas fa-map mr-2"></i>Détails du Voyage Souhaité</h4>
                <div class="space-y-1 text-sm">
                    <p><strong>Région:</strong> ${details.region || 'N/A'}</p>
                    <p><strong>Durée:</strong> ${details.duration || '?'} jours</p>
                    <p><strong>Date départ:</strong> ${details.startDate || 'Flexible'}</p>
                    <p><strong>Personnes:</strong> ${details.persons || 'N/A'}</p>
                    <p><strong>KM/jour:</strong> ${details.kmPerDay || 'N/A'} km</p>
                </div>
            </div>
            
            ${details.comments ? `
                <div class="bg-gray-50 p-4 rounded-lg">
                    <h4 class="font-semibold text-gray-900 mb-2"><i class="fas fa-comment mr-2"></i>Commentaires</h4>
                    <p class="text-sm text-gray-700">${details.comments}</p>
                </div>
            ` : ''}
            
            <div class="border-t pt-4">
                <p class="text-xs text-gray-500">
                    <strong>Demandé le:</strong> ${date} | 
                    <strong>Source:</strong> ${request.source === 'public_form' ? 'Formulaire web' : 'Encodage manuel'}
                </p>
            </div>
            
            ${request.status === 'new' ? `
                <div class="flex gap-2">
                    <button onclick="createTripFromRequest('${request.id}')" 
                            class="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium">
                        <i class="fas fa-plus mr-2"></i>Créer le voyage
                    </button>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('request-details-content').innerHTML = content;
    toggleModal('request-details-modal', true);
}

async function createTripFromRequest(requestId) {
    if (!confirm('Créer un voyage depuis cette demande ?')) return;
    
    try {
        const data = await fetchAPI(`/admin/api/trip-requests/${requestId}/create-trip`, {
            method: 'POST'
        });
        
        if (data.success) {
            showToast('Voyage créé avec succès !', 'success');
            toggleModal('request-details-modal', false);
            await loadRequests();
            await loadDashboardData();
            
            // Redirige vers le voyage créé
            if (data.trip_id) {
                window.location.href = `/admin/dashboard?trip=${data.trip_id}`;
            }
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function updateRequestStatus(requestId, status) {
    try {
        const data = await fetchAPI(`/admin/api/trip-requests/${requestId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        if (data.success) {
            showToast('Statut mis à jour', 'success');
            await loadRequests();
            await loadDashboardData();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function openManualRequestModal() {
    toggleModal('manual-request-modal', true);
    document.getElementById('manual-request-form').reset();
}

async function handleManualRequestSubmit(e) {
    e.preventDefault();
    
    const requestData = {
        customerInfo: {
            name: document.getElementById('mr-customer-name').value.trim(),
            email: document.getElementById('mr-customer-email').value.trim(),
            phone: document.getElementById('mr-customer-phone').value.trim()
        },
        tripDetails: {
            duration: parseInt(document.getElementById('mr-duration').value),
            region: document.getElementById('mr-region').value.trim(),
            startDate: document.getElementById('mr-start-date').value,
            persons: parseInt(document.getElementById('mr-persons').value) || 1,
            kmPerDay: parseInt(document.getElementById('mr-km-per-day').value) || 0,
            comments: document.getElementById('mr-comments').value.trim()
        }
    };
    
    try {
        const data = await fetchAPI('/admin/api/trip-requests', {
            method: 'POST',
            body: JSON.stringify(requestData)
        });
        
        if (data.success) {
            showToast('Demande enregistrée avec succès !', 'success');
            toggleModal('manual-request-modal', false);
            switchTab('requests');
            await loadRequests();
            await loadDashboardData();
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// ============================================
// POLLING (NOTIFICATIONS)
// ============================================

function startPolling() {
    // Vérifie les nouvelles demandes toutes les 30 secondes
    setInterval(async () => {
        try {
            const data = await fetchAPI('/admin/api/trip-requests/new-count');
            if (data.success && data.count !== stats.newRequests) {
                const oldCount = stats.newRequests;
                stats.newRequests = data.count;
                updateStatsDisplay();
                
                // Si nouvelles demandes, affiche notification
                if (data.count > oldCount) {
                    showToast(`${data.count - oldCount} nouvelle(s) demande(s) de voyage !`, 'success');
                }
            }
        } catch (error) {
            console.error('Erreur polling:', error);
        }
    }, 30000);
}

// ============================================
// UTILITAIRES
// ============================================

function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
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
        throw new Error(data.message || data.error || 'Erreur API');
    }
    
    return data;
}
