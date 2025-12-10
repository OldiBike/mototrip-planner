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
function renderBookings() {
    const tbody = document.getElementById('bookings-list');
    const noMsg = document.getElementById('no-bookings-message');

    if (bookings.length === 0) {
        tbody.innerHTML = '';
        noMsg.classList.remove('hidden');
        return;
    }

    noMsg.classList.add('hidden');

    tbody.innerHTML = bookings.map(booking => {
        // Date format
        const startDate = new Date(booking.startDate).toLocaleDateString('fr-FR');
        const endDate = new Date(booking.endDate).toLocaleDateString('fr-FR');

        // Status badge
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

        return `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-900">
                        ${(booking.leaderDetails?.firstName || booking.leaderDetails?.lastName)
                ? `${escapeHtml(booking.leaderDetails?.firstName || '')} ${escapeHtml(booking.leaderDetails?.lastName || '')}`
                : `${escapeHtml(booking.leaderDetails?.email || 'Inconnu')}`
            }
                    </div>
                    <div class="text-xs text-gray-500">${escapeHtml(booking.leaderDetails?.email || '')}</div>
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
                    <button onclick="toggleReveal('${booking.id}')" 
                            class="text-xs px-2 py-1 rounded border ${booking.forceReveal ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}"
                            title="${booking.forceReveal ? 'Roadbook Dévoilé (Forcé)' : 'Roadbook Masqué (Auto)'}">
                        <i class="fas ${booking.forceReveal ? 'fa-unlock' : 'fa-lock'}"></i>
                        ${booking.forceReveal ? 'Visible' : 'Masqué'}
                    </button>
                    
                    <a href="/bookings/${booking.booking_id}" target="_blank" class="text-blue-600 hover:text-blue-800 px-2" title="Voir comme le client">
                        <i class="fas fa-eye"></i>
                    </a>
                </td>
            </tr>
        `;
    }).join('');
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
