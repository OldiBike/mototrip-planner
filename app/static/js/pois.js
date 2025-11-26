/**
 * Gestion des POIs (Points d'Intérêt) - Interface Admin
 */

// Variables globales
let allPois = [];
let filteredPois = [];
let allPartners = [];
let currentEditingId = null;
let selectedFiles = [];

// Icônes et labels des catégories
const CATEGORY_CONFIG = {
    'monument': { icon: '🏰', label: 'Monument', color: '#8b5cf6' },
    'nature': { icon: '🌲', label: 'Nature', color: '#10b981' },
    'museum': { icon: '🎨', label: 'Musée', color: '#f59e0b' },
    'activity': { icon: '⚡', label: 'Activité', color: '#ef4444' },
    'viewpoint': { icon: '🔭', label: 'Point de vue', color: '#3b82f6' },
    'other': { icon: '📍', label: 'Autre', color: '#6b7280' }
};

// Au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('📍 Module POIs chargé');
    
    initEventListeners();
    loadPartners();
    loadPois();
});

/**
 * Initialise les écouteurs d'événements
 */
function initEventListeners() {
    // Bouton ajouter POI
    document.getElementById('add-poi-btn').addEventListener('click', () => {
        openPoiModal();
    });
    
    // Boutons de la modale
    document.getElementById('close-modal-btn').addEventListener('click', closePoiModal);
    document.getElementById('cancel-btn').addEventListener('click', closePoiModal);
    
    // Soumission du formulaire
    document.getElementById('poi-form').addEventListener('submit', handleSubmitPoi);
    
    // Recherche et filtres
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('city-filter').addEventListener('change', applyFilters);
    document.getElementById('category-filter').addEventListener('change', applyFilters);
    
    // Upload photos
    document.getElementById('poi-photos-input').addEventListener('change', handlePhotosSelected);
    
    // Fermeture modale au clic à l'extérieur
    document.getElementById('poi-modal').addEventListener('click', (e) => {
        if (e.target.id === 'poi-modal') {
            closePoiModal();
        }
    });
}

/**
 * Charge les partenaires
 */
async function loadPartners() {
    try {
        const response = await fetch('/admin/api/partners?active_only=false');
        const data = await response.json();
        
        if (data.success) {
            allPartners = data.partners;
            console.log(`✅ ${allPartners.length} partenaire(s) chargé(s)`);
        }
    } catch (error) {
        console.error('Erreur chargement partenaires:', error);
    }
}

/**
 * Charge tous les POIs
 */
