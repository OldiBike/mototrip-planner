/**
 * customer_detail.js
 * Gestion de la page de détails d'un client (Refonte CRM 2.0)
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
    // -------------------------------------------------------------------------
    // 1. GESTION DES MODALES (Générique)
    // -------------------------------------------------------------------------

    // Fermeture des modales via bouton X ou Annuler
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            toggleModal(modal, false);
        });
    });

    // -------------------------------------------------------------------------
    // 2. GESTION FINANCIÈRE (Nouveau CRM 2.0)
    // -------------------------------------------------------------------------

    // Ouvrir la modale d'édition financière
    document.querySelectorAll('.edit-financials-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const bookingId = e.currentTarget.dataset.bookingId;
            const total = e.currentTarget.dataset.total;
            const deposit = e.currentTarget.dataset.deposit;
            const remaining = e.currentTarget.dataset.remaining;
            const status = e.currentTarget.dataset.status;

            // Remplir le formulaire
            document.getElementById('fin-booking-id').value = bookingId;
            document.getElementById('fin-total').value = total;
            document.getElementById('fin-deposit').value = deposit;
            document.getElementById('fin-remaining').value = remaining;
            document.getElementById('fin-status').value = status;

            // Ouvrir la modale
            toggleModal(document.getElementById('financial-modal'), true);
        });
    });

    // Soumettre le formulaire financier
    document.getElementById('financial-form').addEventListener('submit', handleFinancialUpdate);

    // Calcul auto du solde quand on change Total ou Acompte
    const finTotal = document.getElementById('fin-total');
    const finDeposit = document.getElementById('fin-deposit');
    const finRemaining = document.getElementById('fin-remaining');

    function updateRemaining() {
        const t = parseFloat(finTotal.value) || 0;
        const d = parseFloat(finDeposit.value) || 0;
        finRemaining.value = (t - d).toFixed(2);
    }

    if (finTotal) finTotal.addEventListener('input', updateRemaining);
    if (finDeposit) finDeposit.addEventListener('input', updateRemaining);


    // -------------------------------------------------------------------------
    // 3. GESTION CLIENT (Legacy adaptét)
    // -------------------------------------------------------------------------

    // Édition du client
    const editBtn = document.getElementById('edit-customer-btn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            toggleModal(document.getElementById('edit-customer-modal'), true);
        });
    }

    const editForm = document.getElementById('edit-customer-form');
    if (editForm) editForm.addEventListener('submit', handleEditCustomer);

    document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
        toggleModal(document.getElementById('edit-customer-modal'), false);
    });

    // Suppression du client (optionnel si présent dans le nouveau design)
    // Pas présent dans le nouveau design pour l'instant pour simplifier

    // -------------------------------------------------------------------------
    // 4. ASSIGNATION VOYAGE
    // -------------------------------------------------------------------------
    const assignBtn = document.getElementById('assign-trip-btn');
    const assignBtnEmpty = document.getElementById('assign-trip-btn-empty');

    if (assignBtn) {
        assignBtn.addEventListener('click', () => {
            toggleModal(document.getElementById('assign-trip-modal'), true);
        });
    }
    if (assignBtnEmpty) {
        assignBtnEmpty.addEventListener('click', () => {
            toggleModal(document.getElementById('assign-trip-modal'), true);
        });
    }

    const assignForm = document.getElementById('assign-trip-form');
    if (assignForm) assignForm.addEventListener('submit', handleAssignTrip);

    document.getElementById('cancel-assign-btn')?.addEventListener('click', () => {
        toggleModal(document.getElementById('assign-trip-modal'), false);
    });

    // Calcul automatique de la date de fin (legacy)
    const selectTrip = document.getElementById('select-trip');
    const tripStartDate = document.getElementById('trip-start-date');
    if (selectTrip) selectTrip.addEventListener('change', calculateEndDate);
    if (tripStartDate) tripStartDate.addEventListener('change', calculateEndDate);

    // Désassignation
    document.querySelectorAll('.unassign-trip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const assignmentId = e.currentTarget.dataset.assignmentId;
            handleUnassignTrip(assignmentId);
        });
    });

    // -------------------------------------------------------------------------
    // 5. UPLOADS FICHIERS (Voucher & GPX)
    // -------------------------------------------------------------------------

    // Voucher
    document.querySelectorAll('.upload-voucher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Pré-sélectionner le voyage si cliqué depuis une card voyage
            const tripId = e.currentTarget.dataset.tripId;
            const select = document.getElementById('voucher-assignment');
            if (select && tripId) select.value = tripId;

            toggleModal(document.getElementById('upload-voucher-modal'), true);
        });
    });

    // GPX - Bouton principal et boutons par voyage
    const uploadGpxBtn = document.getElementById('upload-gpx-btn');
    if (uploadGpxBtn) {
        uploadGpxBtn.addEventListener('click', () => {
            toggleModal(document.getElementById('upload-gpx-modal'), true);
        });
    }

    document.querySelectorAll('.upload-gpx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tripId = e.currentTarget.dataset.tripId;
            const select = document.getElementById('gpx-assignment');
            if (select && tripId) select.value = tripId;

            toggleModal(document.getElementById('upload-gpx-modal'), true);
        });
    });

    // Forms Upload
    document.getElementById('upload-voucher-form')?.addEventListener('submit', handleUploadVoucher);
    document.getElementById('upload-gpx-form')?.addEventListener('submit', handleUploadGPX);

    // Cancel buttons
    document.getElementById('cancel-upload-btn')?.addEventListener('click', () => {
        toggleModal(document.getElementById('upload-voucher-modal'), false);
    });
    document.getElementById('cancel-gpx-upload-btn')?.addEventListener('click', () => {
        toggleModal(document.getElementById('upload-gpx-modal'), false);
    });

    // Boutons de suppression (Voucher & GPX)
    document.querySelectorAll('.delete-voucher-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.voucherId;
            handleDeleteFile('voucher', id);
        });
    });

    document.querySelectorAll('.delete-gpx-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.gpxId;
            handleDeleteFile('gpx', id);
        });
    });

    // Modale confirmation suppression globale
    document.getElementById('cancel-delete-btn')?.addEventListener('click', () => {
        toggleModal(document.getElementById('delete-confirm-modal'), false);
    });
    document.getElementById('confirm-delete-btn')?.addEventListener('click', confirmDelete);

    // -------------------------------------------------------------------------
    // 6. ROADBOOK REVEAL TOGGLE
    // -------------------------------------------------------------------------
    document.querySelectorAll('.reveal-toggle-btn').forEach(btn => {
        btn.addEventListener('click', handleRevealToggle);
    });

    // -------------------------------------------------------------------------
    // 7. DEMANDES DE PAIEMENT
    // -------------------------------------------------------------------------
    document.querySelectorAll('.request-payment-btn').forEach(btn => {
        btn.addEventListener('click', handlePaymentRequest);
    });
}

// ============================================
// HANDLERS
// ============================================

/**
 * Handle Payment Requests (Deposit / Balance)
 */
