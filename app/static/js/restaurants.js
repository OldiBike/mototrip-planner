/**
 * Gestion de la banque de restaurants
 */

// Variables globales
let allRestaurants = [];
let filteredRestaurants = [];
let currentEditingId = null;

// Au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🍽️ Module Restaurants chargé');
    
    initEventListeners();
    loadRestaurants();
});

/**
 * Initialise les écouteurs d'événements
 */
function initEventListeners() {
    // Bouton ajouter restaurant
    document.getElementById('add-restaurant-btn').addEventListener('click', () => {
        openRestaurantModal();
    });
    
    // Boutons de la modale
    document.getElementById('close-modal-btn').addEventListener('click', closeRestaurantModal);
    document.getElementById('cancel-btn').addEventListener('click', closeRestaurantModal);
    
    // Soumission du formulaire
    document.getElementById('restaurant-form').addEventListener('submit', handleSubmitRestaurant);
    
    // Recherche et filtres
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('city-filter').addEventListener('change', applyFilters);
    document.getElementById('cuisine-filter').addEventListener('change', applyFilters);
    
    // Fermeture modale au clic à l'extérieur
    document.getElementById('restaurant-modal').addEventListener('click', (e) => {
        if (e.target.id === 'restaurant-modal') {
            closeRestaurantModal();
        }
    });
}

/**
 * Charge tous les restaurants
 */
