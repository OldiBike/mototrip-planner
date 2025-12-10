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

let currentTripId = null;
let currentTripData = null;
let savePeriodTimeout = null;

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
    document.getElementById('tab-bookings-btn')?.addEventListener('click', () => {
        switchTab('bookings');
        loadBookings();
    });
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

    // Prix de vente par personne
    document.getElementById('sale-price-pp-input')?.addEventListener('input', handleSalePriceChange);

    // Période recommandée
    document.getElementById('recommended-start-input')?.addEventListener('change', handleRecommendedPeriodChange);
    document.getElementById('recommended-end-input')?.addEventListener('change', handleRecommendedPeriodChange);

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

    // Gestion publication
    document.getElementById('publish-trip-btn-construction')?.addEventListener('click', () => {
        if (currentTripId) {
            window.location.href = `/admin/trips/${currentTripId}/publish`;
        }
    });

    // Gestion dépublication (via Modale)
    document.getElementById('unpublish-trip-btn-construction')?.addEventListener('click', () => {
        if (!currentTripId) return;
        toggleModal('unpublish-modal', true);
    });

    document.getElementById('cancel-unpublish-btn')?.addEventListener('click', () => {
        toggleModal('unpublish-modal', false);
    });

    document.getElementById('confirm-unpublish-btn')?.addEventListener('click', () => {
        if (!currentTripId) return;

        console.log('DEBUG: Confirmed unpublish for', currentTripId);
        // Utilisation de DELETE pour correspondre à la route backend
        fetchAPI(`/admin/api/trips/${currentTripId}/unpublish`, { method: 'DELETE' })
            .then(data => {
                console.log('DEBUG: Unpublish response', data);
                if (data.success) {
                    showToast('Voyage dépublié', 'success');
                    toggleModal('unpublish-modal', false);
                    loadDashboardData();
                    backToGrid();
                }
            })
            .catch(err => {
                console.error('DEBUG: Unpublish error', err);

                // Si erreur 400 "déjà dépublié", on considère comme succès pour resynchroniser l'interface
                if (err.status === 400) {
                    showToast('Voyage déjà dépublié (sync)', 'info');
                    toggleModal('unpublish-modal', false);
                    loadDashboardData();
                    backToGrid();
                } else {
                    showToast('Erreur lors de la dépublication', 'error');
                }
            });
    });

    // Gestion des modales d'ajout d'étape
    document.getElementById('cancel-add-day-btn')?.addEventListener('click', () => {
        toggleModal('add-day-modal', false);
    });

    document.getElementById('add-day-form')?.addEventListener('submit', saveDayForm);

    // Gestion input GPX
    document.getElementById('day-gpx-upload')?.addEventListener('change', function (e) {
        if (e.target.files && e.target.files.length > 0) {
            document.getElementById('day-gpx-file').value = e.target.files[0].name;
        }
    });

    // Gestion Header Image (Publication)
    document.querySelectorAll('input[name="header-source"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const uploadSection = document.getElementById('header-upload-section');
            const librarySection = document.getElementById('header-library-section');
            if (e.target.value === 'upload') {
                uploadSection.classList.remove('hidden');
                librarySection.classList.add('hidden');
            } else {
                uploadSection.classList.add('hidden');
                librarySection.classList.remove('hidden');
                loadTripPhotosForHeaderSelection(); // Charge les photos
            }
        });
    });

    document.getElementById('publish-header-upload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                document.getElementById('header-upload-preview').src = e.target.result;
                document.getElementById('header-preview-container').classList.remove('hidden');
            }
            reader.readAsDataURL(file);
        }
    });

    // Gestion modale médias - Fermeture
    document.getElementById('close-media-manager-btn')?.addEventListener('click', () => {
        toggleModal('media-manager-modal', false);
    });

    // ⭐ NOUVEAU : Bouton de recherche d'hôtels à proximité (manuel - conservé)
    document.getElementById('search-nearby-hotels-btn')?.addEventListener('click', () => {
        console.log('🔍 Bouton Hôtels à proximité cliqué');
        const modal = document.getElementById('nearby-hotels-modal');
        const searchInput = document.getElementById('search-nearby-city-input');
        const searchResults = document.getElementById('search-results');
        const noResults = document.getElementById('no-results');
        const searchLoader = document.getElementById('search-loader');

        // Reset de la modale
        if (searchInput) searchInput.value = '';
        if (searchResults) searchResults.classList.add('hidden');
        if (noResults) noResults.classList.add('hidden');
        if (searchLoader) searchLoader.classList.add('hidden');

        if (modal) {
            modal.classList.remove('hidden');
            console.log('✅ Modale affichée');
        } else {
            console.error('❌ Modale nearby-hotels-modal introuvable');
        }
    });

    // Bouton de fermeture de la modale de recherche
    document.getElementById('close-nearby-hotels-btn')?.addEventListener('click', () => {
        console.log('🔴 Fermeture modale');
        toggleModal('nearby-hotels-modal', false);
    });

    // Bouton "Rechercher" dans la modale
    document.getElementById('perform-search-btn')?.addEventListener('click', performManualSearch);

    // Recherche au clavier (Enter)
    document.getElementById('search-nearby-city-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performManualSearch();
    });
}

// ============================================
// GESTION DES ÉTAPES - AJOUT/ÉDITION
// ============================================

// Variables Google Maps
let cityAutocomplete = null;
let hotelAutocomplete = null;

