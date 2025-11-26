/**
 * Gestion des Partenaires - Interface Admin
 */

// Variables globales
let allPartners = [];
let filteredPartners = [];
let currentEditingId = null;

// Au chargement de la page
document.addEventListener('DOMContentLoaded', () => {
    console.log('🤝 Module Partenaires chargé');
    
    initEventListeners();
    loadPartners();
});

/**
 * Initialise les écouteurs d'événements
 */
function initEventListeners() {
    // Bouton ajouter partenaire
    document.getElementById('add-partner-btn').addEventListener('click', () => {
        openPartnerModal();
    });
    
    // Boutons de la modale
    document.getElementById('close-modal-btn').addEventListener('click', closePartnerModal);
    document.getElementById('cancel-btn').addEventListener('click', closePartnerModal);
    
    // Soumission du formulaire
    document.getElementById('partner-form').addEventListener('submit', handleSubmitPartner);
    
    // Recherche et filtres
    document.getElementById('search-input').addEventListener('input', applyFilters);
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    
    // Fermeture modale au clic à l'extérieur
    document.getElementById('partner-modal').addEventListener('click', (e) => {
        if (e.target.id === 'partner-modal') {
            closePartnerModal();
        }
    });
    
    // Auto-génération du slug
    document.getElementById('partner-name').addEventListener('input', (e) => {
        const slugInput = document.getElementById('partner-slug');
        if (!currentEditingId && !slugInput.value) {
            const slug = e.target.value
                .toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
            slugInput.value = slug;
        }
        updateBadgePreview();
    });
    
    // Synchronisation couleur
    document.getElementById('partner-color').addEventListener('input', (e) => {
        document.getElementById('partner-color-text').value = e.target.value;
        updateBadgePreview();
    });
    
    document.getElementById('partner-color-text').addEventListener('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-F]{6}$/i.test(color)) {
            document.getElementById('partner-color').value = color;
            updateBadgePreview();
        }
    });
    
    // Mise à jour prévisualisation badge
    document.getElementById('partner-badge-icon').addEventListener('input', updateBadgePreview);
}

/**
 * Met à jour la prévisualisation du badge
 */
function updateBadgePreview() {
    const name = document.getElementById('partner-name').value || 'Nom du partenaire';
    const icon = document.getElementById('partner-badge-icon').value || '🤝';
    const color = document.getElementById('partner-color').value || '#3B82F6';
    
    const preview = document.getElementById('badge-preview');
    const previewIcon = document.getElementById('preview-icon');
    const previewName = document.getElementById('preview-name');
    
    previewIcon.textContent = icon;
    previewName.textContent = name;
    preview.style.backgroundColor = color + '20';
    preview.style.color = color;
}

/**
 * Charge tous les partenaires
 */
