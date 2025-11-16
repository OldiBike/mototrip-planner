/**
 * Gestion de la Banque de Médias (Cols & Routes)
 * - Upload avec Ctrl+V, drag & drop, et sélection fichier
 * - Système de tagging
 * - Filtrage et tri
 * - Assignation aux voyages
 */

// ============================================
// VARIABLES GLOBALES
// ============================================

let allMedia = [];
let selectedFiles = [];
let currentMediaId = null;
let selectionMode = false;
let selectedMedia = new Set();

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎬 Initialisation de la Banque de Médias');
    
    // Charge les médias
    loadMedia();
    
    // Event listeners
    setupEventListeners();
    
    // Support Ctrl+V global
    setupPasteSupport();
});

// ============================================
// CHARGEMENT DES MÉDIAS
// ============================================

async function loadMedia() {
    try {
        const response = await fetch('/admin/api/media');
        const data = await response.json();
        
        if (data.success) {
            allMedia = data.media;
            displayMedia(allMedia);
            updateStats();
            populateTagFilter();
        } else {
            throw new Error(data.error || 'Erreur lors du chargement');
        }
    } catch (error) {
        console.error('❌ Erreur:', error);
        showNotification('Erreur lors du chargement des médias', 'error');
    }
}

// ============================================
// AFFICHAGE DES MÉDIAS
// ============================================