async function loadRestaurants() {
    try {
        const response = await fetch('/admin/api/restaurants');
        const data = await response.json();
        
        if (data.success) {
            allRestaurants = data.restaurants;
            filteredRestaurants = [...allRestaurants];
            
            updateStatistics();
            populateFilters();
            renderRestaurants();
        } else {
            showToast('Erreur lors du chargement des restaurants', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Met à jour les statistiques
 */
function updateStatistics() {
    const total = allRestaurants.length;
    const used = allRestaurants.filter(r => r.usageStats?.usedCount > 0).length;
    const cities = new Set(allRestaurants.map(r => r.city)).size;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-used').textContent = used;
    document.getElementById('stat-cities').textContent = cities;
}

/**
 * Remplit les filtres avec les valeurs disponibles
 */
function populateFilters() {
    // Filtres par ville
    const cities = [...new Set(allRestaurants.map(r => r.city))].sort();
    const cityFilter = document.getElementById('city-filter');
    cityFilter.innerHTML = '<option value="">Toutes les villes</option>';
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });
    
    // Filtres par type de cuisine
    const cuisines = [...new Set(allRestaurants.map(r => r.cuisineType).filter(Boolean))].sort();
    const cuisineFilter = document.getElementById('cuisine-filter');
    cuisineFilter.innerHTML = '<option value="">Tous les types</option>';
    cuisines.forEach(cuisine => {
        const option = document.createElement('option');
        option.value = cuisine;
        option.textContent = cuisine;
        cuisineFilter.appendChild(option);
    });
}

/**
 * Applique les filtres
 */
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const cityFilter = document.getElementById('city-filter').value;
    const cuisineFilter = document.getElementById('cuisine-filter').value;
    
    filteredRestaurants = allRestaurants.filter(restaurant => {
        const matchesSearch = !searchTerm || 
            restaurant.name.toLowerCase().includes(searchTerm) ||
            (restaurant.address && restaurant.address.toLowerCase().includes(searchTerm));
        
        const matchesCity = !cityFilter || restaurant.city === cityFilter;
        const matchesCuisine = !cuisineFilter || restaurant.cuisineType === cuisineFilter;
        
        return matchesSearch && matchesCity && matchesCuisine;
    });
    
    renderRestaurants();
}

/**
 * Affiche la liste des restaurants
 */
function renderRestaurants() {
    const tbody = document.getElementById('restaurants-table-body');
    const noResultsMsg = document.getElementById('no-restaurants-message');
    
    if (filteredRestaurants.length === 0) {
        tbody.innerHTML = '';
        noResultsMsg.classList.remove('hidden');
        return;
    }
    
    noResultsMsg.classList.add('hidden');
    
    tbody.innerHTML = filteredRestaurants.map(restaurant => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="text-sm font-medium text-gray-900">
                        ${restaurant.name}
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${restaurant.city}</div>
                ${restaurant.address ? `<div class="text-xs text-gray-500">${restaurant.address}</div>` : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${restaurant.cuisineType ? 
                    `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        ${restaurant.cuisineType}
                    </span>` : 
                    '<span class="text-gray-400 text-sm">-</span>'
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${restaurant.contact?.phone ? 
                    `<div><i class="fas fa-phone mr-1"></i>${restaurant.contact.phone}</div>` : ''
                }
                ${restaurant.contact?.website ? 
                    `<div><a href="${restaurant.contact.website}" target="_blank" class="text-blue-600 hover:underline">
                        <i class="fas fa-external-link-alt mr-1"></i>Site web
                    </a></div>` : ''
                }
                ${!restaurant.contact?.phone && !restaurant.contact?.website ? '-' : ''}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                ${restaurant.usageStats?.usedCount > 0 ?
                    `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${restaurant.usageStats.usedCount} voyage${restaurant.usageStats.usedCount > 1 ? 's' : ''}
                    </span>` :
                    '<span class="text-gray-400 text-sm">Non utilisé</span>'
                }
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onclick="editRestaurant('${restaurant.id}')" 
                        class="text-blue-600 hover:text-blue-900 mr-3">
                    <i class="fas fa-edit"></i> Modifier
                </button>
                <button onclick="deleteRestaurant('${restaurant.id}', '${restaurant.name.replace(/'/g, "\\'")}')" 
                        class="text-red-600 hover:text-red-900">
                    <i class="fas fa-trash"></i> Supprimer
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Ouvre la modale pour ajouter/éditer un restaurant
 */
function openRestaurantModal(restaurant = null) {
    currentEditingId = restaurant?.id || null;
    
    const modal = document.getElementById('restaurant-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('restaurant-form');
    
    // Réinitialise le formulaire
    form.reset();
    
    if (restaurant) {
        // Mode édition
        title.textContent = 'Modifier le Restaurant';
        document.getElementById('restaurant-id').value = restaurant.id;
        document.getElementById('restaurant-name').value = restaurant.name || '';
        document.getElementById('restaurant-city').value = restaurant.city || '';
        document.getElementById('restaurant-address').value = restaurant.address || '';
        document.getElementById('restaurant-cuisine').value = restaurant.cuisineType || '';
        document.getElementById('restaurant-phone').value = restaurant.contact?.phone || '';
        document.getElementById('restaurant-website').value = restaurant.contact?.website || '';
    } else {
        // Mode création
        title.textContent = 'Nouveau Restaurant';
        document.getElementById('restaurant-id').value = '';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Ferme la modale
 */
function closeRestaurantModal() {
    const modal = document.getElementById('restaurant-modal');
    modal.classList.add('hidden');
    currentEditingId = null;
}

/**
 * Gère la soumission du formulaire
 */
async function handleSubmitRestaurant(e) {
    e.preventDefault();
    
    const restaurantData = {
        name: document.getElementById('restaurant-name').value.trim(),
        city: document.getElementById('restaurant-city').value.trim(),
        address: document.getElementById('restaurant-address').value.trim(),
        cuisineType: document.getElementById('restaurant-cuisine').value.trim(),
        contact: {
            phone: document.getElementById('restaurant-phone').value.trim(),
            website: document.getElementById('restaurant-website').value.trim()
        }
    };
    
    try {
        let response;
        
        if (currentEditingId) {
            // Mise à jour
            response = await fetch(`/admin/api/restaurants/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(restaurantData)
            });
        } else {
            // Création
            response = await fetch('/admin/api/restaurants', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(restaurantData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            showToast(currentEditingId ? 'Restaurant modifié avec succès' : 'Restaurant ajouté avec succès', 'success');
            closeRestaurantModal();
            await loadRestaurants();
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Édite un restaurant
 */
function editRestaurant(restaurantId) {
    const restaurant = allRestaurants.find(r => r.id === restaurantId);
    if (restaurant) {
        openRestaurantModal(restaurant);
    }
}

/**
 * Supprime un restaurant
 */
async function deleteRestaurant(restaurantId, restaurantName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${restaurantName}" ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/api/restaurants/${restaurantId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Restaurant supprimé avec succès', 'success');
            await loadRestaurants();
        } else {
            showToast(data.error || 'Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Affiche un message toast
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    toastMessage.textContent = message;
    
    // Couleur selon le type
    if (type === 'error') {
        toast.classList.remove('bg-green-500');
        toast.classList.add('bg-red-500');
    } else {
        toast.classList.remove('bg-red-500');
        toast.classList.add('bg-green-500');
    }
    
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.remove('opacity-0'), 10);
    
    setTimeout(() => {
        toast.classList.add('opacity-0');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
}

// Rend les fonctions disponibles globalement
window.editRestaurant = editRestaurant;
window.deleteRestaurant = deleteRestaurant;