// Variables pour la recherche d'hôtels à proximité
let nearbyHotelsCache = null;
let lastSearchedCity = null;
let autocompleteJustUsed = false; // Flag pour détecter si autocomplete vient de s'exécuter

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

    // Reset GPX input
    const gpxUpload = document.getElementById('day-gpx-upload');
    if (gpxUpload) gpxUpload.value = '';

    title.textContent = 'Ajouter une nouvelle étape';
    // Réinitialise les POIs
    selectedPois = [];
    updateDayPoisList();

    // Reste du reset
    document.getElementById('save-day-btn').textContent = 'Enregistrer l\'étape';

    // ⭐ NOUVEAU : Reset et recharge les hôtels avec filtrage par partenaires du voyage
    if (window.hotelSelector) {
        window.hotelSelector.reset();

        // ⭐ PHASE 6+ : Filtre les hôtels selon les partenaires du voyage
        const partnerIds = currentTripData?.partnerIds || [];
        if (partnerIds.length > 0) {
            console.log(`🎯 Filtrage hôtels pour voyage avec ${partnerIds.length} partenaire(s)`);
            window.hotelSelector.reload(partnerIds);
        } else {
            console.log('ℹ️ Pas de filtre partenaire pour ce voyage');
            window.hotelSelector.reload();
        }
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

        // Charge les POIs
        selectedPois = day.pois || [];
        updateDayPoisList();

        // Pré-remplit le formulaire
        document.getElementById('editing-day-id').value = dayId;
        document.getElementById('day-name').value = day.dayName || '';
        document.getElementById('day-city').value = day.city || '';
        document.getElementById('day-hotel-name').value = day.hotelName || '';
        document.getElementById('day-price-double').value = day.priceDouble || 0;
        document.getElementById('day-price-solo').value = day.priceSolo || 0;
        document.getElementById('day-nights').value = day.nights || 1;
        document.getElementById('day-gpx-file').value = day.gpxFile || '';
        const gpxUpload = document.getElementById('day-gpx-upload');
        if (gpxUpload) gpxUpload.value = '';

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
            console.log('🔔 place_changed déclenché pour la ville');
            const place = cityAutocomplete.getPlace();
            console.log('📍 Place reçu:', place);

            if (!place.geometry) {
                console.warn('❌ Aucune suggestion sélectionnée pour la ville');
                return;
            }

            // Utilise formatted_address ou extrait le nom de la ville
            let cityName = place.formatted_address || place.name;

            // ============================================
            // GESTION DES RÉSERVATIONS
            // ============================================

            async function loadBookings() {
                const tableBody = document.getElementById('bookings-table-body');
                const loadingState = document.getElementById('bookings-loading');
                const emptyState = document.getElementById('no-bookings-state');
                const countBadge = document.getElementById('bookings-count');

                if (!tableBody) return;

                // Reset states
                tableBody.innerHTML = '';
                loadingState.classList.remove('hidden');
                emptyState.classList.add('hidden');

                try {
                    const response = await fetch('/admin/api/bookings');
                    const data = await response.json();

                    loadingState.classList.add('hidden');

                    if (data.success && data.bookings.length > 0) {
                        renderBookings(data.bookings);
                        if (countBadge) {
                            countBadge.textContent = data.bookings.length;
                            countBadge.classList.remove('hidden');
                        }
                    } else {
                        emptyState.classList.remove('hidden');
                        if (countBadge) countBadge.classList.add('hidden');
                    }
                } catch (error) {
                    console.error('Erreur chargement réservations:', error);
                    loadingState.innerHTML = `<p class="text-red-500">Erreur de chargement: ${error.message}</p>`;
                }
            }

            function renderBookings(bookings) {
                const tableBody = document.getElementById('bookings-table-body');
                if (!tableBody) return;

                // Trier par date de création décroissante (plus récent en premier)
                bookings.sort((a, b) => {
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });

                tableBody.innerHTML = bookings.map(booking => {
                    const date = booking.createdAt ? new Date(booking.createdAt).toLocaleDateString() : 'N/A';
                    // Utiliser safe_str ou verification de nullité
                    const customerName = booking.organizerUserId || 'Inconnu'; // Idéalement il faudrait fetch le user name
                    // Pour l'instant on affiche l'ID ou on fait un effort backend pour enrichir

                    const statusColors = {
                        'pending': 'bg-yellow-100 text-yellow-800',
                        'confirmed': 'bg-green-100 text-green-800',
                        'cancelled': 'bg-red-100 text-red-800'
                    };
                    const statusClass = statusColors[booking.status] || 'bg-gray-100 text-gray-800';

                    return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${booking.tripTemplateId || 'Voyage'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.organizerUserId ? booking.organizerUserId.substring(0, 8) + '...' : 'Client'}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${booking.totalParticipants || 1}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">${Math.round(booking.depositAmount || 0)}€</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${Math.round(booking.totalAmount || 0)}€</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClass}">
                        ${booking.status || 'pending'}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button class="text-indigo-600 hover:text-indigo-900" 
                        onclick="console.log('Détails booking ${booking.id}')">
                        Détails
                    </button>
                    <!-- <a href="/admin/bookings/${booking.id}" class="text-indigo-600 hover:text-indigo-900">Détails</a> -->
                </td>
            </tr>
        `;
                }).join('');
            }
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
                console.log('✅ Ville validée (autocomplétion):', cityName);
                console.log('⏰ Lancement de la recherche d\'hôtels dans 200ms...');

                // ⭐ NOUVEAU : Déclenche automatiquement la recherche d'hôtels à proximité
                // Petite temporisation pour laisser le temps au champ hôtel d'être rempli si extraction RateHawk
                setTimeout(() => {
                    console.log('🚀 Timeout écoulé, appel de autoCheckNearbyHotels');
                    autoCheckNearbyHotels(cityName);
                }, 200);
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

        // ⭐ AJOUT : Listener pour saisie manuelle (sans autocomplétion)
        cityInput.addEventListener('change', () => {
            console.log('🔔 Événement change détecté sur le champ ville');
            const manualCity = cityInput.value.trim();
            if (manualCity) {
                console.log('📝 Ville saisie manuellement:', manualCity);
                console.log('⏰ Lancement recherche dans 500ms...');
                setTimeout(() => {
                    console.log('🚀 Appel autoCheckNearbyHotels (saisie manuelle)');
                    autoCheckNearbyHotels(manualCity);
                }, 500);
            }
        });

    } catch (error) {
        console.error('❌ Erreur initialisation Google Maps:', error);
    }
}

/**
 * Charge les photos du voyage pour la sélection de l'image d'en-tête
 */
async function loadTripPhotosForHeaderSelection() {
    const grid = document.getElementById('publish-library-grid');
    grid.innerHTML = '<p class="col-span-3 text-center text-gray-500 py-4"><i class="fas fa-spinner fa-spin"></i> Chargement...</p>';

    if (!currentTripId) return;

    try {
        // Récupère les données complètes du voyage
        const trip = currentTripData; // Déjà chargé
        const photos = [];

        // 1. Photos du voyage (globales)
        if (trip.photos && Array.isArray(trip.photos)) {
            trip.photos.forEach(p => photos.push({ url: p, type: 'Voyage' }));
        }

        // 2. Photos des jours (Hôtels)
        if (trip.days && Array.isArray(trip.days)) {
            for (const day of trip.days) {
                // Fetch photos via API for each day if needed, OR use what's in day data
                // Usually day object is light. We might need to fetch detailed day info or media endpoint.
                // For now let's use a dedicated endpoint to get ALL media for a trip
            }
        }

        // BETTER: Use existing endpoint to fetch all media
        const mediaData = await fetchAPI(`/admin/api/trips/${currentTripId}/media/all`);
        // Assuming this endpoint exists or create one. 
        // If not, let's iterate available data for now to be safe.

        // Simpler approach: Use specific endpoints we built for media manager?
        // Let's implement a manual aggregation from current loaded data for speed, or fetch days details.

        // Aggregation locale rapide
        const allMedia = new Set();

        // A. Trip Cover
        if (trip.coverImage) allMedia.add(trip.coverImage);

        // B. Trip Photos
        if (trip.photos) trip.photos.forEach(p => allMedia.add(p));

        // C. Fetch Days for Hotel Photos
        const daysData = await fetchAPI(`/admin/api/trips/${currentTripId}/days`);
        if (daysData.days) {
            daysData.days.forEach(day => {
                if (day.hotelPhotos && Array.isArray(day.hotelPhotos)) {
                    day.hotelPhotos.forEach(p => allMedia.add(p));
                }
            });
        }

        // Render
        grid.innerHTML = '';
        if (allMedia.size === 0) {
            grid.innerHTML = '<p class="col-span-3 text-center text-gray-500 py-4">Aucune photo disponible.</p>';
            return;
        }

        allMedia.forEach(url => {
            const div = document.createElement('div');
            div.className = 'relative aspect-video group cursor-pointer border-2 border-transparent hover:border-indigo-500 rounded overflow-hidden';
            div.innerHTML = `
                <img src="${url}" class="w-full h-full object-cover">
                <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition"></div>
                <div class="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 hidden check-icon">
                    <i class="fas fa-check text-xs"></i>
                </div>
            `;
            div.onclick = () => {
                // Deselect others
                grid.querySelectorAll('.check-icon').forEach(el => el.classList.add('hidden'));
                grid.querySelectorAll('.border-indigo-500').forEach(el => el.classList.remove('border-indigo-500'));

                // Select this
                div.classList.add('border-indigo-500');
                div.querySelector('.check-icon').classList.remove('hidden');

                document.getElementById('publish-header-selected-url').value = url;
            };
            grid.appendChild(div);
        });

    } catch (error) {
        console.error("Erreur chargement photos header:", error);
        grid.innerHTML = '<p class="col-span-3 text-center text-red-500 py-4">Erreur de chargement.</p>';
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

                            // ⭐ NOUVEAU : Déclenche la recherche d'hôtels après validation RateHawk
                            console.log('🔗 URL RateHawk : Lancement recherche après validation de la ville');
                            setTimeout(() => {
                                autoCheckNearbyHotels(cityName);
                            }, 500);
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

    console.log("💾 Tentative de sauvegarde de l'étape...");

    const editingId = document.getElementById('editing-day-id').value;
    const isEditing = !!editingId;

    if (!currentTripId) {
        showToast("Erreur interne : ID du voyage manquant", 'error');
        return;
    }

    // ⭐ NOUVEAU : Récupère l'ID de l'hôtel sélectionné depuis la banque
    const selectedHotelId = window.hotelSelector ? window.hotelSelector.getSelectedHotelId() : null;

    // Récupère le fichier GPX
    const gpxUploadInput = document.getElementById('day-gpx-upload');
    const gpxFile = gpxUploadInput && gpxUploadInput.files.length > 0 ? gpxUploadInput.files[0] : null;

    if (gpxFile) {
        console.log(`📂 Fichier GPX détecté: ${gpxFile.name} (${gpxFile.size} bytes)`);
    } else {
        console.log("📂 Aucun fichier GPX à uploader");
    }

    const dayData = {
        dayName: document.getElementById('day-name').value.trim(),
        city: document.getElementById('day-city').value.trim(),
        hotelName: document.getElementById('day-hotel-name').value.trim(),
        priceDouble: parseFloat(document.getElementById('day-price-double').value) || 0,
        priceSolo: parseFloat(document.getElementById('day-price-solo').value) || 0,
        nights: parseInt(document.getElementById('day-nights').value) || 1,
        // Envoie la valeur existante (texte) si pas de nouveau fichier, sinon le nom du nouveau fichier sera mis à jour après upload
        // ⭐ Ajout des POIs
        pois: selectedPois,

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

        // 1. Sauvegarde les données de l'étape
        console.log(`📤 Envoi des données de l'étape... (Mode: ${isEditing ? 'Édition' : 'Création'})`);

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

        console.log('✅ Données étape sauvegardées:', data);

        if (data.success) {
            // 2. Upload le fichier GPX si présent
            if (gpxFile && dayId) {
                console.log(`🚀 Démarrage upload GPX pour dayId: ${dayId}`);
                showToast('Upload du fichier GPX en cours...', 'info');
                try {
                    await uploadDayGpx(currentTripId, dayId, gpxFile);
                    console.log('✅ Upload GPX terminé avec succès');
                } catch (uploadError) {
                    console.error('❌ Erreur critique upload GPX:', uploadError);
                    showToast('Erreur upload GPX: ' + uploadError.message, 'error');
                }
            } else {
                console.log('ℹ️ Pas d\'upload GPX requis');
            }

            toggleModal('add-day-modal', false);
            selectedPois = []; // Reset POIs after successful save

            // Si checkbox cochée et qu'on a un hôtel, tente de télécharger les photos Google
            if (shouldAutoFetch && dayId && dayData.hotelName && !isEditing) {
                await fetchGooglePhotosForHotel(dayId, dayData.hotelName, placeId);
            }

            await loadDaysForConstruction();
            await loadDashboardData(); // Recharge pour mettre à jour les stats
        }
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde:', error);
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
    console.log('🚀 openMediaManager appelée');

    if (!currentTripId || !currentTripData) {
        showToast('Sélectionnez un voyage d\'abord', 'error');
        return;
    }

    document.getElementById('media-trip-name').textContent = currentTripData.name || 'Voyage';
    toggleModal('media-manager-modal', true);

    // ATTENDRE que la modale soit visible avant de configurer les listeners
    setTimeout(() => {
        console.log('⏰ Configuration des listeners après timeout');

        // Configure les event listeners pour les onglets
        const tabColsBtn = document.getElementById('tab-cols-btn');
        const tabRoutesBtn = document.getElementById('tab-routes-btn');

        console.log('🔧 Configuration onglets Media:', {
            tabColsBtn: !!tabColsBtn,
            tabRoutesBtn: !!tabRoutesBtn
        });

        if (tabColsBtn) {
            tabColsBtn.addEventListener('click', (e) => {
                console.log('👆 Clic sur Cols');
                e.preventDefault();
                e.stopPropagation();
                switchMediaTab('cols');
            });
            console.log('✅ Listener Cols attaché');
        }
        if (tabRoutesBtn) {
            tabRoutesBtn.addEventListener('click', (e) => {
                console.log('👆 Clic sur Routes');
                e.preventDefault();
                e.stopPropagation();
                switchMediaTab('routes');
            });
            console.log('✅ Listener Routes attaché');
        }

        // Configure les boutons d'upload pour Cols
        const uploadGeneralBtn = document.getElementById('upload-general-btn');
        const browseLibraryBtn = document.getElementById('browse-library-btn');

        if (uploadGeneralBtn) {
            uploadGeneralBtn.onclick = () => document.getElementById('upload-general-input')?.click();
        }
        if (browseLibraryBtn) {
            browseLibraryBtn.onclick = () => showToast('Fonctionnalité de bibliothèque complète en développement', 'info');
        }

        // Configure les boutons d'upload pour Routes
        const uploadRoutesBtn = document.getElementById('upload-routes-btn');
        const browseRoutesLibraryBtn = document.getElementById('browse-routes-library-btn');

        if (uploadRoutesBtn) {
            uploadRoutesBtn.onclick = () => document.getElementById('upload-routes-input')?.click();
        }
        if (browseRoutesLibraryBtn) {
            browseRoutesLibraryBtn.onclick = () => showToast('Fonctionnalité de bibliothèque complète en développement', 'info');
        }

        // Configure les champs de recherche
        const searchCityInput = document.getElementById('search-city-input');
        const searchRoutesInput = document.getElementById('search-routes-input');

        if (searchCityInput) {
            searchCityInput.oninput = (e) => {
                const searchTerm = e.target.value.toLowerCase();
                filterGeneralPhotos(searchTerm);
            };
        }

        if (searchRoutesInput) {
            searchRoutesInput.oninput = (e) => {
                const searchTerm = e.target.value.toLowerCase();
                filterRoutesPhotos(searchTerm);
            };
        }

        // Charge l'onglet Cols par défaut
        switchMediaTab('cols');
    }, 100); // Attendre 100ms que la modale soit affichée
}

function switchMediaTab(tabName) {
    console.log('🔄 switchMediaTab appelé avec:', tabName);

    const tabColsBtn = document.getElementById('tab-cols-btn');
    const tabRoutesBtn = document.getElementById('tab-routes-btn');
    const tabColsContent = document.getElementById('tab-cols-content');
    const tabRoutesContent = document.getElementById('tab-routes-content');

    console.log('📋 Éléments trouvés:', {
        buttons: { cols: !!tabColsBtn, routes: !!tabRoutesBtn },
        contents: { cols: !!tabColsContent, routes: !!tabRoutesContent }
    });

    // Reset tous les onglets
    tabColsBtn?.classList.remove('border-blue-600', 'border-green-600', 'text-gray-900');
    tabColsBtn?.classList.add('border-transparent', 'text-gray-600');
    tabRoutesBtn?.classList.remove('border-blue-600', 'border-green-600', 'text-gray-900');
    tabRoutesBtn?.classList.add('border-transparent', 'text-gray-600');

    // Cache tous les contenus
    tabColsContent?.classList.add('hidden');
    tabRoutesContent?.classList.add('hidden');

    // Active l'onglet sélectionné
    if (tabName === 'cols') {
        tabColsBtn?.classList.add('border-blue-600', 'text-gray-900');
        tabColsBtn?.classList.remove('border-transparent', 'text-gray-600');
        tabColsContent?.classList.remove('hidden');
        loadGeneralPhotos(); // Les cols utilisent loadGeneralPhotos
    } else if (tabName === 'routes') {
        tabRoutesBtn?.classList.add('border-green-600', 'text-gray-900');
        tabRoutesBtn?.classList.remove('border-transparent', 'text-gray-600');
        tabRoutesContent?.classList.remove('hidden');
        loadRoutesPhotos(); // Nouvelle fonction pour les routes
    }
}

async function loadRoutesPhotos(filterTag = null) {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
        showToast('Firebase non disponible', 'error');
        return;
    }

    const gridContainer = document.getElementById('routes-photos-grid');
    const noPhotosMessage = document.getElementById('no-routes-photos');

    if (!gridContainer) return;

    gridContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Chargement...</p>';

    try {
        const db = firebase.firestore();

        let mediaQuery = db.collection(`artifacts/${APP_ID}/users/${USER_ID}/media`)
            .where('type', '==', 'route')
            .where('assignedTrips', 'array-contains', currentTripId);

        const snapshot = await mediaQuery.get();

        if (snapshot.empty) {
            gridContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }

        noPhotosMessage?.classList.add('hidden');
        gridContainer.innerHTML = '';
        let allRoutesPhotos = [];

        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            if (filterTag && !photo.tags?.includes(filterTag)) {
                return;
            }
            allRoutesPhotos.push(photo);
        });

        if (allRoutesPhotos.length === 0) {
            gridContainer.innerHTML = '';
            noPhotosMessage?.classList.remove('hidden');
            return;
        }

        allRoutesPhotos.sort((a, b) => {
            const dateA = a.uploadedAt?.toMillis() || 0;
            const dateB = b.uploadedAt?.toMillis() || 0;
            return dateB - dateA;
        });

        allRoutesPhotos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'relative group bg-gray-100 rounded-lg overflow-hidden aspect-square';
            photoCard.innerHTML = `
                <img src="${photo.downloadURL}" 
                     alt="${photo.fileName}" 
                     class="w-full h-full object-cover">
                
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <div class="flex flex-wrap gap-1">
                        ${(photo.tags || []).map(tag => `
                            <span class="text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">
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
                deletePhoto(btn.dataset.id, btn.dataset.path, 'routes');
            });
        });

    } catch (error) {
        console.error('Erreur chargement photos routes:', error);
        gridContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Erreur de chargement</p>';
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


function filterRoutesPhotos(searchTerm) {
    const gridContainer = document.getElementById('routes-photos-grid');
    const noPhotosMessage = document.getElementById('no-routes-photos');

    if (!gridContainer) return;

    if (!searchTerm || searchTerm.trim() === '') {
        loadRoutesPhotos();
        return;
    }

    // On recharge pour filtrer - alternative: garder allRoutesPhotos en mémoire
    loadRoutesPhotos();
}

function filterGeneralPhotos(searchTerm) {
    if (!allGeneralPhotos || allGeneralPhotos.length === 0) return;

    const gridContainer = document.getElementById('general-photos-grid');
    const noPhotosMessage = document.getElementById('no-general-photos');

    if (!gridContainer) return;

    if (!searchTerm || searchTerm.trim() === '') {
        // Réaffiche toutes les photos
        loadGeneralPhotos();
        return;
    }

    // Filtre les photos par tags
    const filtered = allGeneralPhotos.filter(photo => {
        const tags = photo.tags || [];
        return tags.some(tag => tag.toLowerCase().includes(searchTerm));
    });

    if (filtered.length === 0) {
        gridContainer.innerHTML = '';
        noPhotosMessage?.classList.remove('hidden');
        return;
    }

    noPhotosMessage?.classList.add('hidden');
    gridContainer.innerHTML = '';

    filtered.forEach(photo => {
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

    // Hide all content
    document.getElementById('tab-trips-content').classList.add('hidden');
    document.getElementById('tab-requests-content').classList.add('hidden');
    const bookingsContent = document.getElementById('tab-bookings-content');
    if (bookingsContent) bookingsContent.classList.add('hidden');

    if (tab === 'trips') {
        const btn = document.getElementById('tab-trips-btn');
        if (btn) btn.classList.add('active', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-trips-content').classList.remove('hidden');
    } else if (tab === 'requests') {
        const btn = document.getElementById('tab-requests-btn');
        if (btn) btn.classList.add('active', 'border-blue-600', 'text-blue-600');
        document.getElementById('tab-requests-content').classList.remove('hidden');
        loadRequests();
    } else if (tab === 'bookings') {
        const btn = document.getElementById('tab-bookings-btn');
        if (btn) btn.classList.add('active', 'border-blue-600', 'text-blue-600');
        if (bookingsContent) bookingsContent.classList.remove('hidden');
        // loadBookings is called by the click listener, but safe to call here if needed, 
        // though the listener already does it.
    }
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadDashboardData() {
    try {
        console.log('🚀 Chargement du dashboard...');

        // Load stats
        try {
            const statsData = await fetchAPI('/admin/api/dashboard/stats');
            if (statsData.success) {
                stats = statsData.stats;
                updateStatsDisplay();
            }
        } catch (e) {
            console.error("Erreur chargement stats:", e);
        }

        // Load trips
        const tripsData = await fetchAPI('/admin/api/trips');
        if (tripsData.success && Array.isArray(tripsData.trips)) {
            allTrips = tripsData.trips;

            // Enrich trips with status and days count safely
            for (let trip of allTrips) {
                try {
                    const daysData = await fetchAPI(`/admin/api/trips/${trip.id}/days`);
                    trip.daysCount = daysData.days ? daysData.days.length : 0;
                    trip.status = getStatusTrip(trip);
                } catch (e) {
                    console.warn(`Impossible de charger les détails pour le voyage ${trip.id}`, e);
                    trip.daysCount = 0;
                    trip.status = 'draft'; // Default fallback
                }
            }
            filterTrips();
        } else {
            console.error('Format de réponse invalide pour les voyages:', tripsData);
            showToast('Erreur format données voyages', 'error');
        }
    } catch (error) {
        console.error('Erreur chargement dashboard:', error);
        showToast('Erreur de chargement du dashboard', 'error');
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
            // Check if click was on a button or link (already handled by stopPropagation usually but safety check)
            if (!e.target.closest('button') && !e.target.closest('a')) {
                const tripId = card.dataset.id;
                // Redirect to Builder
                window.location.href = `/admin/trips/${tripId}/builder`;
            }
        });
    });

    document.querySelectorAll('.edit-trip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openTripDetails(btn.dataset.id);
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
    const statusBadge = getStatusBadge(trip);
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
                    <button onclick="window.location.href='/admin/trips/${trip.id}/builder'" class="text-blue-600 hover:text-blue-800 font-medium text-sm flex items-center">
                        <i class="fas fa-edit mr-1"></i>Modifier
                    </button>
                    <button onclick="deleteTrip('${trip.id}', '${trip.name}')" class="text-red-500 hover:text-red-700 p-1">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function getStatusBadge(trip) {
    const status = trip.status;
    const badges = {
        requested: '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">🟡 Demandé</span>',
        draft: '<span class="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-full">🔵 Construction</span>',
        published: `<a href="/voyages/${trip.publishedSlug}" target="_blank" onclick="event.stopPropagation()" class="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full hover:bg-green-200 transition-colors" title="Voir le voyage publié">🟢 Publié <i class="fas fa-external-link-alt ml-1 text-[10px]"></i></a>`
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
    loadPartnersForTripModal();
}

async function loadPartnersForTripModal() {
    const container = document.getElementById('quick-trip-partners');
    if (!container) return;

    try {
        const response = await fetch('/admin/api/partners?active_only=false');
        const data = await response.json();

        if (data.success && data.partners && data.partners.length > 0) {
            container.innerHTML = data.partners.map(partner => `
                <label class="flex items-center gap-2 cursor-pointer p-2 hover:bg-gray-100 rounded">
                    <input type="checkbox" name="trip-partners" value="${partner.id}" class="rounded">
                    <span class="inline-flex items-center px-2 py-1 rounded" style="background: ${partner.color}20; color: ${partner.color};">
                        ${partner.badgeIcon || '🤝'} ${partner.name}
                    </span>
                </label>
            `).join('');
        } else {
            container.innerHTML = '<p class="text-sm text-gray-500">Aucun partenaire disponible</p>';
        }
    } catch (error) {
        console.error('Erreur chargement partenaires:', error);
        container.innerHTML = '<p class="text-sm text-red-500">Erreur de chargement</p>';
    }
}

async function handleQuickAddTrip(e) {
    e.preventDefault();
    const name = document.getElementById('quick-trip-name').value.trim();

    if (!name) return;

    const selectedPartners = Array.from(document.querySelectorAll('input[name="trip-partners"]:checked')).map(cb => cb.value);

    try {
        const tripData = {
            name,
            partnerIds: selectedPartners,
            filterMode: 'preferred'
        };

        const data = await fetchAPI('/admin/api/trips', {
            method: 'POST',
            body: JSON.stringify(tripData)
        });

        if (data.success) {
            showToast('Voyage créé avec succès !', 'success');
            toggleModal('quick-add-trip-modal', false);
            await loadDashboardData();
            window.location.href = `/admin/trips/${data.trip_id}/builder`;
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


// openTripDetails removed - Redirection handled by href in template or onclick above
// initializeTripMap removed - Moved to trip_builder.js

async function loadTripDataForConstruction(tripId) {
    try {
        // Charge le voyage
        const tripData = await fetchAPI(`/admin/api/trips/${tripId}`);
        if (tripData.success) {
            currentTripData = tripData.trip;
            const salePricePP = currentTripData.salePricePerPerson || 0;
            document.getElementById('sale-price-pp-input').value = salePricePP > 0 ? salePricePP : '';

            // Période recommandée
            document.getElementById('recommended-start-input').value = currentTripData.recommendedRequestStart || '';
            document.getElementById('recommended-end-input').value = currentTripData.recommendedRequestEnd || '';

            // Toggle Publish/Unpublish buttons & URL Display
            const publishBtn = document.getElementById('publish-trip-btn-construction');
            const unpublishBtn = document.getElementById('unpublish-trip-btn-construction');
            const editPublishBtn = document.getElementById('edit-publication-btn-construction');
            const urlContainer = document.getElementById('published-trip-url-container');
            const urlLink = document.getElementById('published-trip-link');

            if (currentTripData.isPublished) {
                publishBtn?.classList.add('hidden');
                unpublishBtn?.classList.remove('hidden');
                editPublishBtn?.classList.remove('hidden');

                // Affiche l'URL
                if (urlContainer && urlLink) {
                    const slug = currentTripData.publishedSlug || currentTripData.slug || currentTripData.id;
                    if (slug) {
                        const publicUrl = `${window.location.origin}/voyages/${slug}`;
                        urlLink.href = publicUrl;
                        urlLink.textContent = publicUrl;
                        urlContainer.classList.remove('hidden');
                    } else {
                        urlContainer.classList.add('hidden');
                    }
                }
            } else {
                publishBtn?.classList.remove('hidden');
                unpublishBtn?.classList.add('hidden');
                editPublishBtn?.classList.add('hidden');
                urlContainer?.classList.add('hidden');
            }
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
            // Charge les restaurants pour cette étape
            let restaurantsHtml = '';
            let dayRestaurants = [];
            try {
                const restaurantsData = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${day.id}/restaurant-suggestions`);
                if (restaurantsData.success && restaurantsData.suggestions && restaurantsData.suggestions.length > 0) {
                    dayRestaurants = restaurantsData.suggestions;
                    const restaurantBadges = restaurantsData.suggestions.map(sugg => `
                        <span class="inline-flex items-center bg-orange-50 text-orange-700 px-2 py-0.5 rounded text-xs mr-1">
                            🍴 ${sugg.restaurant?.name || 'Restaurant'}
                            <button class="ml-1 text-orange-500 hover:text-orange-700" 
                                    data-day-id="${day.id}" 
                                    data-suggestion-id="${sugg.id}"
                                    onclick="removeRestaurantSuggestion('${day.id}', '${sugg.id}')"
                                    title="Retirer">×</button>
                        </span>
                    `).join('');
                    restaurantsHtml = `<p class="text-gray-600 text-sm mt-1">${restaurantBadges}</p>`;
                }
            } catch (error) {
                console.error('Erreur chargement restaurants pour le jour:', error);
            }

            // ⭐ Génération HTML des POIs
            const poisHtml = (day.pois || []).map(poi => {
                const ICONS = { 'monument': '🏰', 'nature': '🌲', 'museum': '🎨', 'activity': '⚡', 'viewpoint': '🔭', 'pass': '⛰️', 'lake': '💧', 'route': '🛣️', 'other': '📍' };
                // Fallback safe pour l'icône
                const cat = poi.category || 'other';
                const icon = ICONS[cat] || '📍';
                return `<span class="inline-flex items-center bg-purple-50 text-purple-700 px-2 py-0.5 rounded text-xs mr-1" title="${cat}">
                    ${icon} ${poi.name}
                </span>`;
            }).join('');
            const poisSection = poisHtml ? `<p class="text-gray-600 text-sm mt-1">${poisHtml}</p>` : '';

            const dayEl = document.createElement('div'); // Declare dayEl here
            dayEl.className = 'bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-all shadow-sm group mb-4';

            // Safe extracting of stats
            const distance = parseFloat(day.distance || 0).toFixed(1);
            // Elevation removed as per user request
            const startCity = day.startCity || 'Départ';
            const endCity = day.endCity || 'Arrivée';
            const priceDouble = parseFloat(day.priceDouble || 0).toFixed(2);
            const priceSolo = parseFloat(day.priceSolo || 0).toFixed(2);

            dayEl.innerHTML = `
                <!-- Header: Route & Stats -->
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                    <div class="flex items-center flex-wrap gap-2">
                        <span class="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm shadow-blue-200">
                            ${day.dayName}
                        </span>
                        
                        <div class="hidden md:flex items-center text-gray-400 mx-1">
                            <i class="fas fa-chevron-right text-xs"></i>
                        </div>

                        <h4 class="text-gray-800 font-medium text-lg flex items-center">
                            <span class="font-bold text-gray-900">${startCity}</span>
                            <i class="fas fa-long-arrow-alt-right mx-2 text-blue-400"></i>
                            <span class="font-bold text-gray-900">${endCity}</span>
                        </h4>
                    </div>

                    <!-- Badge Stats -->
                    <div class="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                        <div class="flex items-center text-gray-600" title="Distance">
                            <i class="fas fa-road text-blue-500 mr-1.5 text-sm"></i>
                            <span class="font-bold text-gray-900">${distance}</span> <span class="text-xs ml-0.5">km</span>
                        </div>
                    </div>
                </div>

                <!-- Main Grid Info -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    
                    <!-- Hotel Details -->
                    <div class="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50">
                        <div class="flex justify-between items-start mb-1">
                            <div class="text-xs font-bold text-blue-400 uppercase tracking-wide">Hébergement</div>
                            ${day.nights > 1 ? `<span class="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold shadow-sm"><i class="fas fa-moon mr-1"></i>${day.nights} nuits</span>` : ''}
                        </div>
                        
                        <div class="flex items-center mb-2">
                             <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center text-blue-500 shadow-sm mr-3 shrink-0">
                                <i class="fas fa-bed text-sm"></i>
                             </div>
                             <div class="overflow-hidden">
                                <div class="font-bold text-gray-800 truncate" title="${day.hotelName}">
                                    ${day.hotelName}
                                </div>
                                ${day.hotelLink ? `<a href="${day.hotelLink}" target="_blank" class="text-xs text-blue-500 hover:text-blue-700 hover:underline flex items-center"><i class="fas fa-external-link-alt mr-1"></i> Voir le site</a>` : '<span class="text-xs text-gray-400">Pas de lien</span>'}
                             </div>
                        </div>

                        <div class="flex items-center gap-4 text-sm pl-11">
                            <div class="flex flex-col">
                                <span class="text-xs text-gray-400">Double / pers</span>
                                <span class="font-bold text-gray-700">${priceDouble}€</span>
                            </div>
                            <div class="w-px h-6 bg-blue-200/50"></div>
                            <div class="flex flex-col">
                                <span class="text-xs text-gray-400">Solo</span>
                                <span class="font-bold text-gray-700">${priceSolo}€</span>
                            </div>
                        </div>
                    </div>

                    <!-- POIs & Restaurants -->
                    <div class="bg-gray-50/80 rounded-lg p-3 border border-gray-100">
                        <div class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">À voir & À Manger</div>
                        
                        <div class="space-y-2">
                            <!-- POIs -->
                            <div class="flex flex-wrap gap-1.5">
                                ${poisHtml || '<span class="text-gray-400 text-xs italic py-0.5">Aucun point d\'intérêt</span>'}
                            </div>
                            
                            <!-- Restaurants -->
                            ${restaurantsHtml ? '<div class="h-px bg-gray-200 w-full my-1"></div>' : ''}
                            <div class="flex flex-wrap gap-1.5">
                                ${restaurantsHtml}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Footer Actions -->
                <div class="flex flex-col sm:flex-row justify-between items-center pt-3 border-t border-gray-100 gap-3">
                    <div class="flex items-center text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded max-w-full overflow-hidden">
                        <i class="fas fa-file-code mr-2 text-gray-300"></i>
                        <span class="truncate">${day.gpxFile || 'Aucun fichier GPX'}</span>
                    </div>

                    <div class="flex items-center gap-1">
                         ${day.hotel && day.hotel.photos && day.hotel.photos.length > 0 ? `
                        <button 
                            data-hotel='${JSON.stringify(day.hotel).replace(/'/g, "&#39;")}' 
                            data-pois='${JSON.stringify(day.pois || []).replace(/'/g, "&#39;")}'
                            data-restaurants='${JSON.stringify(dayRestaurants).replace(/'/g, "&#39;")}'
                            class="view-hotel-photos-btn w-8 h-8 rounded-full hover:bg-purple-50 text-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center" 
                            title="Voir la galerie photos">
                            <i class="fas fa-images"></i>
                        </button>
                        ` : ''}
                        
                        <div class="w-px h-4 bg-gray-200 mx-1"></div>

                        <button data-id="${day.id}" class="add-restaurant-btn w-8 h-8 rounded-full hover:bg-orange-50 text-orange-400 hover:text-orange-600 transition-colors flex items-center justify-center" title="Suggérer un restaurant">
                            <i class="fas fa-utensils"></i>
                        </button>
                        <button data-id="${day.id}" class="edit-day-btn w-8 h-8 rounded-full hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center" title="Modifier l'étape">
                            <i class="fas fa-pen"></i>
                        </button>
                        <button data-id="${day.id}" class="delete-day-btn w-8 h-8 rounded-full hover:bg-red-50 text-red-300 hover:text-red-500 transition-colors flex items-center justify-center" title="Supprimer l'étape">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
            `;

            daysList.appendChild(dayEl);
        }

        updateCostCalculator(data.costs || {}, data.sale_prices || {});

        // Event listeners
        document.querySelectorAll('.view-hotel-photos-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                showDayGalleryModal(btn);
            });
        });

        document.querySelectorAll('.add-restaurant-btn').forEach(btn => {
            btn.addEventListener('click', () => openRestaurantSelectorModal(btn.dataset.id));
        });

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
        // Initialise la carte globale avec les GPX des étapes
        // if (typeof initializeTripMap === 'function') {
        //     // Petite pause pour s'assurer que le DOM est prêt et visible
        //     setTimeout(() => {
        //         initializeTripMap(days).catch(err => console.error("Erreur init map:", err));
        //     }, 100);
        // }

    } catch (error) {
        console.error('Erreur chargement étapes:', error);
        daysList.innerHTML = '<p class="text-red-500">Erreur de chargement</p>';
    }
}

function updateCostCalculator(costs, salePrices) {
    const safelySetText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    safelySetText('total-double', (costs.total_double || 0).toFixed(2) + '€');
    safelySetText('total-double-pp', (costs.cost_double_per_person || 0).toFixed(2) + '€');
    safelySetText('total-solo', (costs.total_solo || 0).toFixed(2) + '€');
    safelySetText('sale-double', (salePrices.sale_double || 0).toFixed(2) + '€');
    safelySetText('sale-double-pp', (salePrices.sale_price_per_person || 0).toFixed(2) + '€');
    safelySetText('sale-solo', (salePrices.sale_solo || 0).toFixed(2) + '€');
    safelySetText('margin-per-person', (salePrices.margin_per_person || 0).toFixed(2) + '€');
    safelySetText('margin-percent', '(' + (salePrices.margin_percent || 0).toFixed(1) + '%)');
}

// ============================================
// GESTION DU PRIX DE VENTE
// ============================================

let saveSalePriceTimeout = null;

/**
 * Gère le changement du prix de vente par personne avec debouncing
 */
async function handleSalePriceChange() {
    const salePricePP = parseFloat(document.getElementById('sale-price-pp-input').value) || 0;

    // Debouncing : attend 1 seconde après la dernière frappe
    if (saveSalePriceTimeout) clearTimeout(saveSalePriceTimeout);

    saveSalePriceTimeout = setTimeout(async () => {
        if (currentTripId) {
            try {
                await fetchAPI(`/admin/api/trips/${currentTripId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ salePricePerPerson: salePricePP })
                });
                // Recharge les étapes pour mettre à jour les calculs
                await loadDaysForConstruction();
            } catch (error) {
                console.error('Erreur sauvegarde prix:', error);
            }
        }
    }, 1000);
}

async function handleRecommendedPeriodChange() {
    const start = document.getElementById('recommended-start-input').value;
    const end = document.getElementById('recommended-end-input').value;

    if (savePeriodTimeout) clearTimeout(savePeriodTimeout);

    savePeriodTimeout = setTimeout(async () => {
        if (currentTripId) {
            try {
                await fetchAPI(`/admin/api/trips/${currentTripId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        recommendedRequestStart: start,
                        recommendedRequestEnd: end
                    })
                });
                showToast('Période recommandée enregistrée', 'success');
            } catch (error) {
                console.error('Erreur sauvegarde période:', error);
                showToast('Erreur sauvegarde période', 'error');
            }
        }
    }, 1000);
}

/**
 * Variables globales pour la galerie photos
 */
let galleryData = { hotel: [], poi: [], restaurant: [], media: [] };
let currentGalleryTab = 'hotel';
let currentGalleryIndex = 0;
let allTripMedia = []; // Cache pour les médias globaux du voyage

/**
 * Affiche la galerie photo de l'étape (Hôtel + POIs + Restaurants + Media)
 */
async function showDayGalleryModal(btn) {
    // 1. Récupération des données
    const hotel = JSON.parse(btn.dataset.hotel.replace(/&#39;/g, "'") || '{}');
    const pois = JSON.parse(btn.dataset.pois.replace(/&#39;/g, "'") || '[]');
    const restaurants = JSON.parse(btn.dataset.restaurants.replace(/&#39;/g, "'") || '[]');

    // 2. Préparation des photos
    galleryData = {
        hotel: (hotel.photos || []).map(url => ({ url, title: hotel.name, caption: 'Hôtel' })),
        poi: [],
        restaurant: [],
        media: []
    };

    // Flatten POI photos
    pois.forEach(p => {
        if (p.photos && p.photos.length > 0) {
            p.photos.forEach(url => {
                galleryData.poi.push({ url, title: p.name, caption: p.category || 'POI' });
            });
        }
    });

    // Flatten Restaurant photos
    restaurants.forEach(r => {
        // La structure peut être direct ou via suggestion
        const rest = r.restaurant || r;
        if (rest.photos && rest.photos.length > 0) {
            rest.photos.forEach(url => {
                galleryData.restaurant.push({ url, title: rest.name, caption: 'Restaurant' });
            });
        }
    });

    // 3. Media Global (Fetch si vide)
    if (allTripMedia.length === 0 && currentTripId) {
        try {
            // On peut récupérer les médias généraux ici
            // Pour l'instant on laisse vide ou on fetchera plus tard
            // Simple placeholder fetch si besoin
        } catch (e) {
            console.error("Erreur media", e);
        }
    }
    // TODO: Connecter les vrais médias globaux ici si nécessaire

    // 4. Counts
    document.getElementById('count-gallery-hotel').textContent = `(${galleryData.hotel.length})`;
    document.getElementById('count-gallery-poi').textContent = `(${galleryData.poi.length})`;
    document.getElementById('count-gallery-restaurant').textContent = `(${galleryData.restaurant.length})`;
    document.getElementById('count-gallery-media').textContent = `(${galleryData.media.length})`;

    // 5. Init view
    // Sélectionne le premier onglet qui a des photos, sinon défaut hotel
    if (galleryData.hotel.length > 0) currentGalleryTab = 'hotel';
    else if (galleryData.poi.length > 0) currentGalleryTab = 'poi';
    else if (galleryData.restaurant.length > 0) currentGalleryTab = 'restaurant';
    else currentGalleryTab = 'hotel';

    switchGalleryTab(currentGalleryTab);

    // 6. Show Modal
    toggleModal('day-gallery-modal', true);
    setupGalleryListeners();
}

/**
 * Change d'onglet dans la galerie
 */
function switchGalleryTab(tab) {
    currentGalleryTab = tab;
    currentGalleryIndex = 0;

    // UI Update
    document.querySelectorAll('.gallery-tab-btn').forEach(b => {
        if (b.id === `tab-gallery-${tab}`) {
            b.classList.remove('bg-gray-800', 'text-gray-300');
            b.classList.add('bg-purple-600', 'text-white');
        } else {
            b.classList.add('bg-gray-800', 'text-gray-300');
            b.classList.remove('bg-purple-600', 'text-white');
        }
    });

    updateGalleryDisplay();
}

/**
 * Met à jour l'affichage de l'image courante
 */
function updateGalleryDisplay() {
    const photos = galleryData[currentGalleryTab] || [];
    const mainImg = document.getElementById('day-gallery-main-img');
    const emptyState = document.getElementById('day-gallery-empty');
    const counter = document.getElementById('day-gallery-counter');
    const caption = document.getElementById('day-gallery-caption');

    if (photos.length === 0) {
        mainImg.style.display = 'none';
        emptyState.classList.remove('hidden');
        counter.textContent = '0 / 0';
        caption.textContent = '';
        document.getElementById('day-gallery-thumbnails').innerHTML = '';
        return;
    }

    mainImg.style.display = 'block';
    emptyState.classList.add('hidden');

    // Clamp index
    if (currentGalleryIndex >= photos.length) currentGalleryIndex = 0;
    if (currentGalleryIndex < 0) currentGalleryIndex = photos.length - 1;

    const photo = photos[currentGalleryIndex];
    mainImg.src = photo.url;
    counter.textContent = `${currentGalleryIndex + 1} / ${photos.length}`;
    caption.textContent = `${photo.title} • ${photo.caption}`;

    updateGalleryThumbnails();
}

/**
 * Met à jour les miniatures
 */
function updateGalleryThumbnails() {
    const container = document.getElementById('day-gallery-thumbnails');
    container.innerHTML = '';

    const photos = galleryData[currentGalleryTab] || [];

    photos.forEach((photo, idx) => {
        const thumb = document.createElement('div');
        thumb.className = `flex-shrink-0 w-20 h-14 border-2 rounded overflow-hidden cursor-pointer transition-all ${idx === currentGalleryIndex ? 'border-purple-500 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`;
        thumb.innerHTML = `<img src="${photo.url}" class="w-full h-full object-cover">`;
        thumb.onclick = () => {
            currentGalleryIndex = idx;
            updateGalleryDisplay();
        };
        container.appendChild(thumb);
    });

    // Auto scroll to active thumbnail
    if (container.children[currentGalleryIndex]) {
        container.children[currentGalleryIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

/**
 * Setup Listeners
 */
function setupGalleryListeners() {
    // Navigation
    document.getElementById('day-gallery-prev').onclick = () => {
        currentGalleryIndex--;
        updateGalleryDisplay();
    };

    document.getElementById('day-gallery-next').onclick = () => {
        currentGalleryIndex++;
        updateGalleryDisplay();
    };

    // Fermeture
    document.getElementById('close-day-gallery-btn').onclick = () => {
        toggleModal('day-gallery-modal', false);
    };

    // Keyboard support
    document.onkeydown = (e) => {
        if (document.getElementById('day-gallery-modal').classList.contains('hidden')) return;

        if (e.key === 'ArrowLeft') {
            currentGalleryIndex--;
            updateGalleryDisplay();
        } else if (e.key === 'ArrowRight') {
            currentGalleryIndex++;
            updateGalleryDisplay();
        } else if (e.key === 'Escape') {
            toggleModal('day-gallery-modal', false);
        }
    };
}

// Expose globally
window.switchGalleryTab = switchGalleryTab;
window.showDayGalleryModal = showDayGalleryModal;



// backToGrid removed - Navigation handled by browser back or link

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
// GESTION RESTAURANTS
// ============================================

let currentDayIdForRestaurant = null;
let selectedPois = [];
let allPoisCache = [];

/**
 * Ouvre la modale de sélection de restaurant pour une étape
 */
async function openRestaurantSelectorModal(dayId) {
    if (!currentTripId || !dayId) {
        showToast('Erreur : voyage ou étape non sélectionné', 'error');
        return;
    }

    currentDayIdForRestaurant = dayId;

    // Ouvre la modale
    toggleModal('restaurant-selector-modal', true);

    // Charge la liste des restaurants
    await loadRestaurantsForSelector();

    // Configure les event listeners
    setupRestaurantSelectorListeners();
}

/**
 * Charge les restaurants depuis l'API
 */
async function loadRestaurantsForSelector() {
    const listContainer = document.getElementById('restaurant-selector-list');
    const noRestaurantsMsg = document.getElementById('no-restaurants-selector');

    if (!listContainer) return;

    listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Chargement...</p>';

    try {
        const data = await fetchAPI('/admin/api/restaurants');

        if (!data.success || !data.restaurants || data.restaurants.length === 0) {
            listContainer.innerHTML = '';
            noRestaurantsMsg?.classList.remove('hidden');
            return;
        }

        noRestaurantsMsg?.classList.add('hidden');

        // Affiche les restaurants
        displayRestaurants(data.restaurants);

        // Peuple les filtres
        populateRestaurantFilters(data.restaurants);

    } catch (error) {
        console.error('Erreur chargement restaurants:', error);
        listContainer.innerHTML = '<p class="text-center text-red-500 py-4">Erreur de chargement</p>';
    }
}

/**
 * Affiche la liste des restaurants
 */
function displayRestaurants(restaurants) {
    const listContainer = document.getElementById('restaurant-selector-list');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    restaurants.forEach(restaurant => {
        const restaurantCard = document.createElement('div');
        restaurantCard.className = 'border border-gray-200 rounded-lg p-4 hover:bg-orange-50 hover:border-orange-300 transition-colors cursor-pointer';
        restaurantCard.dataset.restaurantId = restaurant.id;

        restaurantCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-900">${restaurant.name}</h4>
                    <p class="text-sm text-gray-600 mt-1">
                        <i class="fas fa-map-marker-alt mr-1 text-orange-500"></i>${restaurant.city || 'Ville non spécifiée'}
                    </p>
                    ${restaurant.cuisine ? `
                        <p class="text-sm text-gray-500 mt-1">
                            <i class="fas fa-utensils mr-1"></i>${restaurant.cuisine}
                        </p>
                    ` : ''}
                    ${restaurant.address ? `
                        <p class="text-xs text-gray-500 mt-1">${restaurant.address}</p>
                    ` : ''}
                </div>
                <div class="ml-4">
                    <button class="select-restaurant-btn bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 font-medium text-sm">
                        <i class="fas fa-plus mr-1"></i>Ajouter
                    </button>
                </div>
            </div>
        `;

        listContainer.appendChild(restaurantCard);
    });

    // Ajoute les event listeners sur les boutons d'ajout
    document.querySelectorAll('.select-restaurant-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const card = e.target.closest('[data-restaurant-id]');
            const restaurantId = card.dataset.restaurantId;
            await addRestaurantToDay(restaurantId);
        });
    });
}

/**
 * Peuple les filtres de ville et cuisine
 */
function populateRestaurantFilters(restaurants) {
    const cityFilter = document.getElementById('restaurant-city-filter');
    const cuisineFilter = document.getElementById('restaurant-cuisine-filter');

    if (!cityFilter || !cuisineFilter) return;

    // Extrait les villes uniques
    const cities = [...new Set(restaurants.map(r => r.city).filter(Boolean))].sort();
    cityFilter.innerHTML = '<option value="">Toutes les villes</option>';
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });

    // Extrait les types de cuisine uniques
    const cuisines = [...new Set(restaurants.map(r => r.cuisine).filter(Boolean))].sort();
    cuisineFilter.innerHTML = '<option value="">Tous les types</option>';
    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.value = cuisine;
        option.textContent = cuisine;
        cuisineFilter.appendChild(option);
    });
}

/**
 * Configure les event listeners pour la modale de sélection
 */
function setupRestaurantSelectorListeners() {
    // Fermeture
    document.getElementById('close-restaurant-selector-btn')?.addEventListener('click', () => {
        toggleModal('restaurant-selector-modal', false);
        currentDayIdForRestaurant = null;
    });

    document.getElementById('cancel-restaurant-selector-btn')?.addEventListener('click', () => {
        toggleModal('restaurant-selector-modal', false);
        currentDayIdForRestaurant = null;
    });

    // Recherche
    const searchInput = document.getElementById('restaurant-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filterRestaurantsInSelector);
    }

    // Filtres
    const cityFilter = document.getElementById('restaurant-city-filter');
    const cuisineFilter = document.getElementById('restaurant-cuisine-filter');

    if (cityFilter) {
        cityFilter.addEventListener('change', filterRestaurantsInSelector);
    }

    if (cuisineFilter) {
        cuisineFilter.addEventListener('change', filterRestaurantsInSelector);
    }
}

/**
 * Filtre les restaurants dans la modale
 */
async function filterRestaurantsInSelector() {
    const searchTerm = document.getElementById('restaurant-search-input')?.value.toLowerCase() || '';
    const selectedCity = document.getElementById('restaurant-city-filter')?.value || '';
    const selectedCuisine = document.getElementById('restaurant-cuisine-filter')?.value || '';

    try {
        const data = await fetchAPI('/admin/api/restaurants');

        if (!data.success || !data.restaurants) return;

        let filtered = data.restaurants.filter(restaurant => {
            // Filtre par recherche
            if (searchTerm && !restaurant.name.toLowerCase().includes(searchTerm)) {
                return false;
            }

            // Filtre par ville
            if (selectedCity && restaurant.city !== selectedCity) {
                return false;
            }

            // Filtre par cuisine
            if (selectedCuisine && restaurant.cuisine !== selectedCuisine) {
                return false;
            }

            return true;
        });

        displayRestaurants(filtered);

    } catch (error) {
        console.error('Erreur filtrage restaurants:', error);
    }
}

/**
 * Ajoute un restaurant à une étape
 */
async function addRestaurantToDay(restaurantId) {
    if (!currentTripId || !currentDayIdForRestaurant || !restaurantId) {
        showToast('Erreur : données manquantes', 'error');
        return;
    }

    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${currentDayIdForRestaurant}/restaurant-suggestions`, {
            method: 'POST',
            body: JSON.stringify({ restaurantId })
        });

        if (data.success) {
            showToast('Restaurant ajouté à l\'étape !', 'success');
            toggleModal('restaurant-selector-modal', false);
            currentDayIdForRestaurant = null;
            // Recharge les étapes pour afficher le changement
            await loadDaysForConstruction();
        }
    } catch (error) {
        console.error('Erreur ajout restaurant:', error);
        showToast(error.message || 'Erreur lors de l\'ajout du restaurant', 'error');
    }
}

/**
 * Retire une suggestion de restaurant d'une étape
 */
async function removeRestaurantSuggestion(dayId, suggestionId) {
    if (!currentTripId || !dayId || !suggestionId) {
        showToast('Erreur : données manquantes', 'error');
        return;
    }

    if (!confirm('Retirer ce restaurant de l\'étape ?')) {
        return;
    }

    try {
        const data = await fetchAPI(`/admin/api/trips/${currentTripId}/days/${dayId}/restaurant-suggestions/${suggestionId}`, {
            method: 'DELETE'
        });

        if (data.success) {
            showToast('Restaurant retiré', 'success');
            // Recharge les étapes pour afficher le changement
            await loadDaysForConstruction();
        }
    } catch (error) {
        console.error('Erreur suppression restaurant:', error);
        showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
}

// ============================================
// RECHERCHE AUTOMATIQUE D'HÔTELS À PROXIMITÉ
// ============================================

/**
 * Récupère tous les hôtels de l'utilisateur depuis tous les voyages
 */
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

/**
 * Géolocalise une ville avec Google Maps Geocoding
 */
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

/**
 * Calcule la distance entre deux points GPS (formule de Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Recherche automatique d'hôtels à proximité après validation d'une ville
 */
async function autoCheckNearbyHotels(cityName) {
    console.log('🔍 autoCheckNearbyHotels appelée avec ville:', cityName);

    if (!cityName || cityName.trim() === '') {
        console.log('❌ Ville vide, abandon');
        return;
    }

    // Évite de refaire la même recherche
    if (lastSearchedCity === cityName && nearbyHotelsCache) {
        console.log('📦 Utilisation du cache pour', cityName);
        displayNearbyBadge(nearbyHotelsCache);
        return;
    }

    try {
        // Récupère le nom de l'hôtel actuellement saisi pour l'exclure
        const currentHotelName = document.getElementById('day-hotel-name')?.value.trim().toLowerCase() || '';
        console.log('🏨 Hôtel actuel à exclure:', currentHotelName || '(aucun)');

        // Géolocalise la ville recherchée
        console.log('📍 Géolocalisation de', cityName);
        const searchLocation = await geocodeCity(cityName);
        console.log('✅ Position:', searchLocation.lat, searchLocation.lng);

        // Récupère tous les hôtels de l'utilisateur
        console.log('📚 Récupération de tous les hôtels...');
        const allHotels = await getAllUserHotels();
        console.log(`✅ ${allHotels.length} hôtel(s) total dans la base`);

        if (allHotels.length === 0) {
            console.log('ℹ️ Aucun hôtel dans la base');
            lastSearchedCity = cityName;
            nearbyHotelsCache = [];
            removeNearbyBadge();
            return;
        }

        // Calcule les distances et filtre à 20km
        console.log('📏 Calcul des distances...');
        const hotelsWithDistance = [];
        let excludedCount = 0;
        let tooFarCount = 0;

        for (const hotel of allHotels) {
            // ⭐ NOUVEAU : Exclut le même hôtel (comparaison par nom)
            const hotelNameLower = hotel.hotelName.trim().toLowerCase();
            if (currentHotelName && hotelNameLower === currentHotelName) {
                console.log(`⏭️ Exclusion du même hôtel: ${hotel.hotelName} (${hotel.city})`);
                excludedCount++;
                continue; // Skip le même hôtel
            }

            try {
                const hotelLocation = await geocodeCity(hotel.city);
                const distance = calculateDistance(
                    searchLocation.lat,
                    searchLocation.lng,
                    hotelLocation.lat,
                    hotelLocation.lng
                );

                console.log(`  📍 ${hotel.hotelName} (${hotel.city}): ${distance.toFixed(1)} km`);

                if (!isNaN(distance) && distance >= 0 && distance <= 20) {
                    console.log(`    ✅ À proximité!`);
                    hotelsWithDistance.push({ ...hotel, distance: distance });
                } else if (!isNaN(distance)) {
                    console.log(`    ❌ Trop loin (> 20km)`);
                    tooFarCount++;
                }
            } catch (error) {
                // Impossible de géolocaliser cette ville, on ignore
                console.log(`    ⚠️ Impossible de géolocaliser ${hotel.city}`);
            }
        }

        console.log(`📊 Résumé: ${hotelsWithDistance.length} à proximité, ${excludedCount} exclu(s), ${tooFarCount} trop loin`);

        // Trie par distance
        hotelsWithDistance.sort((a, b) => a.distance - b.distance);

        // Stocke en cache
        lastSearchedCity = cityName;
        nearbyHotelsCache = hotelsWithDistance;

        // Affiche le résultat
        if (hotelsWithDistance.length > 0) {
            console.log(`✅ ${hotelsWithDistance.length} hôtel(s) différent(s) trouvé(s)`);
            displayNearbyBadge(hotelsWithDistance);
        } else {
            console.log('ℹ️ Aucun autre hôtel à proximité');
            // ⭐ NOUVEAU : Affiche un badge de confirmation au lieu du toast
            displayNoNearbyBadge(excludedCount > 0);
        }

    } catch (error) {
        console.error('❌ Erreur recherche automatique:', error);
        removeNearbyBadge();
    }
}

/**
 * Affiche un badge cliquable avec le nombre d'hôtels trouvés
 */
function displayNearbyBadge(hotels) {
    const cityInput = document.getElementById('day-city');
    if (!cityInput) return;

    // Retire l'ancien badge s'il existe
    removeNearbyBadge();

    // Crée le badge
    const badge = document.createElement('div');
    badge.id = 'nearby-hotels-badge';
    badge.className = 'mt-2 inline-flex items-center px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-colors';
    badge.innerHTML = `
        <i class="fas fa-hotel mr-2"></i>
        <span class="font-medium">${hotels.length} hôtel${hotels.length > 1 ? 's' : ''} à proximité</span>
        <i class="fas fa-chevron-right ml-2 text-sm"></i>
    `;

    // Ajoute le click pour ouvrir la modale avec les résultats
    badge.addEventListener('click', () => {
        openNearbyModalWithResults(hotels);
    });

    // Insère après le champ ville
    cityInput.parentElement.appendChild(badge);
}

/**
 * ⭐ NOUVEAU : Affiche un badge de confirmation quand aucun autre hôtel n'est trouvé
 */
function displayNoNearbyBadge(hadExclusions) {
    const cityInput = document.getElementById('day-city');
    if (!cityInput) return;

    // Retire l'ancien badge s'il existe
    removeNearbyBadge();

    // Crée le badge de confirmation
    const badge = document.createElement('div');
    badge.id = 'nearby-hotels-badge';
    badge.className = 'mt-2 inline-flex items-center px-3 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200';

    const message = hadExclusions
        ? '✅ Aucun autre hôtel à proximité (< 20km)'
        : 'ℹ️ Aucun hôtel à proximité (< 20km)';

    badge.innerHTML = `
        <i class="fas fa-check-circle mr-2"></i>
        <span class="font-medium text-sm">${message}</span>
    `;

    // Insère après le champ ville
    cityInput.parentElement.appendChild(badge);

    console.log('✅ Badge "aucun hôtel" affiché');
}

/**
 * Retire le badge de notification
 */
function removeNearbyBadge() {
    const existingBadge = document.getElementById('nearby-hotels-badge');
    if (existingBadge) {
        existingBadge.remove();
    }
}

/**
 * Ouvre la modale avec les résultats pré-remplis
 */
function openNearbyModalWithResults(hotels) {
    console.log('🔍 Ouverture modale avec', hotels.length, 'hôtels');

    const searchResults = document.getElementById('search-results');
    const noResults = document.getElementById('no-results');
    const resultsList = document.getElementById('results-list');
    const searchLoader = document.getElementById('search-loader');

    if (!searchResults || !resultsList) {
        console.error('❌ Éléments de la modale introuvables');
        return;
    }

    // Cache le loader et le message "aucun résultat"
    if (searchLoader) searchLoader.classList.add('hidden');
    if (noResults) noResults.classList.add('hidden');

    // Affiche les résultats
    resultsList.innerHTML = '';
    hotels.forEach(hotel => {
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

    // Ouvre la modale (toggleModal attend un ID string, pas un élément DOM)
    toggleModal('nearby-hotels-modal', true);
    console.log('✅ Modale ouverte');
}

/**
 * Utilise un hôtel sélectionné pour pré-remplir le formulaire
 */
function useSelectedHotel(hotel) {
    toggleModal(document.getElementById('nearby-hotels-modal'), false);
    document.getElementById('day-city').value = hotel.city;
    document.getElementById('day-hotel-name').value = hotel.hotelName;
    document.getElementById('day-price-double').value = hotel.priceDouble;
    document.getElementById('day-price-solo').value = hotel.priceSolo;
    document.getElementById('day-hotel-link').value = hotel.hotelLink || '';
    showToast(`✨ Hôtel sélectionné : ${hotel.hotelName} à ${hotel.city}`, "success");

    // Retire le badge après utilisation
    removeNearbyBadge();
}

/**
 * Recherche manuelle d'hôtels à proximité (via le bouton)
 */
async function performManualSearch() {
    const cityInput = document.getElementById('search-nearby-city-input');
    const searchLoader = document.getElementById('search-loader');
    const searchResults = document.getElementById('search-results');
    const noResults = document.getElementById('no-results');
    const resultsList = document.getElementById('results-list');
    const cityName = cityInput?.value.trim();

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

// ============================================
// POLLING (NOTIFICATIONS)
// ============================================

function startPolling() {
    // Vérifie les nouvelles demandes toutes les 5 minutes (réduit la charge serveur)
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
    }, 300000); // 5 minutes au lieu de 30 secondes
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

    console.log('🍞 showToast appelé:', { message, type, toastExists: !!toast, messageExists: !!toastMessage });

    if (!toast || !toastMessage) {
        console.error('❌ Éléments toast introuvables dans le DOM !');
        return;
    }

    toastMessage.textContent = message;
    toast.classList.remove('bg-green-500', 'bg-red-500', 'bg-blue-500', 'hidden', 'opacity-0');

    let bgColor = 'bg-green-500';
    if (type === 'error') bgColor = 'bg-red-500';
    else if (type === 'info') bgColor = 'bg-blue-500';

    toast.classList.add(bgColor, 'opacity-100');

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

// ============================================
// GESTION CARTE ET GPX
// ============================================

let globalTripMap = null;
let allTripPolylines = [];

/**
 * Upload le fichier GPX pour une étape
 */
async function uploadDayGpx(tripId, dayId, file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(`/admin/api/trips/${tripId}/days/${dayId}/gpx`, {
            method: 'POST',
            body: formData
            // Note: Ne pas mettre Content-Type header, fetch le mettra avec boundary
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Erreur upload GPX');
        }

        showToast('✅ Fichier GPX uploadé avec succès !', 'success');
        return data;
    } catch (error) {
        console.error('Erreur upload GPX:', error);
        showToast('Erreur lors de l\'upload du GPX: ' + error.message, 'error');
        throw error;
    }
}

/**
 * Initialise la carte globale du voyage avec les tracés GPX
 */
async function initializeTripMap(days) {
    const mapContainer = document.getElementById('trip-map-container');
    const mapSection = document.getElementById('global-trip-map-section');
    const legendContainer = document.getElementById('trip-map-legend');

    if (!mapContainer || !mapSection || !legendContainer) return;

    // Filtre les jours qui ont un fichier GPX (URL)
    const daysWithGpx = days.filter(d => d.gpxUrl);

    if (daysWithGpx.length === 0) {
        mapSection.classList.add('hidden');
        return;
    }

    mapSection.classList.remove('hidden');

    // Initialise la carte si nécessaire
    // Vérification de sécurité Google Maps
    if (typeof google === 'undefined' || !google.maps) {
        console.warn('Google Maps API non chargée, nouvel essai dans 500ms...');
        setTimeout(() => initializeTripMap(days), 500);
        return;
    }

    if (!globalTripMap) {
        // Centre par défaut (Europe)
        try {
            globalTripMap = new google.maps.Map(mapContainer, {
                center: { lat: 46.2276, lng: 2.2137 },
                zoom: 5,
                mapTypeId: 'terrain',
                streetViewControl: false
            });
        } catch (e) {
            console.error("Erreur instanciation Google Maps:", e);
            return;
        }
    }

    // Nettoie les anciens tracés
    allTripPolylines.forEach(p => p.setMap(null));
    allTripPolylines = [];
    legendContainer.innerHTML = '';

    const bounds = new google.maps.LatLngBounds();
    const colors = ['#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#A52A2A'];

    let colorIndex = 0;

    for (const day of daysWithGpx) {
        try {
            const color = colors[colorIndex % colors.length];
            colorIndex++;

            // Ajoute à la légende
            const legendItem = document.createElement('div');
            legendItem.className = 'flex items-center px-2 py-1 bg-white border rounded shadow-sm';
            legendItem.innerHTML = `
                <span class="w-3 h-3 rounded-full mr-2" style="background-color: ${color}"></span>
                <span class="font-medium text-gray-700">${day.dayName}</span>
            `;
            legendContainer.appendChild(legendItem);

            // Récupère et parse le GPX
            // Récupère et parse le GPX via le proxy pour éviter CORS
            const proxyUrl = `/admin/api/proxy-gpx?url=${encodeURIComponent(day.gpxUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) throw new Error('Erreur chargement proxy GPX');
            const gpxText = await response.text();

            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxText, 'application/xml');

            // Extrait les points de tracé (trkpt)
            const trackPoints = gpxDoc.getElementsByTagName('trkpt');
            const path = [];

            for (let i = 0; i < trackPoints.length; i++) {
                const lat = parseFloat(trackPoints[i].getAttribute('lat'));
                const lon = parseFloat(trackPoints[i].getAttribute('lon'));
                const latLng = { lat, lng: lon };
                path.push(latLng);
                bounds.extend(latLng);
            }

            if (path.length > 0) {
                const polyline = new google.maps.Polyline({
                    path: path,
                    geodesic: true,
                    strokeColor: color,
                    strokeOpacity: 1.0,
                    strokeWeight: 4,
                    map: globalTripMap
                });

                // Ajoute un info window au clic
                const infoWindow = new google.maps.InfoWindow({
                    content: `<div class="font-semibold">${day.dayName}</div><div>${day.city}</div>`
                });

                polyline.addListener('click', (e) => {
                    infoWindow.setPosition(e.latLng);
                    infoWindow.open(globalTripMap);
                });

                allTripPolylines.push(polyline);
            }

        } catch (error) {
            console.error(`Erreur chargement GPX pour ${day.dayName}:`, error);
        }
    }

    // Fit bounds si on a des tracés
    if (allTripPolylines.length > 0) {
        globalTripMap.fitBounds(bounds);
    }
}

// ============================================
// GESTION DES POIS (NOUVEAU)
// ============================================

/**
 * Ouvre la modale de sélection de POI
 */
async function openPoiSelectorModal() {
    toggleModal('poi-selector-modal', true);

    // Charge les POIs si pas encore fait
    if (allPoisCache.length === 0) {
        await loadPoisForSelector();
    } else {
        renderPoiSelectorList();
    }

    // Event listeners
    setupPoiSelectorListeners();
}

/**
 * Ferme la modale de sélection de POI
 */
function closePoiSelectorModal() {
    toggleModal('poi-selector-modal', false);
}

/**
 * Charge les POIs depuis le serveur
 */
async function loadPoisForSelector() {
    const listContainer = document.getElementById('poi-selector-list');
    listContainer.innerHTML = '<div class="text-center py-8"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div></div>';

    try {
        const response = await fetch('/admin/api/pois');
        const data = await response.json();

        if (data.success) {
            allPoisCache = data.pois;
            renderPoiSelectorList();
        } else {
            listContainer.innerHTML = '<p class="text-center text-red-500">Erreur de chargement</p>';
        }
    } catch (error) {
        console.error('Erreur chargement POIs:', error);
        listContainer.innerHTML = '<p class="text-center text-red-500">Erreur de connexion</p>';
    }
}

/**
 * Affiche la liste des POIs filtrés
 */
function renderPoiSelectorList() {
    const searchTerm = document.getElementById('poi-selector-search').value.toLowerCase();
    const cityFilter = document.getElementById('poi-selector-city-filter').value;
    const categoryFilter = document.getElementById('poi-selector-category-filter').value;

    const filtered = allPoisCache.filter(poi => {
        const matchesSearch = !searchTerm ||
            poi.name.toLowerCase().includes(searchTerm) ||
            poi.city.toLowerCase().includes(searchTerm);

        const matchesCity = !cityFilter || poi.city === cityFilter;
        const matchesCategory = !categoryFilter || poi.category === categoryFilter;

        return matchesSearch && matchesCity && matchesCategory;
    });

    const listContainer = document.getElementById('poi-selector-list');
    const noResults = document.getElementById('no-pois-selector');

    if (filtered.length === 0) {
        listContainer.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }

    noResults.classList.add('hidden');

    // Config icônes
    const ICONS = {
        'monument': '🏰',
        'nature': '🌲',
        'museum': '🎨',
        'activity': '⚡',
        'viewpoint': '🔭',
        'pass': '⛰️',
        'lake': '💧',
        'route': '🛣️',
        'other': '📍'
    };

    listContainer.innerHTML = filtered.map(poi => {
        const isSelected = selectedPois.some(p => p.id === poi.id);
        const icon = ICONS[poi.category] || '📍';

        return `
            <div class="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 ${isSelected ? 'bg-purple-50 border-purple-200' : ''}">
                <div class="flex items-center gap-3">
                    <div class="text-2xl">${icon}</div>
                    <div>
                        <div class="font-medium text-gray-900">${poi.name}</div>
                        <div class="text-xs text-gray-500">${poi.city} • ${poi.category}</div>
                    </div>
                </div>
                <button type="button" 
                        onclick="togglePoiSelection('${poi.id}')"
                        class="${isSelected ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-purple-100 text-purple-600 hover:bg-purple-200'} px-3 py-1 rounded-full text-sm font-medium transition-colors">
                    ${isSelected ? '<i class="fas fa-minus mr-1"></i>Retirer' : '<i class="fas fa-plus mr-1"></i>Ajouter'}
                </button>
            </div>
        `;
    }).join('');
}

// Listener pour le bouton "Modifier Publication"
document.getElementById('edit-publication-btn-construction')?.addEventListener('click', () => {
    if (currentTripId) {
        window.location.href = `/admin/trips/${currentTripId}/publish`;
    }
});

/**
 * Configure les écouteurs pour le sélecteur POI
 */
function setupPoiSelectorListeners() {
    const searchInput = document.getElementById('poi-selector-search');
    const cityFilter = document.getElementById('poi-selector-city-filter');
    const categoryFilter = document.getElementById('poi-selector-category-filter');

    // Clean up old listeners to avoid duplicates (naive approach)
    const newSearch = searchInput.cloneNode(true);
    searchInput.parentNode.replaceChild(newSearch, searchInput);

    const newCity = cityFilter.cloneNode(true);
    cityFilter.parentNode.replaceChild(newCity, cityFilter);

    const newCategory = categoryFilter.cloneNode(true);
    categoryFilter.parentNode.replaceChild(newCategory, categoryFilter);

    // Re-attach
    document.getElementById('poi-selector-search').addEventListener('input', renderPoiSelectorList);
    document.getElementById('poi-selector-city-filter').addEventListener('change', renderPoiSelectorList);
    document.getElementById('poi-selector-category-filter').addEventListener('change', renderPoiSelectorList);

    // Populate cities logic could occur here too if not done
    populatePoiCityFilter();
}

/**
 * Remplit le filtre des villes POI
 */
function populatePoiCityFilter() {
    const select = document.getElementById('poi-selector-city-filter');
    if (select.options.length > 1) return; // Déjà rempli

    const cities = [...new Set(allPoisCache.map(p => p.city))].sort();

    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        select.appendChild(option);
    });
}

/**
 * Bascule la sélection d'un POI
 */
function togglePoiSelection(poiId) {
    const poi = allPoisCache.find(p => p.id === poiId);
    if (!poi) return;

    const index = selectedPois.findIndex(p => p.id === poiId);

    if (index >= 0) {
        selectedPois.splice(index, 1);
    } else {
        // Safe icon resolution
        const ICONS = {
            'monument': '🏰',
            'nature': '🌲',
            'museum': '🎨',
            'activity': '⚡',
            'viewpoint': '🔭',
            'pass': '⛰️',
            'lake': '💧',
            'route': '🛣️',
            'other': '📍'
        };
        const icon = ICONS[poi.category] || '📍';

        // On ne garde que les champs nécessaires pour l'étape
        selectedPois.push({
            id: poi.id,
            name: poi.name,
            category: poi.category,
            city: poi.city,
            icon: icon,
            photos: poi.photos || []
        });
    }

    renderPoiSelectorList();
    updateDayPoisList();
}

/**
 * Met à jour l'affichage des POIs dans la modale d'étape
 */
function updateDayPoisList() {
    const container = document.getElementById('day-pois-list');

    if (selectedPois.length === 0) {
        container.innerHTML = '<p class="text-xs text-gray-500 italic">Aucun POI sélectionné</p>';
        return;
    }

    // Map icons manual fallback if needed
    const ICONS = {
        'monument': '🏰',
        'nature': '🌲',
        'museum': '🎨',
        'activity': '⚡',
        'viewpoint': '🔭',
        'pass': '⛰️',
        'lake': '💧',
        'route': '🛣️',
        'other': '📍'
    };

    container.innerHTML = selectedPois.map((poi, idx) => {
        const icon = ICONS[poi.category] || '📍';
        return `
            <div class="flex items-center justify-between bg-purple-50 px-3 py-2 rounded-md border border-purple-100">
                <div class="flex items-center gap-2">
                    <span class="text-lg">${icon}</span>
                    <span class="text-sm font-medium text-purple-900">${poi.name}</span>
                </div>
                <button type="button" onclick="removePoiFromDay('${poi.id}')" 
                        class="text-purple-400 hover:text-red-500 transition-colors">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
    }).join('');
}

/**
 * Retire un POI de l'étape (depuis la modale d'étape)
 */
function removePoiFromDay(poiId) {
    const index = selectedPois.findIndex(p => p.id === poiId);
    if (index >= 0) {
        selectedPois.splice(index, 1);
        updateDayPoisList();

        // Si le sélecteur est ouvert, on rafraîchit
        if (!document.getElementById('poi-selector-modal').classList.contains('hidden')) {
            renderPoiSelectorList();
        }
    }
}

// Expose functions globally
window.openPoiSelectorModal = openPoiSelectorModal;
window.closePoiSelectorModal = closePoiSelectorModal;
window.togglePoiSelection = togglePoiSelection;
window.removePoiFromDay = removePoiFromDay;

// Init listeners
document.addEventListener('DOMContentLoaded', () => {
    console.log('🏁 Dashboard JS loaded');

    // Init Listeners
    document.getElementById('add-poi-to-day-btn')?.addEventListener('click', openPoiSelectorModal);
    document.getElementById('close-poi-selector-btn')?.addEventListener('click', closePoiSelectorModal);

    // Global Listeners for Tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Si c'est un lien (partners/hotels), laisser faire
            if (btn.onclick) return;

            // Sinon gérer les onglets JS
            const targetId = btn.id.replace('tab-', '').replace('-btn', '');
            switchTab(targetId);
        });
    });

    // Filtres
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentFilter = btn.dataset.filter;
            filterTrips();
            updateFilterButtons();
        });
    });

    // Start
    loadDashboardData();
    startPolling();
});

/**
 * Copie l'URL du voyage dans le presse-papier
 */
function copyTripUrl() {
    const urlLink = document.getElementById('published-trip-link');
    if (!urlLink || !urlLink.href) return;

    navigator.clipboard.writeText(urlLink.href).then(() => {
        showToast('Lien copié !', 'success');
    }).catch(err => {
        console.error('Erreur copie:', err);
        showToast('Erreur lors de la copie', 'error');
    });
}
window.copyTripUrl = copyTripUrl;