function displayMedia(media) {
    const container = document.getElementById('mediaContainer');
    const emptyState = document.getElementById('emptyState');
    
    if (!media || media.length === 0) {
        container.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    container.classList.remove('hidden');
    
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            ${media.map(m => createMediaCard(m)).join('')}
        </div>
    `;
}

function createMediaCard(media) {
    const typeIcon = media.type === 'col' ? 'fa-mountain' : 'fa-road';
    const typeColor = media.type === 'col' ? 'blue' : 'green';
    const tagsHtml = (media.tags || []).slice(0, 2).map(tag => 
        `<span class="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">${tag}</span>`
    ).join(' ');
    
    const assignedCount = (media.assignedTrips || []).length;
    const isSelected = selectedMedia.has(media.id);
    
    // En mode sélection, on change le comportement du clic
    const onclickAction = selectionMode 
        ? `toggleMediaSelection('${media.id}', event)` 
        : `showMediaDetails('${media.id}')`;
    
    return `
        <div class="media-card bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden cursor-pointer animate-fade-in ${isSelected ? 'selected' : ''}"
             onclick="${onclickAction}" data-media-id="${media.id}">
            <!-- Image -->
            <div class="aspect-square bg-gray-100 relative overflow-hidden">
                ${selectionMode ? `
                <!-- Checkbox en mode sélection -->
                <div class="selection-checkbox">
                    <input type="checkbox" 
                           ${isSelected ? 'checked' : ''}
                           onclick="event.stopPropagation(); toggleMediaSelection('${media.id}', event)">
                </div>
                ` : ''}
                
                <img src="${media.downloadURL}" 
                     alt="${media.fileName}"
                     class="w-full h-full object-cover"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Crect fill=\'%23ddd\' width=\'100\' height=\'100\'/%3E%3Ctext fill=\'%23999\' x=\'50%25\' y=\'50%25\' dominant-baseline=\'middle\' text-anchor=\'middle\' font-size=\'14\'%3EImage%3C/text%3E%3C/svg%3E'">
                
                <!-- Badge Type -->
                <div class="absolute ${selectionMode ? 'top-2 right-2' : 'top-2 left-2'}">
                    <span class="inline-flex items-center px-2.5 py-1 bg-${typeColor}-600 text-white text-xs font-medium rounded-full shadow">
                        <i class="fas ${typeIcon} mr-1"></i>
                        ${media.type === 'col' ? 'Col' : 'Route'}
                    </span>
                </div>
                
                <!-- Badge Assignation -->
                ${assignedCount > 0 && !selectionMode ? `
                <div class="absolute top-2 right-2">
                    <span class="inline-flex items-center px-2.5 py-1 bg-purple-600 text-white text-xs font-medium rounded-full shadow">
                        <i class="fas fa-link mr-1"></i>
                        ${assignedCount}
                    </span>
                </div>
                ` : ''}
            </div>
            
            <!-- Infos -->
            <div class="p-4">
                <div class="flex flex-wrap gap-1 min-h-[28px]">
                    ${tagsHtml}
                    ${(media.tags || []).length > 2 ? `<span class="text-xs text-gray-500">+${(media.tags || []).length - 2}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ============================================
// STATISTIQUES
// ============================================

function updateStats() {
    const colsCount = allMedia.filter(m => m.type === 'col').length;
    const routesCount = allMedia.filter(m => m.type === 'route').length;
    
    // Collecte tous les tags uniques
    const allTags = new Set();
    allMedia.forEach(m => {
        (m.tags || []).forEach(tag => allTags.add(tag));
    });
    
    document.getElementById('statTotalMedia').textContent = allMedia.length;
    document.getElementById('statCols').textContent = colsCount;
    document.getElementById('statRoutes').textContent = routesCount;
    document.getElementById('statTags').textContent = allTags.size;
}

// ============================================
// FILTRES
// ============================================

function populateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    const allTags = new Set();
    
    allMedia.forEach(m => {
        (m.tags || []).forEach(tag => allTags.add(tag));
    });
    
    // Garde l'option "Tous les tags" et ajoute les tags triés
    tagFilter.innerHTML = '<option value="">Tous les tags</option>';
    Array.from(allTags).sort().forEach(tag => {
        tagFilter.innerHTML += `<option value="${tag}">${tag}</option>`;
    });
}

function applyFilters() {
    const typeFilter = document.getElementById('typeFilter').value;
    const tagFilter = document.getElementById('tagFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    let filtered = [...allMedia];
    
    // Filtre par type
    if (typeFilter) {
        filtered = filtered.filter(m => m.type === typeFilter);
    }
    
    // Filtre par tag
    if (tagFilter) {
        filtered = filtered.filter(m => (m.tags || []).includes(tagFilter));
    }
    
    // Tri
    if (sortBy === 'date') {
        filtered.sort((a, b) => {
            const dateA = a.uploadedAt?.seconds || 0;
            const dateB = b.uploadedAt?.seconds || 0;
            return dateB - dateA; // Plus récent en premier
        });
    } else if (sortBy === 'type') {
        filtered.sort((a, b) => a.type.localeCompare(b.type));
    } else if (sortBy === 'usage') {
        filtered.sort((a, b) => {
            const usageA = (a.assignedTrips || []).length;
            const usageB = (b.assignedTrips || []).length;
            return usageB - usageA; // Plus utilisé en premier
        });
    }
    
    displayMedia(filtered);
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Filtres
    document.getElementById('typeFilter').addEventListener('change', applyFilters);
    document.getElementById('tagFilter').addEventListener('change', applyFilters);
    document.getElementById('sortBy').addEventListener('change', applyFilters);
    
    // Input fichier
    document.getElementById('mediaFiles').addEventListener('change', handleFileSelect);
    
    // Drag & Drop
    const dropZone = document.getElementById('dropZone');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'), false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'), false);
    });
    
    dropZone.addEventListener('drop', handleDrop, false);
}

function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ============================================
// SUPPORT CTRL+V (PASTE)
// ============================================

function setupPasteSupport() {
    document.addEventListener('paste', (e) => {
        // Vérifie si on est dans le modal d'upload
        const uploadModal = document.getElementById('uploadModal');
        if (uploadModal.classList.contains('hidden')) {
            // Si modal fermé, on l'ouvre
            openUploadModal();
        }
        
        // Traite les items collés
        const items = e.clipboardData?.items;
        if (!items) return;
        
        const files = [];
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const file = item.getAsFile();
                if (file) files.push(file);
            }
        }
        
        if (files.length > 0) {
            e.preventDefault();
            handleFiles(files);
            showNotification(`${files.length} image(s) collée(s) !`, 'success');
        }
    });
}

// ============================================
// GESTION DES FICHIERS
// ============================================

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    handleFiles(files);
}

function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = Array.from(dt.files).filter(f => f.type.startsWith('image/'));
    
    if (files.length > 0) {
        handleFiles(files);
    }
}

function handleFiles(files) {
    // Validation
    const validFiles = files.filter(f => {
        if (!f.type.startsWith('image/')) {
            showNotification(`${f.name} n'est pas une image`, 'error');
            return false;
        }
        if (f.size > 5 * 1024 * 1024) { // 5MB
            showNotification(`${f.name} est trop volumineux (max 5MB)`, 'error');
            return false;
        }
        return true;
    });
    
    if (validFiles.length === 0) return;
    
    selectedFiles = validFiles;
    displayPreview(validFiles);
    
    // Affiche la section d'upload
    document.getElementById('uploadSection').classList.remove('hidden');
    document.getElementById('photoCount').textContent = validFiles.length;
    document.getElementById('uploadCount').textContent = `(${validFiles.length})`;
    document.getElementById('btnUpload').disabled = false;
}

