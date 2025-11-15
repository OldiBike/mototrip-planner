/**
 * customer_detail.js
 * Gestion de la page de détails d'un client
 */

// Variables globales
const customerId = window.customerId;
const customerName = window.customerName;
let deleteTarget = null;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

/**
 * Configuration des event listeners
 */
function setupEventListeners() {
    // Édition du client
    document.getElementById('edit-customer-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('edit-customer-modal'), true);
    });
    
    document.getElementById('edit-customer-form').addEventListener('submit', handleEditCustomer);
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('edit-customer-modal'), false);
    });
    
    // Suppression du client
    document.getElementById('delete-customer-btn').addEventListener('click', handleDeleteCustomer);
    
    // Assignation de voyage
    document.getElementById('assign-trip-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('assign-trip-modal'), true);
    });
    
    document.getElementById('assign-trip-form').addEventListener('submit', handleAssignTrip);
    
    document.getElementById('cancel-assign-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('assign-trip-modal'), false);
    });
    
    // Calcul automatique de la date de fin
    document.getElementById('select-trip').addEventListener('change', calculateEndDate);
    document.getElementById('trip-start-date').addEventListener('change', calculateEndDate);
    
    // Upload voucher
    document.getElementById('upload-voucher-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('upload-voucher-modal'), true);
    });
    
    document.getElementById('upload-voucher-form').addEventListener('submit', handleUploadVoucher);
    
    document.getElementById('cancel-upload-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('upload-voucher-modal'), false);
    });
    
    // Modale de confirmation
    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('delete-confirm-modal'), false);
    });
    
    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
    
    // Boutons de désassignation de voyage
    document.querySelectorAll('.unassign-trip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const assignmentId = e.currentTarget.dataset.assignmentId;
            handleUnassignTrip(assignmentId);
        });
    });
    
    // Boutons de suppression de voucher
    document.querySelectorAll('.delete-voucher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const voucherId = e.currentTarget.dataset.voucherId;
            handleDeleteVoucher(voucherId);
        });
    });
}

/**
 * Gère l'édition du client
 */
async function handleEditCustomer(e) {
    e.preventDefault();
    
    const customerData = {
        name: document.getElementById('edit-customer-name').value.trim(),
        email: document.getElementById('edit-customer-email').value.trim(),
        phone: document.getElementById('edit-customer-phone').value.trim(),
        address: document.getElementById('edit-customer-address').value.trim()
    };
    
    try {
        await fetchAPI(`/admin/api/customers/${customerId}`, {
            method: 'PUT',
            body: JSON.stringify(customerData)
        });
        
        showToast('Client modifié avec succès', 'success');
        
        // Recharge la page pour afficher les changements
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Erreur modification client:', error);
        showToast(error.message || 'Erreur lors de la modification', 'error');
    }
}

/**
 * Gère la suppression du client
 */
function handleDeleteCustomer() {
    deleteTarget = { type: 'customer', id: customerId };
    const modal = document.getElementById('delete-confirm-modal');
    const message = document.getElementById('delete-confirm-message');
    
    message.textContent = `Voulez-vous vraiment supprimer le client "${customerName}" ? Tous ses voyages assignés et vouchers seront également supprimés. Cette action est irréversible.`;
    
    toggleModal(modal, true);
}

/**
 * Gère l'assignation d'un voyage
 */
async function handleAssignTrip(e) {
    e.preventDefault();
    
    const selectElement = document.getElementById('select-trip');
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    
    const tripData = {
        tripId: selectElement.value,
        tripName: selectedOption.dataset.name,
        startDate: document.getElementById('trip-start-date').value,
        endDate: document.getElementById('trip-end-date').value
    };
    
    // Validation des dates
    if (new Date(tripData.startDate) > new Date(tripData.endDate)) {
        showToast('La date de début doit être avant la date de fin', 'error');
        return;
    }
    
    try {
        await fetchAPI(`/admin/api/customers/${customerId}/trips`, {
            method: 'POST',
            body: JSON.stringify(tripData)
        });
        
        showToast('Voyage assigné avec succès', 'success');
        toggleModal(document.getElementById('assign-trip-modal'), false);
        
        // Recharge la page
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Erreur assignation voyage:', error);
        showToast(error.message || 'Erreur lors de l\'assignation', 'error');
    }
}