async function loadPois() {
    try {
        const response = await fetch('/admin/api/pois');
        const data = await response.json();
        
        if (data.success) {
            allPois = data.pois;
            filteredPois = [...allPois];
            
            updateStatistics();
            populateCityFilter();
            renderPois();
        } else {
            showToast('Erreur lors du chargement des POIs', 'error');
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
    const total = allPois.length;
    const cities = new Set(allPois.map(p => p.city)).size;
    const withPhotos = allPois.filter(p => p.photos && p.photos.length > 0).length;
    const categories = new Set(allPois.map(p => p.category)).size;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-cities').textContent = cities;
    document.getElementById('stat-with-photos').textContent = withPhotos;
    document.getElementById('stat-categories').textContent = categories;
}

/**
 * Remplit le filtre des villes
 */
function populateCityFilter() {
    const cities = [...new Set(allPois.map(p => p.city))].sort();
    const select = document.getElementById('city-filter');
    
    select.innerHTML = '<option value="">Toutes les villes</option>';
    cities.forEach(city => {
        const count = allPois.filter(p => p.city === city).length;
        const option = document.createElement('option');
        option.value = city;
        option.textContent = `${city} (${count})`;
        select.appendChild(option);
    });
}

/**
 * Applique les filtres
 */
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const cityFilter = document.getElementById('city-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    
    filteredPois = allPois.filter(poi => {
        const matchesSearch = !searchTerm || 
            poi.name.toLowerCase().includes(searchTerm) ||
            poi.city.toLowerCase().includes(searchTerm) ||
            (poi.description && poi.description.toLowerCase().includes(searchTerm));
        
        const matchesCity = !cityFilter || poi.city === cityFilter;
        const matchesCategory = !categoryFilter || poi.category === categoryFilter;
        
        return matchesSearch && matchesCity && matchesCategory;
    });
    
    renderPois();
}

/**
 * Affiche la liste des POIs
 */
function renderPois() {
    const tbody = document.getElementById('pois-table-body');
    const noResultsMsg = document.getElementById('no-pois-message');
    
    if (filteredPois.length === 0) {
        tbody.innerHTML = '';
        noResultsMsg.classList.remove('hidden');
        return;
    }
    
    noResultsMsg.classList.add('hidden');
    
    tbody.innerHTML = filteredPois.map(poi => {
        const config = CATEGORY_CONFIG[poi.category] || CATEGORY_CONFIG['other'];
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4">
                    <div class="flex items-center">
                        <div class="text-2xl mr-3">${config.icon}</div>
                        <div>
                            <div class="text-sm font-medium text-gray-900">
                                ${escapeHtml(poi.name)}
                            </div>
                            ${poi.description ? 
                                `<div class="text-xs text-gray-500 max-w-md truncate">${escapeHtml(poi.description)}</div>` 
                                : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">
                        <i class="fas fa-map-marker-alt text-purple-600 mr-1"></i>
                        ${escapeHtml(poi.city)}
                    </div>
                    ${poi.address ? 
                        `<div class="text-xs text-gray-500">${escapeHtml(poi.address)}</div>` 
                        : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                          style="background-color: ${config.color}20; color: ${config.color};">
                        <span>${config.icon}</span>
                        <span>${config.label}</span>
                    </span>
                </td>
                <td class="px-6 py-4 text-sm text-gray-500">
                    ${poi.website ? 
                        `<div><a href="${escapeHtml(poi.website)}" target="_blank" class="text-blue-600 hover:underline">
                            <i class="fas fa-external-link-alt mr-1"></i>Site web
                        </a></div>` : ''
                    }
                    ${poi.phone ? 
                        `<div><i class="fas fa-phone mr-1"></i>${escapeHtml(poi.phone)}</div>` 
                        : ''
                    }
                    ${poi.photos && poi.photos.length > 0 ? 
                        `<div class="text-xs text-gray-400">
                            <i class="fas fa-images mr-1"></i>${poi.photos.length} photo(s)
                        </div>` : ''
                    }
                    ${!poi.website && !poi.phone && (!poi.photos || poi.photos.length === 0) ? '-' : ''}
                </td>
                <td class="px-6 py-4">
                    ${renderPartnerBadges(poi.partnerIds || [])}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editPoi('${poi.id}')" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button onclick="deletePoi('${poi.id}', '${escapeHtml(poi.name).replace(/'/g, "\\'")}')" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Affiche les badges des partenaires
 */
function renderPartnerBadges(partnerIds) {
    if (!partnerIds || partnerIds.length === 0) {
        return '<span class="text-xs text-gray-400">Aucun</span>';
    }
    
    return partnerIds.map(partnerId => {
        const partner = allPartners.find(p => p.id === partnerId);
        if (!partner) return '';
        
        return `<span class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium mr-1 mb-1"
                      style="background-color: ${partner.color}20; color: ${partner.color};">
            <span>${partner.badgeIcon || '🏷️'}</span>
            <span>${escapeHtml(partner.name)}</span>
        </span>`;
    }).join('');
}

/**
 * Ouvre la modale pour ajouter/éditer un POI
 */
async function openPoiModal(poi = null) {
    currentEditingId = poi?.id || null;
    
    const modal = document.getElementById('poi-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('poi-form');
    
    // Réinitialise le formulaire
    form.reset();
    selectedFiles = [];
    document.getElementById('photos-preview').innerHTML = '';
    
    // Charge les partenaires
    await loadPartnersForPoiModal(poi?.partnerIds || []);
    
    if (poi) {
        // Mode édition
        title.textContent = 'Modifier le POI';
        document.getElementById('poi-id').value = poi.id;
        document.getElementById('poi-name').value = poi.name || '';
        document.getElementById('poi-city').value = poi.city || '';
        document.getElementById('poi-category').value = poi.category || '';
        document.getElementById('poi-address').value = poi.address || '';
        document.getElementById('poi-description').value = poi.description || '';
        document.getElementById('poi-website').value = poi.website || '';
        document.getElementById('poi-phone').value = poi.phone || '';
        document.getElementById('poi-opening-hours').value = poi.openingHours || '';
        document.getElementById('poi-entry-fee').value = poi.entryFee || '';
    } else {
        // Mode création
        title.textContent = 'Nouveau POI';
        document.getElementById('poi-id').value = '';
    }
    
    modal.classList.remove('hidden');
}

/**
 * Charge les partenaires pour le formulaire POI
 */
async function loadPartnersForPoiModal(selectedPartnerIds = []) {
    const container = document.getElementById('poi-partners-checkboxes');
    
    if (allPartners.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">Aucun partenaire disponible</p>';
        return;
    }
    
    container.innerHTML = allPartners.map(partner => `
        <label class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer">
            <input type="checkbox" 
                   name="partners" 
                   value="${partner.id}"
                   ${selectedPartnerIds.includes(partner.id) ? 'checked' : ''}
                   class="w-4 h-4 text-purple-600 rounded focus:ring-purple-500">
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                  style="background-color: ${partner.color}20; color: ${partner.color};">
                <span>${partner.badgeIcon || '🏷️'}</span>
                <span>${escapeHtml(partner.name)}</span>
            </span>
        </label>
    `).join('');
}

/**
 * Ferme la modale
 */
function closePoiModal() {
    const modal = document.getElementById('poi-modal');
    modal.classList.add('hidden');
    currentEditingId = null;
    selectedFiles = [];
}

/**
 * Gestion des photos sélectionnées
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
    
    selectedFiles = [...selectedFiles, ...validFiles];
    displayPhotosPreview();
}

/**
 * Affiche la prévisualisation des photos
 */
function displayPhotosPreview() {
    const previewContainer = document.getElementById('photos-preview');
    previewContainer.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200';
            div.innerHTML = `
                <img src="${e.target.result}" alt="Preview ${index + 1}" class="w-full h-full object-cover">
                <button type="button" 
                        onclick="removeSelectedPhoto(${index})"
                        class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600">
                    <i class="fas fa-times text-xs"></i>
                </button>
            `;
            previewContainer.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * Supprime une photo sélectionnée
 */
function removeSelectedPhoto(index) {
    selectedFiles.splice(index, 1);
    displayPhotosPreview();
}

/**
 * Gère la soumission du formulaire
 */
async function handleSubmitPoi(e) {
    e.preventDefault();
    
    const selectedPartners = Array.from(
        document.querySelectorAll('input[name="partners"]:checked')
    ).map(cb => cb.value);
    
    const formData = new FormData();
    formData.append('name', document.getElementById('poi-name').value.trim());
    formData.append('city', document.getElementById('poi-city').value.trim());
    formData.append('category', document.getElementById('poi-category').value);
    formData.append('address', document.getElementById('poi-address').value.trim());
    formData.append('description', document.getElementById('poi-description').value.trim());
    formData.append('website', document.getElementById('poi-website').value.trim());
    formData.append('phone', document.getElementById('poi-phone').value.trim());
    formData.append('openingHours', document.getElementById('poi-opening-hours').value.trim());
    formData.append('entryFee', document.getElementById('poi-entry-fee').value || 0);
    formData.append('partnerIds', JSON.stringify(selectedPartners));
    
    // Ajoute les photos
    selectedFiles.forEach(file => {
        formData.append('photos', file);
    });
    
    try {
        let response;
        
        if (currentEditingId) {
            // Modification (PUT avec JSON, pas FormData car pas de photos en édition pour l'instant)
            const poiData = {
                name: document.getElementById('poi-name').value.trim(),
                city: document.getElementById('poi-city').value.trim(),
                category: document.getElementById('poi-category').value,
                address: document.getElementById('poi-address').value.trim(),
                description: document.getElementById('poi-description').value.trim(),
                website: document.getElementById('poi-website').value.trim(),
                phone: document.getElementById('poi-phone').value.trim(),
                openingHours: document.getElementById('poi-opening-hours').value.trim(),
                entryFee: document.getElementById('poi-entry-fee').value || null,
                partnerIds: selectedPartners
            };
            
            response = await fetch(`/admin/api/pois/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(poiData)
            });
        } else {
            // Création (POST avec FormData pour gérer les photos)
            response = await fetch('/admin/api/pois', {
                method: 'POST',
                body: formData
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            showToast(currentEditingId ? 'POI modifié avec succès' : 'POI créé avec succès', 'success');
            closePoiModal();
            await loadPois();
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Édite un POI
 */
function editPoi(poiId) {
    const poi = allPois.find(p => p.id === poiId);
    if (poi) {
        openPoiModal(poi);
    }
}

/**
 * Supprime un POI
 */
async function deletePoi(poiId, poiName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${poiName}" ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/api/pois/${poiId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('POI supprimé avec succès', 'success');
            await loadPois();
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

/**
 * Échappe les caractères HTML
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Rend les fonctions disponibles globalement
window.editPoi = editPoi;
window.deletePoi = deletePoi;
window.removeSelectedPhoto = removeSelectedPhoto;