async function handlePaymentRequest(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const bookingId = btn.dataset.bookingId;
    const type = btn.dataset.type; // 'deposit' or 'balance'

    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    btn.disabled = true;

    try {
        const response = await fetchAPI(`/admin/api/bookings/${bookingId}/request_payment`, {
            method: 'POST',
            body: JSON.stringify({ type: type })
        });

        showToast(response.message, 'success');

    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

/**
 * Handle Roadbook Reveal Toggle
 */
async function handleRevealToggle(e) {
    e.preventDefault();
    const btn = e.currentTarget;
    const bookingId = btn.dataset.bookingId;
    const currentRevealed = btn.dataset.revealed === 'true';
    const newRevealed = !currentRevealed;
    const icon = btn.querySelector('i');

    // Optimistic UI Update
    btn.disabled = true;

    try {
        const response = await fetchAPI(`/admin/api/bookings/${bookingId}/reveal`, {
            method: 'POST',
            body: JSON.stringify({ forceReveal: newRevealed })
        });

        // Update UI state based on success
        btn.dataset.revealed = response.forceReveal;
        if (response.forceReveal) {
            btn.classList.remove('bg-white/10', 'text-gray-300', 'border-white/10', 'hover:bg-white/20');
            btn.classList.add('bg-green-500/20', 'text-green-100', 'border-green-500/30', 'hover:bg-green-500/30');
            btn.title = "Roadbook visible";
            icon.classList.remove('fa-lock');
            icon.classList.add('fa-unlock');
        } else {
            btn.classList.add('bg-white/10', 'text-gray-300', 'border-white/10', 'hover:bg-white/20');
            btn.classList.remove('bg-green-500/20', 'text-green-100', 'border-green-500/30', 'hover:bg-green-500/30');
            btn.title = "Roadbook masqué (auto)";
            icon.classList.add('fa-lock');
            icon.classList.remove('fa-unlock');
        }
        showToast(`Roadbook ${response.forceReveal ? 'débloqué' : 'verrouillé'}`, 'success');

    } catch (error) {
        showToast('Erreur: ' + error.message, 'error');
        // Revert UI on error is acceptable or just leave it for simplicity
    } finally {
        btn.disabled = false;
    }
}

/**
 * Update Financier via API
 */
async function handleFinancialUpdate(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    const bookingId = document.getElementById('fin-booking-id').value;
    const data = {
        totalAmount: document.getElementById('fin-total').value,
        depositAmount: document.getElementById('fin-deposit').value,
        remainingAmount: document.getElementById('fin-remaining').value,
        paymentStatus: document.getElementById('fin-status').value
    };

    try {
        await fetchAPI(`/admin/api/bookings/${bookingId}/financials`, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        showToast('Finances mises à jour !', 'success');
        setTimeout(() => window.location.reload(), 800);
    } catch (error) {
        showToast(error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

/**
 * Handle Edit Customer
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
        showToast('Client modifié', 'success');
        setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Handle Assign Trip
 */
async function handleAssignTrip(e) {
    e.preventDefault();
    const selectElement = document.getElementById('select-trip');
    const startDateInput = document.getElementById('trip-start-date');

    // Calculate endDate
    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const duration = selectedOption ? parseInt(selectedOption.dataset.duration) : 0;
    const startDate = startDateInput.value;

    let endDate = '';
    if (startDate && duration) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + duration);
        endDate = end.toISOString().split('T')[0];
    }

    const tripData = {
        tripId: selectElement.value,
        tripName: selectedOption.dataset.name,
        startDate: startDate,
        endDate: endDate
    };

    try {
        await fetchAPI(`/admin/api/customers/${customerId}/trips`, {
            method: 'POST',
            body: JSON.stringify(tripData)
        });
        showToast('Voyage assigné', 'success');
        setTimeout(() => window.location.reload(), 800);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Handle Unassign Trip
 */
function handleUnassignTrip(assignmentId) {
    // Determine type based on where we are calling from, or just handle it as 'trip'
    // The backend route for unassign is likely a DELETE on the assignment ID
    // Check routes/admin.py for the exact endpoint. 
    // It seems api_assign_trip_to_customer handles creation.
    // api_unassign_trip (if it exists) or just deleting the assignment document.

    // In confirmDelete: 
    // if (deleteTarget.type === 'trip') url = `/admin/api/customers/${customerId}/trips/${deleteTarget.id}`;

    deleteTarget = { type: 'trip', id: assignmentId };
    const modal = document.getElementById('delete-confirm-modal');
    if (document.getElementById('delete-confirm-message')) {
        document.getElementById('delete-confirm-message').textContent = 'Retirer ce voyage ?';
    }
    toggleModal(modal, true);
}

/**
 * Handle Upload Voucher
 */
async function handleUploadVoucher(e) {
    e.preventDefault();
    const file = document.getElementById('voucher-file').files[0];
    const assignmentId = document.getElementById('voucher-assignment').value;

    if (!file) return showToast('Sélectionnez un fichier', 'error');

    const formData = new FormData();
    formData.append('file', file);
    if (assignmentId) formData.append('assignmentId', assignmentId);

    // TODO: Ajouter progress bar UI si voulu
    try {
        const response = await fetch(`/admin/api/customers/${customerId}/vouchers`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Upload failed');

        showToast('Voucher uploadé', 'success');
        setTimeout(() => window.location.reload(), 800);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Handle Upload GPX
 */
async function handleUploadGPX(e) {
    e.preventDefault();
    const file = document.getElementById('gpx-file').files[0];
    const assignmentId = document.getElementById('gpx-assignment').value;

    if (!file) return showToast('Sélectionnez un fichier GPX', 'error');
    if (!file.name.toLowerCase().endsWith('.gpx')) return showToast('Format .gpx requis', 'error');

    const formData = new FormData();
    formData.append('file', file);
    if (assignmentId) formData.append('assignmentId', assignmentId);

    try {
        const response = await fetch(`/admin/api/customers/${customerId}/gpx`, {
            method: 'POST',
            body: formData
        });
        if (!response.ok) throw new Error('Upload failed');

        showToast('GPX uploadé', 'success');
        setTimeout(() => window.location.reload(), 800);
    } catch (error) {
        showToast(error.message, 'error');
    }
}

/**
 * Handle Delete File (Generic)
 */
function handleDeleteFile(type, id) {
    deleteTarget = { type: type, id: id };
    const modal = document.getElementById('delete-confirm-modal');
    document.getElementById('delete-confirm-message').textContent = `Supprimer ce ${type} ?`;
    toggleModal(modal, true);
}

/**
 * Confirm Delete
 */
async function confirmDelete() {
    if (!deleteTarget) return;

    try {
        let url = '';
        if (deleteTarget.type === 'trip') url = `/admin/api/customers/${customerId}/trips/${deleteTarget.id}`;
        else if (deleteTarget.type === 'voucher') url = `/admin/api/customers/${customerId}/vouchers/${deleteTarget.id}`;
        else if (deleteTarget.type === 'gpx') url = `/admin/api/customers/${customerId}/gpx/${deleteTarget.id}`;

        await fetchAPI(url, { method: 'DELETE' });
        showToast('Suppression réussie', 'success');
        setTimeout(() => window.location.reload(), 800);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        toggleModal(document.getElementById('delete-confirm-modal'), false);
        deleteTarget = null;
    }
}

// ============================================
// UTILS
// ============================================

function calculateEndDate() {
    const selectElement = document.getElementById('select-trip');
    const startDateInput = document.getElementById('trip-start-date');
    const endDateInput = document.getElementById('trip-end-date');

    // Le code legacy utilisait un <p id="trip-duration-info">, on essaie de le trouver
    const durationInfo = document.getElementById('trip-duration-info');

    const selectedOption = selectElement.options[selectElement.selectedIndex];
    const duration = selectedOption ? parseInt(selectedOption.dataset.duration) : 0;
    const startDate = startDateInput.value;

    if (!startDate || !duration) {
        if (endDateInput) endDateInput.value = '';
        if (durationInfo) durationInfo.textContent = 'Sélectionnez un voyage et une date de début';
        return;
    }

    // Calcule la date de fin (date début + durée en jours)
    const start = new Date(startDate);
    const end = new Date(start);
    end.setDate(end.getDate() + duration);

    // Formate la date au format YYYY-MM-DD
    const endDateStr = end.toISOString().split('T')[0];
    if (endDateInput) endDateInput.value = endDateStr;

    // Met à jour le message d'information
    const tripName = selectedOption.dataset.name || 'Ce voyage';
    if (durationInfo) durationInfo.textContent = `${tripName} dure ${duration} jour${duration > 1 ? 's' : ''}. Fin prévue le : ${end.toLocaleDateString()}`;
}

function toggleModal(modal, show) {
    if (!modal) return;
    if (show) {
        modal.classList.remove('hidden');
    } else {
        modal.classList.add('hidden');
    }
}

async function fetchAPI(url, options = {}) {
    // Helper simple pour fetch avec gestion erreur JSON

    // Ajoute Content-Type: application/json par défaut si ce n'est pas du FormData
    if (options.body && !(options.body instanceof FormData)) {
        options.headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
    }

    const response = await fetch(url, options);
    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Erreur API');
    }
    return data;
}

function showToast(message, type = 'info') {
    // Création simple d'un toast s'il n'existe pas de système global déjà
    const container = document.getElementById('alerts-container');
    if (!container) return alert(message); // Fallback

    const color = type === 'success' ? 'green' : (type === 'error' ? 'red' : 'blue');
    const html = `
        <div class="mb-4 bg-${color}-50 border-l-4 border-${color}-500 p-4 shadow-md rounded flex justify-between items-center animate-fade-in-down">
            <div class="flex items-center">
                <div class="flex-shrink-0 text-${color}-500">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                </div>
                <div class="ml-3">
                    <p class="text-sm text-${color}-700 font-medium">${message}</p>
                </div>
            </div>
            <button class="ml-4 text-${color}-400 hover:text-${color}-600" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Insert et auto-remove
    const div = document.createElement('div');
    div.innerHTML = html;
    container.appendChild(div.firstChild);

    setTimeout(() => {
        if (container.firstChild) container.firstChild.remove();
    }, 4000);
}
