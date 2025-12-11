/**
 * customers.js
 * Gestion de la liste des clients
 */

// État de l'application
let customers = [];
let currentCustomer = null;
let customerToDelete = null;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    loadCustomers();
    setupEventListeners();
});

/**
 * Configuration des event listeners
 */
function setupEventListeners() {
    // Bouton nouveau client
    document.getElementById('add-customer-btn').addEventListener('click', () => {
        openCustomerModal();
    });

    // Formulaire client
    document.getElementById('customer-form').addEventListener('submit', handleCustomerSubmit);

    // Boutons modal
    document.getElementById('cancel-customer-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('customer-modal'), false);
    });

    // Modale de suppression
    document.getElementById('cancel-delete-btn').addEventListener('click', () => {
        toggleModal(document.getElementById('delete-confirm-modal'), false);
    });

    document.getElementById('confirm-delete-btn').addEventListener('click', confirmDelete);
}

/**
 * Charge tous les clients
 */
async function loadCustomers() {
    try {
        const response = await fetchAPI('/admin/api/customers');
        customers = response.customers || [];
        renderCustomers();
    } catch (error) {
        console.error('Erreur chargement clients:', error);
        showToast('Erreur lors du chargement des clients', 'error');
        document.getElementById('loading-customers').classList.add('hidden');
        document.getElementById('customers-data-container').classList.remove('hidden');
    }
}

/**
 * Affiche la liste des clients
 */
