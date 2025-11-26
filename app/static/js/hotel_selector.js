/**
 * Gestion du sélecteur d'hôtels dans le formulaire d'ajout d'étape
 * Intégration avec la banque d'hôtels
 */

// Variable globale pour stocker les hôtels
let availableHotels = [];
let selectedHotelId = null;

/**
 * Initialise le sélecteur d'hôtels
 */
async function initHotelSelector() {
    console.log('🏨 Initialisation du sélecteur d\'hôtels...');
    
    // Charge les hôtels depuis l'API
    await loadHotelsForDropdown();
    
    // Configure les event listeners
    setupHotelSelectorListeners();
}

/**
 * Charge tous les hôtels depuis l'API avec filtrage optionnel par partenaires
 * @param {Array} partnerIds - IDs des partenaires pour filtrer (optionnel)
 */
async function loadHotelsForDropdown(partnerIds = null) {
    try {
        // ⭐ NOUVEAU : Construit l'URL avec filtrage par partenaires si fourni
        let url = '/admin/api/hotels';
        if (partnerIds && partnerIds.length > 0) {
            const partnersParam = partnerIds.join(',');
            url += `?partners=${partnersParam}`;
            console.log(`🔍 Filtrage hôtels par partenaires: ${partnersParam}`);
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success) {
            availableHotels = data.hotels;
            const filterInfo = partnerIds && partnerIds.length > 0 
                ? ` (filtrés par ${partnerIds.length} partenaire${partnerIds.length > 1 ? 's' : ''})` 
                : '';
            console.log(`✅ ${availableHotels.length} hôtel(s) chargé(s)${filterInfo}`);
            populateHotelDropdown();
        } else {
            console.error('❌ Erreur chargement hôtels:', data.error);
        }
    } catch (error) {
        console.error('❌ Erreur lors du chargement des hôtels:', error);
    }
}

/**
 * Remplit le dropdown avec les hôtels disponibles
 */
function populateHotelDropdown() {
    const select = document.getElementById('day-hotel-select');
    if (!select) {
        console.warn('⚠️ Dropdown day-hotel-select non trouvé');
        return;
    }
    
    // Vide le dropdown
    select.innerHTML = '<option value="">-- Choisir un hôtel existant --</option>';
    
    // Trie les hôtels par ville puis par nom
    const sortedHotels = [...availableHotels].sort((a, b) => {
        if (a.city !== b.city) {
            return a.city.localeCompare(b.city);
        }
        return a.name.localeCompare(b.name);
    });
    
    // Ajoute chaque hôtel
    sortedHotels.forEach(hotel => {
        const option = document.createElement('option');
        option.value = hotel.id;
        
        // Texte affiché : "Nom - Ville" (SANS les prix)
        option.textContent = `${hotel.name} - ${hotel.city}`;
        
        // Stocke les données complètes dans un data attribute
        option.dataset.hotelData = JSON.stringify(hotel);
        
        select.appendChild(option);
    });
    
    console.log(`✅ Dropdown rempli avec ${sortedHotels.length} hôtel(s)`);
}

/**
 * Configure les event listeners pour le sélecteur
 */
function setupHotelSelectorListeners() {
    const select = document.getElementById('day-hotel-select');
    const manualInput = document.getElementById('day-hotel-name');
    const priceDoubleInput = document.getElementById('day-price-double');
    const priceSoloInput = document.getElementById('day-price-solo');
    
    if (!select) return;
    
    // Event : Quand un hôtel est sélectionné dans le dropdown
    select.addEventListener('change', (e) => {
        const selectedOption = e.target.selectedOptions[0];
        
        if (selectedOption && selectedOption.value) {
            // Un hôtel a été sélectionné
            try {
                const hotel = JSON.parse(selectedOption.dataset.hotelData);
                selectedHotelId = hotel.id;
                
                // Pré-remplit UNIQUEMENT le nom (PAS les prix)
                if (manualInput) {
                    manualInput.value = hotel.name;
                    manualInput.disabled = true;
                    manualInput.classList.add('bg-gray-100');
                }
                
                // ❌ NE PAS pré-remplir les prix - ils doivent être saisis manuellement selon les dates
                // Les prix varient selon les dates du voyage !
                
                console.log(`✅ Hôtel sélectionné: ${hotel.name} (ID: ${hotel.id})`);
                
            } catch (error) {
                console.error('❌ Erreur parsing données hôtel:', error);
            }
        } else {
            // Aucun hôtel sélectionné - réactive la saisie manuelle
            selectedHotelId = null;
            
            if (manualInput) {
                manualInput.value = '';
                manualInput.disabled = false;
                manualInput.classList.remove('bg-gray-100');
            }
            
            console.log('ℹ️ Saisie manuelle réactivée');
        }
    });
    
    // Event : Si l'utilisateur modifie manuellement le nom, désélectionne le dropdown
    if (manualInput) {
        manualInput.addEventListener('input', () => {
            if (manualInput.value && select.value) {
                // L'utilisateur a modifié le nom alors qu'un hôtel était sélectionné
                // On réinitialise le dropdown
                select.value = '';
                selectedHotelId = null;
                console.log('ℹ️ Dropdown réinitialisé (saisie manuelle détectée)');
            }
        });
    }
}

/**
 * Réinitialise le sélecteur (lors de l'ouverture de la modale)
 */
function resetHotelSelector() {
    selectedHotelId = null;
    
    const select = document.getElementById('day-hotel-select');
    const manualInput = document.getElementById('day-hotel-name');
    
    if (select) {
        select.value = '';
    }
    
    if (manualInput) {
        manualInput.disabled = false;
        manualInput.classList.remove('bg-gray-100');
    }
}

/**
 * Récupère l'ID de l'hôtel sélectionné (null si saisie manuelle)
 */
function getSelectedHotelId() {
    return selectedHotelId;
}

/**
 * Pré-sélectionne un hôtel dans le dropdown (mode édition)
 */
function preselectHotel(hotelId) {
    if (!hotelId) return;
    
    const select = document.getElementById('day-hotel-select');
    if (!select) return;
    
    // Cherche l'hôtel dans la liste
    const hotel = availableHotels.find(h => h.id === hotelId);
    if (!hotel) {
        console.warn(`⚠️ Hôtel ${hotelId} non trouvé dans la banque`);
        return;
    }
    
    // Sélectionne dans le dropdown
    select.value = hotelId;
    
    // Déclenche l'event change pour pré-remplir les champs
    select.dispatchEvent(new Event('change'));
    
    console.log(`✅ Hôtel pré-sélectionné: ${hotel.name}`);
}

// Initialise quand le DOM est prêt
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHotelSelector);
} else {
    // DOM déjà chargé
    initHotelSelector();
}

// Exporte les fonctions pour utilisation externe
window.hotelSelector = {
    reset: resetHotelSelector,
    getSelectedHotelId: getSelectedHotelId,
    preselect: preselectHotel,
    reload: loadHotelsForDropdown
};