function displayPreview(files) {
    const grid = document.getElementById('previewGrid');
    grid.innerHTML = '';
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'relative aspect-square bg-gray-100 rounded-lg overflow-hidden';
            div.innerHTML = `
                <img src="${e.target.result}" class="w-full h-full object-cover">
                <button onclick="removeFile(${index})" 
                        class="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700 transition">
                    <i class="fas fa-times text-xs"></i>
                </button>
            `;
            grid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('btnUpload').disabled = true;
    } else {
        displayPreview(selectedFiles);
        document.getElementById('photoCount').textContent = selectedFiles.length;
        document.getElementById('uploadCount').textContent = `(${selectedFiles.length})`;
    }
}

// ============================================
// UPLOAD DES MÉDIAS
// ============================================

async function uploadMedia() {
    if (selectedFiles.length === 0) return;
    
    const mediaType = document.querySelector('input[name="mediaType"]:checked').value;
    const tagsInput = document.getElementById('mediaTags').value;
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    
    const btnUpload = document.getElementById('btnUpload');
    const progressDiv = document.getElementById('uploadProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    btnUpload.disabled = true;
    progressDiv.classList.remove('hidden');
    
    try {
        const formData = new FormData();
        selectedFiles.forEach(file => formData.append('photos', file));
        formData.append('type', mediaType);
        formData.append('tags', tags.join(','));
        
        const response = await fetch('/admin/api/media', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`${data.uploaded_count} média(s) uploadé(s) avec succès !`, 'success');
            closeUploadModal();
            loadMedia(); // Recharge la liste
        } else {
            throw new Error(data.error || 'Erreur lors de l\'upload');
        }
    } catch (error) {
        console.error('❌ Erreur upload:', error);
        showNotification('Erreur lors de l\'upload: ' + error.message, 'error');
        btnUpload.disabled = false;
    } finally {
        progressDiv.classList.add('hidden');
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
    }
}

// ============================================
// DÉTAILS DU MÉDIA
// ============================================

async function showMediaDetails(mediaId) {
    currentMediaId = mediaId;
    const media = allMedia.find(m => m.id === mediaId);
    if (!media) return;
    
    const typeIcon = media.type === 'col' ? 'fa-mountain' : 'fa-road';
    const typeColor = media.type === 'col' ? 'blue' : 'green';
    const typeLabel = media.type === 'col' ? 'Col' : 'Route';
    
    const assignedCount = (media.assignedTrips || []).length;
    
    const content = document.getElementById('mediaDetailsContent');
    content.innerHTML = `
        <!-- Image -->
        <div class="bg-gray-100 rounded-lg overflow-hidden">
            <img src="${media.downloadURL}" alt="${media.fileName}" class="w-full max-h-96 object-contain">
        </div>
        
        <!-- Informations -->
        <div class="grid grid-cols-2 gap-4">
            <div>
                <p class="text-sm font-medium text-gray-500 mb-1">Type</p>
                <p class="flex items-center text-${typeColor}-600 font-semibold">
                    <i class="fas ${typeIcon} mr-2"></i>
                    ${typeLabel}
                </p>
            </div>
            <div>
                <p class="text-sm font-medium text-gray-500 mb-1">Fichier</p>
                <p class="text-gray-900 truncate">${media.fileName}</p>
            </div>
        </div>
        
        <!-- Tags avec édition -->
        <div>
            <p class="text-sm font-medium text-gray-700 mb-2">Tags</p>
            <div id="tagsInputContainer" 
                 class="flex flex-wrap gap-2 items-center px-3 py-2 border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent min-h-[42px] cursor-text"
                 onclick="document.getElementById('tagInput').focus()">
                <!-- Les tags s'afficheront ici dynamiquement -->
                <input type="text" 
                       id="tagInput" 
                       placeholder="Ajouter un tag..."
                       class="flex-1 min-w-[120px] outline-none border-none text-sm bg-transparent"
                       onkeydown="handleTagInput(event)"
                       oninput="handleTagInputChange(event)">
            </div>
            <p class="text-xs text-gray-500 mt-2">
                <i class="fas fa-info-circle mr-1"></i>
                Tapez un tag et appuyez sur virgule ou Entrée pour l'ajouter
            </p>
        </div>
        
        <!-- Utilisation -->
        <div class="bg-purple-50 rounded-lg p-4">
            <p class="text-sm font-medium text-purple-900 mb-2">
                <i class="fas fa-link mr-2"></i>
                Utilisation dans les voyages
            </p>
            <p class="text-2xl font-bold text-purple-600">${assignedCount} voyage${assignedCount > 1 ? 's' : ''}</p>
        </div>
    `;
    
    // Affiche les tags existants
    renderTags(media.tags || []);
    
    document.getElementById('mediaDetailsModal').classList.remove('hidden');
}