async function loadPartners() {
    try {
        const response = await fetch('/admin/api/partners?active_only=false');
        const data = await response.json();
        
        if (data.success) {
            allPartners = data.partners;
            filteredPartners = [...allPartners];
            
            updateStatistics();
            renderPartners();
        } else {
            showToast('Erreur lors du chargement des partenaires', 'error');
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
    const total = allPartners.length;
    const active = allPartners.filter(p => p.isActive !== false).length;
    const inactive = total - active;
    
    document.getElementById('stat-total').textContent = total;
    document.getElementById('stat-active').textContent = active;
    document.getElementById('stat-inactive').textContent = inactive;
}

/**
 * Applique les filtres
 */
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const statusFilter = document.getElementById('status-filter').value;
    
    filteredPartners = allPartners.filter(partner => {
        const matchesSearch = !searchTerm || 
            partner.name.toLowerCase().includes(searchTerm) ||
            partner.slug.toLowerCase().includes(searchTerm) ||
            (partner.description && partner.description.toLowerCase().includes(searchTerm));
        
        const matchesStatus = !statusFilter || 
            (statusFilter === 'active' && partner.isActive !== false) ||
            (statusFilter === 'inactive' && partner.isActive === false);
        
        return matchesSearch && matchesStatus;
    });
    
    renderPartners();
}

/**
 * Affiche la liste des partenaires
 */
function renderPartners() {
    const tbody = document.getElementById('partners-table-body');
    const noResultsMsg = document.getElementById('no-partners-message');
    
    if (filteredPartners.length === 0) {
        tbody.innerHTML = '';
        noResultsMsg.classList.remove('hidden');
        return;
    }
    
    noResultsMsg.classList.add('hidden');
    
    tbody.innerHTML = filteredPartners.map(partner => {
        const isActive = partner.isActive !== false;
        
        return `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4" style="width: 200px; max-width: 200px; overflow: hidden;">
                    <div class="flex items-center">
                        <div class="text-lg mr-2 flex-shrink-0">${partner.badgeIcon || '🤝'}</div>
                        <div class="min-w-0 flex-1 overflow-hidden">
                            <div class="text-sm font-medium text-gray-900 truncate">
                                ${escapeHtml(partner.name)}
                            </div>
                            ${partner.description ? 
                                `<div class="text-xs text-gray-500 truncate">${escapeHtml(partner.description)}</div>` 
                                : ''}
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap" style="width: 150px;">
                    <code class="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded truncate">${escapeHtml(partner.slug)}</code>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ${partner.website ? 
                        `<div><a href="${escapeHtml(partner.website)}" target="_blank" class="text-blue-600 hover:underline">
                            <i class="fas fa-external-link-alt mr-1"></i>Site web
                        </a></div>` : ''
                    }
                    ${partner.logo ? 
                        `<div class="text-xs text-gray-400">
                            <i class="fas fa-image mr-1"></i>Logo disponible
                        </div>` : ''
                    }
                    ${!partner.website && !partner.logo ? '-' : ''}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${isActive ?
                        `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            <i class="fas fa-check-circle mr-1"></i>Actif
                        </span>` :
                        `<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            <i class="fas fa-pause-circle mr-1"></i>Inactif
                        </span>`
                    }
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onclick="editPartner('${partner.id}')" 
                            class="text-blue-600 hover:text-blue-900 mr-3">
                        <i class="fas fa-edit"></i> Modifier
                    </button>
                    <button onclick="deletePartner('${partner.id}', '${escapeHtml(partner.name).replace(/'/g, "\\'")}')" 
                            class="text-red-600 hover:text-red-900">
                        <i class="fas fa-trash"></i> Supprimer
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Ouvre la modale pour ajouter/éditer un partenaire
 */
function openPartnerModal(partner = null) {
    currentEditingId = partner?.id || null;
    
    const modal = document.getElementById('partner-modal');
    const title = document.getElementById('modal-title');
    const form = document.getElementById('partner-form');
    
    // Réinitialise le formulaire
    form.reset();
    
    if (partner) {
        // Mode édition
        title.textContent = 'Modifier le Partenaire';
        document.getElementById('partner-id').value = partner.id;
        document.getElementById('partner-name').value = partner.name || '';
        document.getElementById('partner-slug').value = partner.slug || '';
        document.getElementById('partner-description').value = partner.description || '';
        document.getElementById('partner-color').value = partner.color || '#3B82F6';
        document.getElementById('partner-color-text').value = partner.color || '#3B82F6';
        document.getElementById('partner-badge-icon').value = partner.badgeIcon || '';
        document.getElementById('partner-logo').value = partner.logo || '';
        document.getElementById('partner-website').value = partner.website || '';
        document.getElementById('partner-active').checked = partner.isActive !== false;
    } else {
        // Mode création
        title.textContent = 'Nouveau Partenaire';
        document.getElementById('partner-id').value = '';
        document.getElementById('partner-color').value = '#3B82F6';
        document.getElementById('partner-color-text').value = '#3B82F6';
        document.getElementById('partner-active').checked = true;
    }
    
    updateBadgePreview();
    modal.classList.remove('hidden');
}

/**
 * Ferme la modale
 */
function closePartnerModal() {
    const modal = document.getElementById('partner-modal');
    modal.classList.add('hidden');
    currentEditingId = null;
}

/**
 * Gère la soumission du formulaire
 */
async function handleSubmitPartner(e) {
    e.preventDefault();
    
    const partnerData = {
        name: document.getElementById('partner-name').value.trim(),
        slug: document.getElementById('partner-slug').value.trim(),
        description: document.getElementById('partner-description').value.trim(),
        color: document.getElementById('partner-color').value,
        badgeIcon: document.getElementById('partner-badge-icon').value.trim(),
        logo: document.getElementById('partner-logo').value.trim(),
        website: document.getElementById('partner-website').value.trim(),
        isActive: document.getElementById('partner-active').checked
    };
    
    try {
        let response;
        
        if (currentEditingId) {
            // Mise à jour
            response = await fetch(`/admin/api/partners/${currentEditingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partnerData)
            });
        } else {
            // Création
            response = await fetch('/admin/api/partners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(partnerData)
            });
        }
        
        const data = await response.json();
        
        if (data.success) {
            showToast(currentEditingId ? 'Partenaire modifié avec succès' : 'Partenaire créé avec succès', 'success');
            closePartnerModal();
            await loadPartners();
        } else {
            showToast(data.error || 'Erreur lors de l\'enregistrement', 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast('Erreur de connexion', 'error');
    }
}

/**
 * Édite un partenaire
 */
function editPartner(partnerId) {
    const partner = allPartners.find(p => p.id === partnerId);
    if (partner) {
        openPartnerModal(partner);
    }
}

/**
 * Supprime un partenaire
 */
async function deletePartner(partnerId, partnerName) {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer "${partnerName}" ?\n\nCette action est irréversible.`)) {
        return;
    }
    
    try {
        const response = await fetch(`/admin/api/partners/${partnerId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Partenaire supprimé avec succès', 'success');
            await loadPartners();
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
window.editPartner = editPartner;
window.deletePartner = deletePartner;
