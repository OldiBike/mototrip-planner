/**
 * trip_builder.js
 * Logique dédiée à la construction de voyages (Hard Split)
 */

let tripId = null;
let currentTripData = null;
let globalTripMap = null;
let allTripPolylines = [];
// Variable globale pour stocker les POIs s'ils sont chargés
let allPois = [];
let allDays = [];
let galleryImages = [];
let currentGalleryIndex = 0;
let currentDayPois = []; // For the modal editing session
let currentDayRestaurants = [];

document.addEventListener('DOMContentLoaded', () => {
    console.log('🏗️ Trip Builder JS loaded');

    // Récupère l'ID du voyage depuis la variable globale injectée par le template
    if (window.TRIP_ID) {
        tripId = window.TRIP_ID;
        initializeBuilder(tripId);
    } else {
        console.error("Trip ID manquant !");
        showToast("Erreur critique : ID du voyage manquant", "error");
    }

    // Modal listeners
    document.getElementById('add-day-modal-btn')?.addEventListener('click', () => openDayModal());
    document.getElementById('close-day-modal-btn')?.addEventListener('click', () => closeDayModal());
    document.getElementById('save-day-btn')?.addEventListener('click', saveDayForm);
    document.getElementById('add-poi-to-day-btn')?.addEventListener('click', addPoiToDay);
    document.getElementById('add-restaurant-to-day-btn')?.addEventListener('click', addRestaurantToDay);

    // Header Actions
    document.getElementById('publish-trip-btn-construction')?.addEventListener('click', () => updateTripStatus(true));
    document.getElementById('unpublish-trip-btn-construction')?.addEventListener('click', () => updateTripStatus(false));
    document.getElementById('edit-publication-btn-construction')?.addEventListener('click', () => {
        window.location.href = `/admin/trips/${tripId}/publish`;
    });
    document.getElementById('manage-media-btn')?.addEventListener('click', () => {
        // Redirect to media bank or publish page section
        window.location.href = `/admin/media`;
    });

    // Gallery
    document.getElementById('close-day-gallery-btn')?.addEventListener('click', closeDayGalleryModal);
    document.getElementById('day-gallery-prev')?.addEventListener('click', () => navigateGallery(-1));
    document.getElementById('day-gallery-next')?.addEventListener('click', () => navigateGallery(1));

    // Pricing inputs
    document.getElementById('sale-price-pp-input')?.addEventListener('input', updateMarginDisplay);
    document.getElementById('sim-nb-double')?.addEventListener('input', updateSimulation);
    document.getElementById('sim-nb-solo')?.addEventListener('input', updateSimulation);
});

// --- HEADER ACTIONS ---