/**
 * Gère la désassignation d'un voyage
 */
function handleUnassignTrip(assignmentId) {
    deleteTarget = { type: 'trip', id: assignmentId };
    const modal = document.getElementById('delete-confirm-modal');
    const message = document.getElementById('delete-confirm-message');
    
    message.textContent = 'Voulez-vous vraiment retirer ce voyage du client ? Les vouchers associés seront également supprimés.';
    
    toggleModal(modal, true);
}

/**
 * Gère l'upload d'un voucher
 */
async function handleUploadVoucher(e) {
    e.preventDefault();
    
    const fileInput = document.getElementById('voucher-file');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Veuillez sélectionner un fichier', 'error');
        return;
    }
    
    // Validation du fichier
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showToast('Le fichier est trop volumineux (max 10MB)', 'error');
        return;
    }
    
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
        showToast('Type de fichier non autorisé', 'error');
        return;
    }
    
    const assignmentId = document.getElementById('voucher-assignment').value;
    
    // Prépare le FormData
    const formData = new FormData();
    formData.append('file', file);
    if (assignmentId) {
        formData.append('assignmentId', assignmentId);
    }
    
    // Affiche la progress bar
    const progressContainer = document.getElementById('upload-progress');
    const progressBar = document.getElementById('upload-progress-bar');
    progressContainer.classList.remove('hidden');
    progressBar.style.width = '0%';
    
    try {
        // Simule la progression
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 10;
            if (progress <= 90) {
                progressBar.style.width = `${progress}%`;
            }
        }, 100);
        
        const response = await fetch(`/admin/api/customers/${customerId}/vouchers`, {
            method: 'POST',
            body: formData
        });
        
        clearInterval(progressInterval);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Erreur lors de l\'upload');
        }
        
        progressBar.style.width = '100%';
        
        showToast('Voucher uploadé avec succès', 'success');
        toggleModal(document.getElementById('upload-voucher-modal'), false);
        
        // Reset le formulaire et la progress bar
        document.getElementById('upload-voucher-form').reset();
        progressContainer.classList.add('hidden');
        
        // Recharge la page
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        console.error('Erreur upload voucher:', error);
        showToast(error.message || 'Erreur lors de l\'upload', 'error');
        progressContainer.classList.add('hidden');
    }
}

/**
 * Gère la suppression d'un voucher
 */
function handleDeleteVoucher(voucherId) {
    deleteTarget = { type: 'voucher', id: voucherId };
    const modal = document.getElementById('delete-confirm-modal');
    const message = document.getElementById('delete-confirm-message');
    
    message.textContent = 'Voulez-vous vraiment supprimer ce voucher ?';
    
    toggleModal(modal, true);
}

/**
 * Confirme et exécute la suppression
 */
async function confirmDelete() {
    if (!deleteTarget) return;
    
    try {
        switch (deleteTarget.type) {
            case 'customer':
                await fetchAPI(`/admin/api/customers/${deleteTarget.id}`, {
                    method: 'DELETE'
                });
                showToast('Client supprimé avec succès', 'success');
                
                // Redirige vers la liste des clients
                setTimeout(() => window.location.href = '/admin/customers', 1000);
                break;
                
            case 'trip':
                await fetchAPI(`/admin/api/customers/${customerId}/trips/${deleteTarget.id}`, {
                    method: 'DELETE'
                });
                showToast('Voyage retiré avec succès', 'success');
                
                // Recharge la page
                setTimeout(() => window.location.reload(), 1000);
                break;
                
            case 'voucher':
                await fetchAPI(`/admin/api/customers/${customerId}/vouchers/${deleteTarget.id}`, {
                    method: 'DELETE'
                });
                showToast('Voucher supprimé avec succès', 'success');
                
                // Recharge la page
                setTimeout(() => window.location.reload(), 1000);
                break;
        }
        
        toggleModal(document.getElementById('delete-confirm-modal'), false);
        deleteTarget = null;
    } catch (error) {
        console.error('Erreur suppression:', error);
        showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
}

/**
 * Calcule automatiquement la date de fin basée sur la durée du voyage
 */
function calculateEndDate() {
    const selectElement = document.getElementById('select-trip');
    const startDateInput = document.getElementById('trip-start-date');
    const endDateInput = document.getElementById('trip-end-date');
    const durationInfo = document.getElementById('trip-duration-info');
    
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const duration = selectedOption ? parseInt(selectedOption.dataset.duration) : 0;
    const startDate = startDateInput.value;
    
    if (!startDate || !duration) {
        endDateInput.value = '';
        durationInfo.textContent = 'Sélectionnez un voyage et une date de début';
        return;
    }
    
    // Calcule la date de fin (date début + durée en jours)
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);
    
    // Formate la date au format YYYY-MM-DD
    const endDateStr = end.toISOString().split('T')[0];
    endDateInput.value = endDateStr;
    
    // Met à jour le message d'information
    const tripName = selectedOption.dataset.name || 'ce voyage';
    durationInfo.textContent = `${tripName} dure ${duration} jour${duration > 1 ? 's' : ''}. Date de fin calculée: ${formatDate(end)}`;
}