// ============================================
// ÉDITION DES TAGS (SYSTÈME INTERACTIF)
// ============================================

let currentTags = [];

function renderTags(tags) {
    currentTags = tags || [];
    const container = document.getElementById('tagsInputContainer');
    const input = document.getElementById('tagInput');
    
    if (!container || !input) return;
    
    // Vide le conteneur sauf l'input
    container.innerHTML = '';
    
    // Ajoute chaque tag comme une bulle
    currentTags.forEach(tag => {
        const tagBubble = document.createElement('span');
        tagBubble.className = 'inline-flex items-center px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm animate-fade-in';
        tagBubble.innerHTML = `
            ${tag}
            <button onclick="event.stopPropagation(); removeTag('${tag}')" 
                    class="ml-2 text-indigo-500 hover:text-indigo-700 focus:outline-none">
                <i class="fas fa-times text-xs"></i>
            </button>
        `;
        container.appendChild(tagBubble);
    });
    
    // Réajoute l'input à la fin
    container.appendChild(input);
}

function handleTagInput(event) {
    const input = event.target;
    const value = input.value;
    
    // Détecte virgule ou Entrée
    if (event.key === ',' || event.key === 'Enter') {
        event.preventDefault();
        
        // Retire la virgule si présente
        const tag = value.replace(',', '').trim();
        
        if (tag) {
            addTag(tag);
            input.value = ''; // Vide l'input
        }
    }
    // Détecte Backspace sur input vide pour supprimer le dernier tag
    else if (event.key === 'Backspace' && value === '' && currentTags.length > 0) {
        event.preventDefault();
        const lastTag = currentTags[currentTags.length - 1];
        removeTag(lastTag);
    }
}

function handleTagInputChange(event) {
    const input = event.target;
    const value = input.value;
    
    // Si l'utilisateur tape une virgule, ajoute le tag immédiatement
    if (value.includes(',')) {
        const tags = value.split(',').filter(t => t.trim());
        
        // Ajoute tous les tags sauf le dernier (qui pourrait être incomplet)
        for (let i = 0; i < tags.length; i++) {
            const tag = tags[i].trim();
            if (tag) {
                addTag(tag);
            }
        }
        
        // Vide l'input
        input.value = '';
    }
}

function addTag(tag) {
    // Évite les doublons
    if (currentTags.includes(tag)) {
        showNotification('Ce tag existe déjà', 'warning');
        return;
    }
    
    currentTags.push(tag);
    renderTags(currentTags);
    
    // Sauvegarde automatiquement
    saveMediaTags();
}

function removeTag(tag) {
    currentTags = currentTags.filter(t => t !== tag);
    renderTags(currentTags);
    
    // Sauvegarde automatiquement
    saveMediaTags();
}