async function updateTripStatus(publish) {
    if (!confirm(publish ? "Publier ce voyage ?" : "Dépublier ce voyage ?")) return;

    try {
        await fetchAPI(`/admin/api/trips/${tripId}`, {
            method: 'PUT',
            body: JSON.stringify({ isPublished: publish })
        });

        // Update local data and UI
        currentTripData.isPublished = publish;
        updatePublishButtons();
        showToast(publish ? "Voyage publié !" : "Voyage dépublié");
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function copyTripUrl() {
    const link = document.getElementById('published-trip-link');
    if (link && link.href) {
        navigator.clipboard.writeText(link.href)
            .then(() => showToast("Lien copié !"))
            .catch(err => showToast("Erreur copie", "error"));
    }
}

// Globals for pricing to avoid DOM parsing
let pricingState = {
    costDoubleRoom: 0,
    costSoloRoom: 0,
    saleDoubleRoom: 0,
    saleSoloRoom: 0,
    salePricePerPerson: 0
};

async function initializeBuilder(id) {
    try {
        await loadTripData(id);
    } catch (error) {
        console.error("Erreur init builder:", error);
    }
}

async function loadTripData(id) {
    try {
        const response = await fetchAPI(`/admin/api/trips/${id}`);
        if (response.success) {
            currentTripData = response.trip;
            document.getElementById('construction-trip-name').textContent = currentTripData.name;

            // Setup pricing
            const salePricePP = currentTripData.salePricePerPerson || 0;
            document.getElementById('sale-price-pp-input').value = salePricePP > 0 ? salePricePP : '';
            pricingState.salePricePerPerson = salePricePP;

            // Setup dates
            document.getElementById('recommended-start-input').value = currentTripData.recommendedRequestStart || '';
            document.getElementById('recommended-end-input').value = currentTripData.recommendedRequestEnd || '';

            // Setup publish buttons
            updatePublishButtons();

            // Load days
            await loadDays();

        } else {
            throw new Error(response.error || "Erreur chargement voyage");
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updatePublishButtons() {
    const publishBtn = document.getElementById('publish-trip-btn-construction');
    const unpublishBtn = document.getElementById('unpublish-trip-btn-construction');
    const editPublishBtn = document.getElementById('edit-publication-btn-construction');
    const urlContainer = document.getElementById('published-trip-url-container');
    const urlLink = document.getElementById('published-trip-link');

    if (currentTripData.isPublished) {
        publishBtn?.classList.add('hidden');
        unpublishBtn?.classList.remove('hidden');
        editPublishBtn?.classList.remove('hidden');

        if (urlContainer && urlLink) {
            const slug = currentTripData.publishedSlug || currentTripData.slug || currentTripData.id;
            const publicUrl = `${window.location.origin}/voyages/${slug}`;
            urlLink.href = publicUrl;
            urlLink.textContent = publicUrl;
            urlContainer.classList.remove('hidden');
        }
    } else {
        publishBtn?.classList.remove('hidden');
        unpublishBtn?.classList.add('hidden');
        editPublishBtn?.classList.add('hidden');
        urlContainer?.classList.add('hidden');
    }
}

async function loadDays() {
    const daysList = document.getElementById('days-list');
    daysList.innerHTML = '<p class="text-gray-500 text-center py-4">Chargement des étapes...</p>';

    try {
        const data = await fetchAPI(`/admin/api/trips/${tripId}/days`);
        allDays = data.days || [];
        const days = allDays;

        updateCostCalculator(data.costs || {}, data.sale_prices || {});

        if (days.length === 0) {
            daysList.innerHTML = '<div class="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300"><p class="text-gray-500 mb-2">Aucune étape pour ce voyage.</p><button onclick="openDayModal()" class="text-blue-600 font-medium hover:underline">Ajouter la première étape</button></div>';
            return;
        }

        daysList.innerHTML = '';

        // Render Days
        for (const day of days) {
            // ... (HTML generation similar to dashboard.js but in cleaner structure)
            // Using a simpler version or copied logic to save tokens for now, will implement renderDayCard logic
            const dayCard = createDayCard(day);
            daysList.appendChild(dayCard);
        }

        // Init Map
        if (typeof google !== 'undefined' && google.maps) {
            initializeTripMap(days);
        } else {
            setTimeout(() => initializeTripMap(days), 1000);
        }

    } catch (error) {
        console.error('Erreur chargement jours:', error);
        daysList.innerHTML = `<p class="text-red-500">Erreur: ${error.message}</p>`;
    }
}

function createDayCard(day) {
    const div = document.createElement('div');
    div.className = 'bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-all shadow-sm group mb-4';

    const distance = parseFloat(day.distance || 0).toFixed(1);
    // Elevation removed

    div.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
             <div class="flex items-center flex-wrap gap-2">
                <span class="bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm shadow-blue-200">${day.dayName}</span>
                <span class="font-bold text-gray-900">${day.startCity || '?'}</span>
                <i class="fas fa-long-arrow-alt-right mx-2 text-blue-400"></i>
                <span class="font-bold text-gray-900">${day.endCity || '?'}</span>
             </div>
             <div class="flex items-center gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <i class="fas fa-road text-blue-500 mr-1.5 text-sm"></i>
                <span class="font-bold text-gray-900">${distance}</span> <span class="text-xs ml-0.5">km</span>
             </div>
             ${day.gpxFile ? `<div class="ml-2 px-2 py-1 bg-gray-100 text-gray-500 text-xs font-mono rounded border border-gray-200 truncate max-w-[200px]" title="${day.gpxFile}"><i class="fas fa-file-code mr-1"></i>${day.gpxFile}</div>` : ''}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div class="bg-blue-50/50 rounded-lg p-3 border border-blue-100/50">
                 <div class="text-xs font-bold text-blue-400 uppercase tracking-wide mb-1">Hébergement</div>
                 <div class="font-bold text-gray-800">${day.hotelName}</div>
                 <div class="text-sm mt-1">
                    <span class="font-bold">${parseFloat(day.priceDouble || 0).toFixed(2)}€</span> <span class="text-gray-400 text-xs">/pers (Dbl)</span>
                 </div>
                 <div class="mt-2 flex gap-3">
                    ${day.hotelLink ? `<a href="${day.hotelLink}" target="_blank" class="text-blue-500 hover:text-blue-700" title="Voir l'hôtel"><i class="fas fa-external-link-alt"></i></a>` : ''}
                    <button onclick="openDayGallery('${day.id}')" class="text-purple-500 hover:text-purple-700" title="Photos"><i class="fas fa-images"></i></button>
                 </div>
            </div>
            
            <div class="bg-orange-50/50 rounded-lg p-3 border border-orange-100/50">
                <div class="text-xs font-bold text-orange-400 uppercase tracking-wide mb-1">Restaurants</div>
                <div class="flex flex-wrap gap-1">
                    ${(day.restaurants && day.restaurants.length > 0) ?
            day.restaurants.map(r => {
                const name = typeof r === 'string' ? r : (r.name || 'Resto');
                return `<span class="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[120px]" title="${name}">${name}</span>`;
            }).join('')
            : '<span class="text-xs text-gray-400 italic">Aucun restaurant</span>'
        }
                 </div>
            </div>

            <div class="bg-purple-50/50 rounded-lg p-3 border border-purple-100/50">
                 <div class="text-xs font-bold text-purple-400 uppercase tracking-wide mb-1">Points d'Intérêt</div>
                 <div class="flex flex-wrap gap-1">
                    ${(day.pois && day.pois.length > 0) ?
            day.pois.map(p => {
                const name = typeof p === 'string' ? p : (p.name || 'POI');
                return `<button onclick="openDayGallery('${day.id}', 'poi')" class="bg-purple-100 hover:bg-purple-200 text-purple-700 px-1.5 py-0.5 rounded text-[10px] truncate max-w-[120px] transition-colors cursor-pointer" title="Voir les photos de ${name}">${name}</button>`;
            }).join('')
            : '<span class="text-xs text-gray-400 italic">Aucun POI</span>'
        }
                 </div>
            </div>
        </div>
        
        <div class="flex justify-end pt-3 border-t border-gray-100 gap-2">
            <button onclick="openDayModal('${day.id}')" class="text-blue-500 hover:text-blue-700 p-2"><i class="fas fa-pen"></i></button>
            <button onclick="deleteDay('${day.id}')" class="text-red-500 hover:text-red-700 p-2"><i class="fas fa-trash"></i></button>
        </div>
    `;
    return div;
}


// --- MAP LOGIC ---
async function initializeTripMap(days) {
    const mapContainer = document.getElementById('trip-map-container');
    const mapSection = document.getElementById('global-trip-map-section');
    const legendContainer = document.getElementById('trip-map-legend');

    if (!mapContainer || !mapSection) return;

    const daysWithGpx = days.filter(d => d.gpxUrl);

    if (daysWithGpx.length === 0) {
        mapSection.classList.add('hidden');
        return;
    }

    mapSection.classList.remove('hidden');

    if (!globalTripMap) {
        globalTripMap = new google.maps.Map(mapContainer, {
            center: { lat: 46.2276, lng: 2.2137 },
            zoom: 5,
            mapTypeId: 'terrain',
            streetViewControl: false
        });
    }

    // Clear old polylines
    allTripPolylines.forEach(p => p.setMap(null));
    allTripPolylines = [];
    if (legendContainer) legendContainer.innerHTML = '';

    const bounds = new google.maps.LatLngBounds();
    const colors = ['#FF0000', '#0000FF', '#008000', '#FFA500', '#800080', '#00FFFF', '#FF00FF', '#FFFF00', '#000000', '#A52A2A'];

    let colorIndex = 0;

    for (const day of daysWithGpx) {
        try {
            const color = colors[colorIndex % colors.length];
            colorIndex++;

            if (legendContainer) {
                const legendItem = document.createElement('div');
                legendItem.className = 'flex items-center px-2 py-1 bg-white border rounded shadow-sm';
                legendItem.innerHTML = `<span class="w-3 h-3 rounded-full mr-2" style="background-color: ${color}"></span><span class="font-medium text-gray-700">${day.dayName}</span>`;
                legendContainer.appendChild(legendItem);
            }

            const proxyUrl = `/admin/api/proxy-gpx?url=${encodeURIComponent(day.gpxUrl)}`;
            const response = await fetch(proxyUrl);
            if (!response.ok) continue;
            const gpxText = await response.text();

            const parser = new DOMParser();
            const gpxDoc = parser.parseFromString(gpxText, 'application/xml');
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
                allTripPolylines.push(polyline);
            }
        } catch (error) {
            console.error(`Erreur GPX pour ${day.dayName}:`, error);
        }
    }

    if (allTripPolylines.length > 0) {
        globalTripMap.fitBounds(bounds);
    }
}

// --- UTILS ---

async function fetchAPI(url, options = {}) {
    const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options
    });
    return response.json();
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-y-0 opacity-100 flex items-center ${type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`;

    setTimeout(() => {
        toast.className = toast.className.replace('translate-y-0 opacity-100', '-translate-y-2 opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// --- PRICING LOGIC ---

function updateCostCalculator(costs, salePrices) {
    // Store in global state for simulation
    pricingState.costDoubleRoom = costs.total_double || 0;
    pricingState.costSoloRoom = costs.total_solo || 0;
    pricingState.saleDoubleRoom = salePrices.sale_double || 0;
    pricingState.saleSoloRoom = salePrices.sale_solo || 0;
    pricingState.salePricePerPerson = salePrices.sale_price_per_person || 0;

    // Update DOM (Double)
    setText('total-double', pricingState.costDoubleRoom.toFixed(2) + '€');
    setText('total-double-pp', (pricingState.costDoubleRoom / 2).toFixed(2) + '€');
    setText('sale-double', pricingState.saleDoubleRoom.toFixed(2) + '€');
    setText('sale-double-pp', pricingState.salePricePerPerson.toFixed(2) + '€');

    // Update DOM (Solo)
    setText('total-solo', pricingState.costSoloRoom.toFixed(2) + '€');
    setText('sale-solo', pricingState.saleSoloRoom.toFixed(2) + '€');

    // Initial Simulation update
    updateSimulation();
}

function updateSimulation() {
    const nbDouble = parseInt(document.getElementById('sim-nb-double').value) || 0;
    const nbSolo = parseInt(document.getElementById('sim-nb-solo').value) || 0;

    // Toggle Solo Card Visibility
    const soloCard = document.getElementById('pricing-card-solo');
    if (soloCard) {
        if (nbSolo > 0) {
            soloCard.classList.remove('hidden');
        } else {
            soloCard.classList.add('hidden');
        }
    }

    // Costs
    const totalCostDouble = nbDouble * pricingState.costDoubleRoom;
    const totalCostSolo = nbSolo * pricingState.costSoloRoom;
    const totalCosts = totalCostDouble + totalCostSolo;

    // Sales (Logic: Double Room sells for 2 * PP Price via package logic usually, or explicitly saleDoubleRoom)
    const totalSaleDouble = nbDouble * pricingState.saleDoubleRoom;
    const totalSaleSolo = nbSolo * pricingState.saleSoloRoom;
    const totalSales = totalSaleDouble + totalSaleSolo;

    // Margin
    const totalMargin = totalSales - totalCosts;
    const marginPercent = totalSales > 0 ? (totalMargin / totalSales) * 100 : 0;

    setText('sim-total-sales', totalSales.toFixed(2) + '€');
    setText('sim-total-costs', totalCosts.toFixed(2) + '€');
    setText('sim-total-margin', totalMargin.toFixed(2) + '€');
    setText('sim-margin-percent', '(' + marginPercent.toFixed(1) + '%)');
}

function updateMarginDisplay(e) {
    const newPrice = parseFloat(e.target.value) || 0;
    pricingState.salePricePerPerson = newPrice;

    // Update local state approx
    pricingState.saleDoubleRoom = newPrice * 2;
    // Solo price logic here is tricky without backend, but we can assume it stays proportional or fixed for simulation
    // For now, let's just update Double UI

    setText('sale-double', pricingState.saleDoubleRoom.toFixed(2) + '€');
    setText('sale-double-pp', newPrice.toFixed(2) + '€');

    updateSimulation();
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// --- MODALS (Simplified for brevity, assuming they exist in HTML) ---
// --- MODAL LOGIC ---

// Listen to GPX file selection to update text input
document.getElementById('day-gpx-upload')?.addEventListener('change', function (e) {
    if (this.files && this.files[0]) {
        document.getElementById('day-gpx-file').value = this.files[0].name;
    }
});

document.getElementById('cancel-add-day-btn')?.addEventListener('click', closeDayModal);

function openDayModal(dayId = null) {
    const modal = document.getElementById('add-day-modal');
    const title = document.getElementById('day-modal-title');
    const form = document.getElementById('add-day-form');

    if (!modal || !form) return;

    // Reset form
    form.reset();
    document.getElementById('editing-day-id').value = '';
    document.getElementById('day-gpx-file').value = '';
    document.getElementById('day-pois-list').innerHTML = '';
    currentDayPois = [];
    if (document.getElementById('day-restaurants-list')) document.getElementById('day-restaurants-list').innerHTML = '';
    currentDayRestaurants = [];

    if (dayId) {
        // Edit Mode
        title.textContent = "Modifier l'étape";
        document.getElementById('editing-day-id').value = dayId;

        // Fetch day details
        fetchAPI(`/admin/api/trips/${tripId}/days/${dayId}`)
            .then(data => {
                if (data.success) {
                    const day = data.day;
                    document.getElementById('day-name').value = day.dayName || '';
                    document.getElementById('day-city').value = day.city || '';
                    document.getElementById('day-hotel-name').value = day.hotelName || '';
                    document.getElementById('day-price-double').value = day.priceDouble || '';
                    document.getElementById('day-price-solo').value = day.priceSolo || '';
                    document.getElementById('day-nights').value = day.nights || 1;
                    document.getElementById('day-gpx-file').value = day.gpxFile || '';
                    document.getElementById('day-hotel-link').value = day.hotelLink || '';

                    // POIs
                    currentDayPois = day.pois || [];
                    if (typeof currentDayPois[0] === 'string') {
                        // Normalize if needed, currently assuming strings or objects
                        // If objects with 'name', extract. If simple strings, keep.
                    }
                    renderPoiList();

                    // Restaurants
                    currentDayRestaurants = day.restaurants || [];
                    renderRestaurantList();
                }
            })
            .catch(err => showToast("Erreur chargement étape", "error"));

    } else {
        // Add Mode
        title.textContent = "Ajouter une nouvelle étape";
        currentDayPois = [];
        currentDayRestaurants = [];
        renderPoiList();
        renderRestaurantList();
    }

    modal.classList.remove('hidden');
}

function closeDayModal() {
    const modal = document.getElementById('add-day-modal');
    if (modal) modal.classList.add('hidden');
    currentDayPois = [];
    currentDayRestaurants = [];
}

async function saveDayForm(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('save-day-btn');
    if (saveBtn) saveBtn.disabled = true;

    try {
        const dayId = document.getElementById('editing-day-id').value;
        const gpxInput = document.getElementById('day-gpx-upload');
        const hasGpxFile = gpxInput.files.length > 0;

        // Prepare JSON data
        const formData = {
            dayName: document.getElementById('day-name').value,
            city: document.getElementById('day-city').value,
            hotelName: document.getElementById('day-hotel-name').value,
            priceDouble: parseFloat(document.getElementById('day-price-double').value) || 0,
            priceSolo: parseFloat(document.getElementById('day-price-solo').value) || 0,
            nights: parseInt(document.getElementById('day-nights').value) || 1,
            hotelLink: document.getElementById('day-hotel-link').value,
            // Only send filename if we have one, backend might use it for display before upload confirms
            gpxFile: document.getElementById('day-gpx-file').value,
            pois: currentDayPois,
            restaurants: currentDayRestaurants
        };

        let result;
        if (dayId) {
            // Update
            result = await fetchAPI(`/admin/api/trips/${tripId}/days/${dayId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
        } else {
            // Create
            result = await fetchAPI(`/admin/api/trips/${tripId}/days`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        }

        if (result.success) {
            const finalDayId = dayId || result.day_id;

            // Upload GPX if present
            if (hasGpxFile && finalDayId) {
                const gpxData = new FormData();
                gpxData.append('file', gpxInput.files[0]);

                await fetch(`/admin/api/trips/${tripId}/days/${finalDayId}/gpx`, {
                    method: 'POST',
                    body: gpxData // Fetch handles Content-Type for FormData
                });
            }

            showToast("Étape enregistrée");
            closeDayModal();
            loadDays(); // Refresh grid
        } else {
            throw new Error(result.error);
        }

    } catch (error) {
        console.error(error);
        showToast(error.message || "Erreur enregistrement", "error");
    } finally {
        if (saveBtn) saveBtn.disabled = false;
    }
}

// --- DELETE DAY ---

async function deleteDay(dayId) {
    if (!confirm("Supprimer cette étape ?")) return;
    try {
        await fetchAPI(`/admin/api/trips/${tripId}/days/${dayId}`, { method: 'DELETE' });
        loadDays();
        showToast("Étape supprimée");
    } catch (e) {
        showToast(e.message, 'error');
    }
}

// --- GALLERY ---

let galleryData = { hotel: [], poi: [], restaurant: [], media: [] };
let currentTab = 'media';
// currentGalleryIndex is already global

async function openDayGallery(dayId, initialTab = null) {
    const day = allDays.find(d => d.id === dayId);
    if (!day) return;

    // Reset Data
    galleryData = { hotel: [], poi: [], restaurant: [], media: [] };

    // Populate Data
    // 1. Hotel
    if (day.hotelPhotos && Array.isArray(day.hotelPhotos)) {
        galleryData.hotel = day.hotelPhotos;
    } else if (day.hotelImage) {
        galleryData.hotel.push(day.hotelImage);
    }

    // 2. POIs (Requires fetching detailed day if POIs not fully loaded)
    // Assuming 'day' from allDays has basic info. We might need to fetch details for POI photos.
    // Let's try to fetch details if we suspect missing data, OR just rely on what we have.
    // For safety, let's fetch details to get fresh photos.
    try {
        const data = await fetchAPI(`/admin/api/trips/${tripId}/days/${dayId}`);
        if (data.success && data.day) {
            const detailedDay = data.day;

            // Hotel
            if (detailedDay.hotelPhotos) galleryData.hotel = detailedDay.hotelPhotos;

            // Check if we have hotelId but no photos, try to fetch from Hotel Bank
            if ((!galleryData.hotel || galleryData.hotel.length === 0) && detailedDay.hotelId) {
                try {
                    const hotelData = await fetchAPI(`/admin/api/hotels/${detailedDay.hotelId}`);
                    if (hotelData.success && hotelData.hotel && hotelData.hotel.photos) {
                        galleryData.hotel = hotelData.hotel.photos;
                    }
                } catch (he) { console.warn("Could not fetch hotel details", he); }
            }

            // POIs
            if (detailedDay.pois && Array.isArray(detailedDay.pois)) {
                detailedDay.pois.forEach(poi => {
                    // Supported format: string (name) or object { name: '', photos: [] }
                    if (typeof poi === 'object' && poi.photos) {
                        galleryData.poi.push(...poi.photos);
                    }
                    // If poi is just a string, we can't extract photos unless we search for it.
                    // Assuming object structure for richer content.
                });
            }

            // Restaurants
            if (detailedDay.restaurants && Array.isArray(detailedDay.restaurants)) {
                detailedDay.restaurants.forEach(restaurant => {
                    if (typeof restaurant === 'object' && restaurant.photos) {
                        galleryData.restaurant.push(...restaurant.photos);
                    }
                });
            }

            // General
            if (detailedDay.photos) galleryData.media = detailedDay.photos;
        }
    } catch (e) {
        console.error("Error detailed fetch", e);
    }

    // Update Counts in Modal
    setText('count-gallery-hotel', `(${galleryData.hotel.length})`);
    setText('count-gallery-poi', `(${galleryData.poi.length})`);
    setText('count-gallery-restaurant', `(${galleryData.restaurant.length})`);
    setText('count-gallery-media', `(${galleryData.media.length})`);

    // Priority: Initial Tab -> Hotel -> POI -> Media
    if (initialTab && galleryData[initialTab] && galleryData[initialTab].length > 0) {
        switchGalleryTab(initialTab);
    } else {
        if (galleryData.hotel.length > 0) switchGalleryTab('hotel');
        else if (galleryData.poi.length > 0) switchGalleryTab('poi');
        else if (galleryData.restaurant.length > 0) switchGalleryTab('restaurant');
        else switchGalleryTab('media');
    }

    document.getElementById('day-gallery-modal').classList.remove('hidden');
}

function closeDayGalleryModal() {
    document.getElementById('day-gallery-modal').classList.add('hidden');
}

function switchGalleryTab(tab) {
    currentTab = tab;

    // Highlights styling
    const tabs = ['hotel', 'poi', 'restaurant', 'media'];
    tabs.forEach(t => {
        const btn = document.getElementById(`tab-gallery-${t}`);
        if (btn) {
            if (t === tab) {
                btn.classList.add('bg-purple-600', 'text-white');
                btn.classList.remove('bg-gray-800', 'text-gray-300');
            } else {
                btn.classList.remove('bg-purple-600', 'text-white');
                btn.classList.add('bg-gray-800', 'text-gray-300');
            }
        }
    });

    currentGalleryIndex = 0;
    updateGalleryUI();
}

function navigateGallery(direction) {
    const images = galleryData[currentTab] || [];
    if (images.length === 0) return;
    currentGalleryIndex = (currentGalleryIndex + direction + images.length) % images.length;
    updateGalleryUI();
}

function updateGalleryUI() {
    const images = galleryData[currentTab] || [];
    const imgEl = document.getElementById('day-gallery-main-img');
    const emptyEl = document.getElementById('day-gallery-empty');
    const counterEl = document.getElementById('day-gallery-counter');
    const thumbnailsEl = document.getElementById('day-gallery-thumbnails');

    if (!imgEl) return;

    if (images.length === 0) {
        imgEl.classList.add('hidden');
        if (emptyEl) emptyEl.classList.remove('hidden');
        if (counterEl) counterEl.textContent = '0 / 0';
        if (thumbnailsEl) thumbnailsEl.innerHTML = '';
        return;
    }

    imgEl.classList.remove('hidden');
    if (emptyEl) emptyEl.classList.add('hidden');

    imgEl.src = images[currentGalleryIndex];
    if (counterEl) counterEl.textContent = `${currentGalleryIndex + 1} / ${images.length}`;

    // Thumbnails (Optional but nice)
    if (thumbnailsEl) {
        thumbnailsEl.innerHTML = images.map((img, idx) => `
            <img src="${img}" 
                 class="h-full w-20 object-cover rounded cursor-pointer border-2 ${idx === currentGalleryIndex ? 'border-purple-500' : 'border-transparent opacity-50 hover:opacity-100'}"
                 onclick="setGalleryIndex(${idx})">
        `).join('');
    }
}

function setGalleryIndex(idx) {
    currentGalleryIndex = idx;
    updateGalleryUI();
}


// --- POI MANAGEMENT ---

function addPoiToDay() {
    const poiName = prompt("Nom du point d'intérêt (Col, Lac, Lieu dit...) :");
    if (poiName && poiName.trim() !== '') {
        // Uniformiser en objet pour la consistance
        currentDayPois.push({ name: poiName.trim(), type: 'generic' });
        renderPoiList();
    }
}

function renderPoiList() {
    const container = document.getElementById('day-pois-list');
    if (!container) return;

    container.innerHTML = '';

    if (currentDayPois.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-500 italic">Aucun POI</span>';
        return;
    }

    currentDayPois.forEach((poi, index) => {
        const name = typeof poi === 'string' ? poi : (poi.name || 'POI sans nom');

        const badge = document.createElement('div');
        badge.className = 'inline-flex items-center bg-purple-100 text-purple-800 text-sm px-2 py-1 rounded-full mr-2 mb-2 border border-purple-200';
        badge.innerHTML = `
            <i class="fas fa-map-pin mr-1 text-purple-500 text-xs"></i>
            <span>${name}</span>
            <button type="button" class="ml-2 text-purple-400 hover:text-purple-700 focus:outline-none" 
                    onclick="removePoiFromDay(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(badge);
    });
}

// Make it global so the inline onclick works
window.removePoiFromDay = function (index) {
    if (index >= 0 && index < currentDayPois.length) {
        currentDayPois.splice(index, 1);
        renderPoiList();
    }
};

// --- RESTAURANT MANAGEMENT ---

function addRestaurantToDay() {
    const restoName = prompt("Nom du restaurant / pause :");
    if (restoName && restoName.trim() !== '') {
        currentDayRestaurants.push({ name: restoName.trim(), type: 'restaurant' });
        renderRestaurantList();
    }
}

function renderRestaurantList() {
    const container = document.getElementById('day-restaurants-list');
    if (!container) return;

    container.innerHTML = '';

    if (currentDayRestaurants.length === 0) {
        container.innerHTML = '<span class="text-xs text-gray-500 italic">Aucun restaurant</span>';
        return;
    }

    currentDayRestaurants.forEach((resto, index) => {
        const name = typeof resto === 'string' ? resto : (resto.name || 'Restaurant');

        const badge = document.createElement('div');
        badge.className = 'inline-flex items-center bg-orange-100 text-orange-800 text-sm px-2 py-1 rounded-full mr-2 mb-2 border border-orange-200';
        badge.innerHTML = `
            <i class="fas fa-utensils mr-1 text-orange-500 text-xs"></i>
            <span>${name}</span>
            <button type="button" class="ml-2 text-orange-400 hover:text-orange-700 focus:outline-none" 
                    onclick="removeRestaurantFromDay(${index})">
                <i class="fas fa-times"></i>
            </button>
        `;
        container.appendChild(badge);
    });
}

window.removeRestaurantFromDay = function (index) {
    if (index >= 0 && index < currentDayRestaurants.length) {
        currentDayRestaurants.splice(index, 1);
        renderRestaurantList();
    }
};