function renderCustomers() {
    const loading = document.getElementById('loading-customers');
    const container = document.getElementById('customers-data-container');
    const tbody = document.getElementById('customers-list');
    const noCustomersMsg = document.getElementById('no-customers-message');

    loading.classList.add('hidden');
    container.classList.remove('hidden');

    if (customers.length === 0) {
        tbody.innerHTML = '';
        noCustomersMsg.classList.remove('hidden');
        return;
    }

    noCustomersMsg.classList.add('hidden');

    tbody.innerHTML = customers.map(customer => `
        <tr class="border-b border-gray-200 hover:bg-gray-50">
            <td class="px-4 py-3">
                <a href="/admin/customers/${customer.id}" class="text-blue-600 hover:text-blue-800 font-medium">
                    ${escapeHtml(customer.name)}
                </a>
            </td>
            <td class="px-4 py-3">${escapeHtml(customer.email)}</td>
            <td class="px-4 py-3">${escapeHtml(customer.phone)}</td>
            <td class="px-4 py-3">
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${customer.tripCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${customer.tripCount} voyage${customer.tripCount > 1 ? 's' : ''}
                </span>
            </td>
            <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                    <a href="/admin/customers/${customer.id}" class="text-blue-600 hover:text-blue-800 px-2 py-1" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </a>
                    <button class="edit-customer-btn text-green-600 hover:text-green-800 px-2 py-1" data-customer-id="${customer.id}" title="Éditer">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-customer-btn text-red-600 hover:text-red-800 px-2 py-1" data-customer-id="${customer.id}" title="Supprimer">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // RENDER MOBILE CARDS
    const mobileList = document.getElementById('customers-mobile-list');
    mobileList.innerHTML = customers.map(customer => `
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-bold text-gray-900 text-lg">${escapeHtml(customer.name)}</h3>
                    <p class="text-sm text-gray-500">${escapeHtml(customer.email)}</p>
                </div>
                <div class="flex items-center gap-1">
                     <a href="/admin/customers/${customer.id}" class="bg-blue-50 text-blue-600 p-2 rounded hover:bg-blue-100 transition-colors" title="Voir détails">
                        <i class="fas fa-eye"></i>
                    </a>
                </div>
            </div>
            
            <div class="flex justify-between items-center text-sm text-gray-600 mb-4">
                <span class="flex items-center"><i class="fas fa-phone mr-2 text-gray-400"></i>${escapeHtml(customer.phone)}</span>
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${customer.tripCount > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    ${customer.tripCount} voyage${customer.tripCount > 1 ? 's' : ''}
                </span>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <button class="edit-customer-btn flex items-center justify-center py-2 px-3 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm font-medium" data-customer-id="${customer.id}">
                    <i class="fas fa-edit mr-2 text-green-500"></i> Modifier
                </button>
                <button class="delete-customer-btn flex items-center justify-center py-2 px-3 border border-red-200 bg-red-50 rounded text-red-600 hover:bg-red-100 text-sm font-medium" data-customer-id="${customer.id}">
                    <i class="fas fa-trash-alt mr-2"></i> Supprimer
                </button>
            </div>
        </div>
    `).join('');

    // Attache les event listeners
    document.querySelectorAll('.edit-customer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const customerId = e.currentTarget.dataset.customerId;
            const customer = customers.find(c => c.id === customerId);
            if (customer) openCustomerModal(customer);
        });
    });

    document.querySelectorAll('.delete-customer-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const customerId = e.currentTarget.dataset.customerId;
            const customer = customers.find(c => c.id === customerId);
            if (customer) openDeleteModal(customer);
        });
    });
}

/**
 * Ouvre la modale de création/édition
 */
function openCustomerModal(customer = null) {
    currentCustomer = customer;
    const modal = document.getElementById('customer-modal');
    const form = document.getElementById('customer-form');
    const title = document.getElementById('modal-title');

    // Reset le formulaire
    form.reset();

    if (customer) {
        // Mode édition
        title.textContent = 'Modifier le client';
        document.getElementById('customer-id').value = customer.id;

        // Gestion rétro-compatible du nom
        let firstName = customer.firstName || '';
        let lastName = customer.lastName || '';
        if (!firstName && !lastName && customer.name) {
            const parts = customer.name.split(' ');
            if (parts.length > 0) firstName = parts[0];
            if (parts.length > 1) lastName = parts.slice(1).join(' ');
        }

        document.getElementById('customer-firstname').value = firstName;
        document.getElementById('customer-lastname').value = lastName;
        document.getElementById('customer-email').value = customer.email;
        document.getElementById('customer-phone').value = customer.phone;
        document.getElementById('customer-address').value = customer.address || '';
    } else {
        // Mode création
        title.textContent = 'Nouveau Client';
        document.getElementById('customer-id').value = '';
    }

    toggleModal(modal, true);
}

/**
 * Gère la soumission du formulaire
 */
async function handleCustomerSubmit(e) {
    e.preventDefault();

    const customerId = document.getElementById('customer-id').value;
    const customerData = {
        firstName: document.getElementById('customer-firstname').value.trim(),
        lastName: document.getElementById('customer-lastname').value.trim(),
        email: document.getElementById('customer-email').value.trim(),
        phone: document.getElementById('customer-phone').value.trim(),
        address: document.getElementById('customer-address').value.trim()
    };

    try {
        if (customerId) {
            // Mise à jour
            await fetchAPI(`/admin/api/customers/${customerId}`, {
                method: 'PUT',
                body: JSON.stringify(customerData)
            });
            showToast('Client modifié avec succès', 'success');
        } else {
            // Création
            await fetchAPI('/admin/api/customers', {
                method: 'POST',
                body: JSON.stringify(customerData)
            });
            showToast('Client créé avec succès', 'success');
        }

        toggleModal(document.getElementById('customer-modal'), false);
        loadCustomers();
    } catch (error) {
        console.error('Erreur sauvegarde client:', error);
        showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
    }
}

/**
 * Ouvre la modale de confirmation de suppression
 */
function openDeleteModal(customer) {
    customerToDelete = customer;
    const modal = document.getElementById('delete-confirm-modal');
    const message = document.getElementById('delete-confirm-message');

    message.textContent = `Voulez-vous vraiment supprimer le client "${customer.name}" ? Tous ses voyages assignés et vouchers seront également supprimés.`;

    toggleModal(modal, true);
}

/**
 * Confirme et exécute la suppression
 */
async function confirmDelete() {
    if (!customerToDelete) return;

    try {
        await fetchAPI(`/admin/api/customers/${customerToDelete.id}`, {
            method: 'DELETE'
        });

        showToast('Client supprimé avec succès', 'success');
        toggleModal(document.getElementById('delete-confirm-modal'), false);
        customerToDelete = null;
        loadCustomers();
    } catch (error) {
        console.error('Erreur suppression client:', error);
        showToast(error.message || 'Erreur lors de la suppression', 'error');
    }
}

/**
 * Échappe le HTML pour éviter les injections XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