/**
 * Formate une date en français
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('fr-FR', options);
}

/**
 * Formate la taille de fichier
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// GESTION DES FICHIERS GPX
// ============================================

// Upload GPX
document.getElementById('upload-gpx-btn').addEventListener('click', () => {
    openModal('upload-gpx-modal');
});

document.getElementById('cancel-gpx-upload-btn').addEventListener('click', () => {
    closeModal('upload-gpx-modal');
    document.getElementById('upload-gpx-form').reset();
});

// Soumission du formulaire GPX
document.getElementById('upload-gpx-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('gpx-file');
    const assignmentSelect = document.getElementById('gpx-assignment');
    const progressDiv = document.getElementById('gpx-upload-progress');
    const progressBar = document.getElementById('gpx-upload-progress-bar');

    const file = fileInput.files[0];
    if (!file) {
        showToast('Veuillez sélectionner un fichier', 'error');
        return;
    }

    // Vérifie l'extension
    if (!file.name.toLowerCase().endsWith('.gpx')) {
        showToast('Seuls les fichiers .gpx sont acceptés', 'error');
        return;
    }

    // Prépare les données du formulaire
    const formData = new FormData();
    formData.append('file', file);
    if (assignmentSelect.value) {
        formData.append('assignmentId', assignmentSelect.value);
    }

    try {
        // Affiche la barre de progression
        progressDiv.classList.remove('hidden');
        progressBar.style.width = '50%';

        const response = await fetch(`/admin/api/customers/${window.customerId}/gpx`, {
            method: 'POST',
            body: formData
        });

        progressBar.style.width = '100%';

        if (!response.ok) {
            throw new Error('Erreur lors de l\'upload');
        }

        const data = await response.json();

        if (data.success) {
            showToast('Fichier GPX uploadé avec succès', 'success');
            closeModal('upload-gpx-modal');
            document.getElementById('upload-gpx-form').reset();
            progressDiv.classList.add('hidden');
            progressBar.style.width = '0%';

            // Recharge la page pour afficher le nouveau fichier
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
    } catch (error) {
        console.error('Erreur:', error);
        showToast(error.message || 'Erreur lors de l\'upload du fichier GPX', 'error');
        progressDiv.classList.add('hidden');
        progressBar.style.width = '0%';
    }
});

// Suppression de fichier GPX
document.addEventListener('click', async (e) => {
    if (e.target.closest('.delete-gpx-btn')) {
        const btn = e.target.closest('.delete-gpx-btn');
        const gpxId = btn.dataset.gpxId;

        openDeleteConfirmModal(
            'Êtes-vous sûr de vouloir supprimer ce fichier GPX ?',
            async () => {
                try {
                    const response = await fetch(`/admin/api/customers/${window.customerId}/gpx/${gpxId}`, {
                        method: 'DELETE'
                    });

                    if (!response.ok) {
                        throw new Error('Erreur lors de la suppression');
                    }

                    const data = await response.json();

                    if (data.success) {
                        showToast('Fichier GPX supprimé', 'success');
                        // Recharge la page
                        setTimeout(() => {
                            window.location.reload();
                        }, 1000);
                    } else {
                        throw new Error(data.error || 'Erreur inconnue');
                    }
                } catch (error) {
                    console.error('Erreur:', error);
                    showToast(error.message || 'Erreur lors de la suppression du fichier GPX', 'error');
                }
            }
        );
    }
});