async function saveMediaTags() {
    if (!currentMediaId) return;
    
    try {
        const response = await fetch(`/admin/api/media/${currentMediaId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tags: currentTags })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Met à jour la liste locale
            const mediaIndex = allMedia.findIndex(m => m.id === currentMediaId);
            if (mediaIndex !== -1) {
                allMedia[mediaIndex].tags = currentTags;
            }
            
            // Recharge l'affichage des médias pour voir les changements
            applyFilters();
            
            // Notification subtile
            console.log('✅ Tags sauvegardés');
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde tags:', error);
        showNotification('Erreur lors de la sauvegarde des tags', 'error');
    }
}

// ============================================
// SUPPRESSION
// ============================================

async function deleteMedia() {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce média ?')) return;
    
    try {
        const response = await fetch(`/admin/api/media/${currentMediaId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Média supprimé', 'success');
            closeDetailsModal();
            loadMedia();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        showNotification('Erreur: ' + error.message, 'error');
    }
}

// ============================================
// MODALES
// ============================================

function openUploadModal() {
    document.getElementById('uploadModal').classList.remove('hidden');
    // Reset
    selectedFiles = [];
    document.getElementById('mediaFiles').value = '';
    document.getElementById('mediaTags').value = '';
    document.getElementById('uploadSection').classList.add('hidden');
    document.getElementById('btnUpload').disabled = true;
}

function closeUploadModal() {
    document.getElementById('uploadModal').classList.add('hidden');
    selectedFiles = [];
}

function closeDetailsModal() {
    document.getElementById('mediaDetailsModal').classList.add('hidden');
    currentMediaId = null;
}

// ============================================
// NOTIFICATIONS
// ============================================

function showNotification(message, type = 'info') {
    const colors = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        info: 'bg-blue-500',
        warning: 'bg-yellow-500'
    };
    
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg z-[100] animate-fade-in`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-10px)';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// ============================================
// MODE SÉLECTION MULTIPLE
// ============================================

function toggleSelectionMode() {
    selectionMode = !selectionMode;
    const btnSelectionMode = document.getElementById('btnSelectionMode');
    const mediaContainer = document.getElementById('mediaContainer');
    
    if (selectionMode) {
        // Active le mode sélection
        btnSelectionMode.innerHTML = '<i class="fas fa-times mr-2"></i>Annuler sélection';
        btnSelectionMode.classList.remove('bg-purple-600', 'hover:bg-purple-700');
        btnSelectionMode.classList.add('bg-gray-500', 'hover:bg-gray-600');
        mediaContainer.classList.add('selection-mode');
        
        // Réaffiche les médias avec les checkboxes
        applyFilters();
    } else {
        // Désactive le mode sélection
        btnSelectionMode.innerHTML = '<i class="fas fa-check-square mr-2"></i>Sélectionner';
        btnSelectionMode.classList.remove('bg-gray-500', 'hover:bg-gray-600');
        btnSelectionMode.classList.add('bg-purple-600', 'hover:bg-purple-700');
        mediaContainer.classList.remove('selection-mode');
        
        // Réinitialise la sélection
        clearSelection();
    }
}

function toggleMediaSelection(mediaId, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (selectedMedia.has(mediaId)) {
        selectedMedia.delete(mediaId);
    } else {
        selectedMedia.add(mediaId);
    }
    
    // Met à jour l'UI
    updateSelectionUI();
    
    // Réaffiche les médias pour mettre à jour les checkboxes et styles
    applyFilters();
}

function clearSelection() {
    selectedMedia.clear();
    updateSelectionUI();
    
    if (selectionMode) {
        applyFilters(); // Réaffiche pour décocher les checkboxes
    }
}

function updateSelectionUI() {
    const selectionActions = document.getElementById('selectionActions');
    const selectedCount = document.getElementById('selectedCount');
    
    if (selectedMedia.size > 0) {
        selectionActions.classList.remove('hidden');
        selectionActions.classList.add('flex');
        selectedCount.textContent = `${selectedMedia.size} sélectionné${selectedMedia.size > 1 ? 's' : ''}`;
    } else {
        selectionActions.classList.add('hidden');
        selectionActions.classList.remove('flex');
    }
}

async function deleteSelectedMedia() {
    const count = selectedMedia.size;
    
    if (count === 0) {
        showNotification('Aucun média sélectionné', 'warning');
        return;
    }
    
    const confirmMessage = `Êtes-vous sûr de vouloir supprimer ${count} média${count > 1 ? 's' : ''} ?`;
    if (!confirm(confirmMessage)) return;
    
    try {
        // Convertit le Set en Array pour l'envoyer au backend
        const mediaIds = Array.from(selectedMedia);
        
        const response = await fetch('/admin/api/media/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ media_ids: mediaIds })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`${data.deleted_count} média(s) supprimé(s) avec succès`, 'success');
            
            // Réinitialise la sélection
            selectedMedia.clear();
            updateSelectionUI();
            
            // Recharge les médias
            await loadMedia();
        } else {
            throw new Error(data.error || 'Erreur lors de la suppression');
        }
    } catch (error) {
        console.error('❌ Erreur suppression multiple:', error);
        showNotification('Erreur: ' + error.message, 'error');
    }
}
