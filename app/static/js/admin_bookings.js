/**
 * admin_bookings.js
 * Gestion de la liste des réservations (Admin)
 */

let bookings = [];

document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
});

/**
 * Charge toutes les réservations
 */
async function loadBookings() {
    const loading = document.getElementById('loading-bookings');
    const container = document.getElementById('bookings-table-container');

    try {
        const response = await fetch('/admin/api/bookings');
        const data = await response.json();

        if (data.success) {
            bookings = data.bookings || [];
            renderBookings();
        } else {
            console.error('Erreur chargement bookings:', data.error);
            // showToast(data.error, 'error');
        }
    } catch (error) {
        console.error('Erreur réseau:', error);
    } finally {
        loading.classList.add('hidden');
        container.classList.remove('hidden');
    }
}

/**
 * Affiche la liste
 */
/**
 * Affiche la liste (Tableau Bureau + Cartes Mobile)
 */
function renderBookings() {
    const tbody = document.getElementById('bookings-list');
    const mobileList = document.getElementById('bookings-mobile-list');
    const noMsg = document.getElementById('no-bookings-message');

    if (!tbody || !mobileList) return;

    if (bookings.length === 0) {
        tbody.innerHTML = '';
        mobileList.innerHTML = '';
        noMsg.classList.remove('hidden');
        return;
    }

    noMsg.classList.add('hidden');

    // Génération du HTML pour chaque réservation
    const rows = bookings.map(booking => {
        const { statusClass, statusLabel, startDate, endDate, clientName, clientEmail } = getBookingDisplayData(booking);

        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">${clientName}</div>
                    <div class="text-xs text-gray-500">${clientEmail}</div>
                </td>
                <td class="px-4 py-3 text-blue-600 font-medium">
                    ${escapeHtml(booking.tripTemplateId)} 
                </td>
                <td class="px-4 py-3">
                    ${startDate} - ${endDate}
                </td>
                <td class="px-4 py-3">
                    ${booking.currentParticipants} / ${booking.totalParticipants}
                </td>
                <td class="px-4 py-3">
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
                <td class="px-4 py-3 text-right space-x-2">
                    ${getActionsButtons(booking)}
                </td>
            </tr>
        `;
    }).join('');

    const cards = bookings.map(booking => {
        const { statusClass, statusLabel, startDate, endDate, clientName, clientEmail } = getBookingDisplayData(booking);

        return `
            <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 relative">
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <div class="font-bold text-gray-900 text-lg">${clientName}</div>
                        <div class="text-xs text-gray-500">${clientEmail}</div>
                    </div>
                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${statusClass}">
                        ${statusLabel}
                    </span>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-4">
                    <div class="bg-gray-50 p-2 rounded">
                        <div class="text-xs text-gray-400 uppercase">Voyage</div>
                        <div class="font-medium truncate">${escapeHtml(booking.tripTemplateId)}</div>
                    </div>
                    <div class="bg-gray-50 p-2 rounded">
                        <div class="text-xs text-gray-400 uppercase">Pax</div>
                        <div class="font-medium">${booking.currentParticipants} / ${booking.totalParticipants}</div>
                    </div>
                    <div class="bg-gray-50 p-2 rounded col-span-2">
                        <div class="text-xs text-gray-400 uppercase">Dates</div>
                        <div class="font-medium">${startDate} - ${endDate}</div>
                    </div>
                </div>

                <div class="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    ${getActionsButtons(booking, true)}
                </div>
            </div>
        `;
    }).join('');

    tbody.innerHTML = rows;
    mobileList.innerHTML = cards;
}

function getBookingDisplayData(booking) {
    const startDate = new Date(booking.startDate).toLocaleDateString('fr-FR');
    const endDate = new Date(booking.endDate).toLocaleDateString('fr-FR');

    let statusClass = 'bg-gray-100 text-gray-800';
    let statusLabel = booking.status;

    if (booking.status === 'confirmed') {
        statusClass = 'bg-green-100 text-green-800';
        statusLabel = 'Confirmé';
    } else if (booking.status === 'pending_payment') {
        statusClass = 'bg-yellow-100 text-yellow-800';
        statusLabel = 'Attente paiement';
    } else if (booking.status === 'cancelled') {
        statusClass = 'bg-red-100 text-red-800';
        statusLabel = 'Annulé';
    }

    const clientName = (booking.leaderDetails?.firstName || booking.leaderDetails?.lastName)
        ? `${escapeHtml(booking.leaderDetails?.firstName || '')} ${escapeHtml(booking.leaderDetails?.lastName || '')}`
        : `${escapeHtml(booking.leaderDetails?.email || 'Inconnu')}`;

    const clientEmail = escapeHtml(booking.leaderDetails?.email || '');

    return { statusClass, statusLabel, startDate, endDate, clientName, clientEmail };
}

function getActionsButtons(booking, isMobile = false) {
    const revealBtnClass = booking.forceReveal
        ? 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'
        : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200';

    // Shared button styles
    const btnBase = "inline-flex items-center justify-center rounded border transition-colors";
    const btnMobile = "flex-1 py-2 text-sm font-medium";
    const btnDesktop = "text-xs px-2 py-1";

    const commonClass = isMobile ? btnMobile : btnDesktop;

    return `
        <button onclick="toggleReveal('${booking.id}')" 
                class="${btnBase} ${commonClass} ${revealBtnClass}"
                title="${booking.forceReveal ? 'Roadbook Dévoilé' : 'Roadbook Masqué'}">
            <i class="fas ${booking.forceReveal ? 'fa-unlock' : 'fa-lock'} mr-2"></i>
            ${booking.forceReveal ? 'Visible' : 'Masqué'}
        </button>
        
        <a href="/bookings/${booking.booking_id}" target="_blank" 
           class="${btnBase} ${commonClass} bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 ml-2" 
           title="Voir Détails">
            <i class="fas fa-eye mr-2"></i>
            ${isMobile ? 'Ouvrir' : ''}
        </a>
    `;
}

/**
 * Toggle le statut de révélation du roadbook
 */
async function toggleReveal(bookingId) {
    if (!confirm('Voulez-vous changer le statut de visibilité du Roadbook pour ce client ?')) return;

    try {
        const response = await fetch(`/admin/api/bookings/${bookingId}/toggle-reveal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            // Update local state and re-render
            const booking = bookings.find(b => b.id === bookingId);
            if (booking) {
                booking.forceReveal = data.forceReveal;
                renderBookings();
                // showToast('Statut mis à jour', 'success');
            }
        } else {
            alert('Erreur: ' + data.error);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur technique');
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
