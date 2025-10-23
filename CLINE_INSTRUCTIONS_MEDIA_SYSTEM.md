# 📋 Instructions Cline - Système de Gestion des Médias (Photos)

## 🎯 Objectif Global

Ajouter un système complet de gestion de photos dans l'application MotoTrip Planner avec **deux types de médias distincts** :
1. **Médias Généraux** : Photos de cols, routes, points d'intérêt (avec tags)
2. **Médias Hôtels** : Photos d'hôtels liées directement aux étapes du voyage

---

## 📦 Prérequis Techniques

### Firebase Storage
Le projet utilise déjà Firebase (Auth + Firestore). Il faut ajouter **Firebase Storage**.

**Import à ajouter dans la balise `<script type="module">`** :

```javascript
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
```

**Initialisation après `db`** :

```javascript
// Après : db = getFirestore(app);
const storage = getStorage(app);
```

### Firebase Storage Rules

**À configurer dans la console Firebase** (Storage > Rules) :

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/trips/{tripId}/{allPaths=**} {
      allow read, write: if request.auth != null;
      // Note: La sécurité par userId est gérée côté client
    }
  }
}
```

---

## 🏗️ Architecture des Données

### Structure Firestore

**Nouvelle collection `media/` à créer** :

```
artifacts/{appId}/users/{userId}/trips/{tripId}/
└── media/                              ← NOUVELLE COLLECTION
    └── {mediaId}                       ← Document auto-généré
        ├── type: "general" | "hotel"   ← Type de média
        ├── fileName: "photo1.jpg"      ← Nom du fichier
        ├── storagePath: "users/..."    ← Chemin dans Storage
        ├── downloadURL: "https://..."  ← URL de téléchargement
        ├── fileSize: 2500000           ← Taille en bytes
        ├── uploadedAt: Timestamp       ← Date d'upload
        │
        ├── tags: ["Stelvio", "Col"]    ← SI type="general"
        │
        ├── linkedDayId: "day123"       ← SI type="hotel"
        └── linkedHotelName: "..."      ← SI type="hotel"
```

### Structure Firebase Storage

```
/users/{userId}/trips/{tripId}/
  ├── general/              ← Photos cols/routes
  │   ├── photo1.jpg
  │   └── photo2.jpg
  │
  └── hotels/               ← Photos hôtels
      ├── {dayId}/
      │   ├── photo1.jpg
      │   └── photo2.jpg
      └── ...
```

---

## 🎨 Interface Utilisateur - Vue d'Ensemble

### 1. Nouveau bouton "Médias" dans l'en-tête du voyage

**Position** : À droite de "Ajouter une étape"

**Trouver cette section dans le code** :
```html
<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
```

**Ajouter ce bouton après le bouton "Ajouter une étape"** :

```html
<!-- NOUVEAU BOUTON MÉDIAS -->
<button id="manage-media-btn" class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium w-full sm:w-auto">
    <i class="fas fa-images mr-2"></i>Médias
</button>
```

### 2. Nouveau bouton 📷 dans chaque carte d'étape

**Dans la fonction `loadDays()`, modifier la section des boutons d'action** :

Chercher :
```html
<div class="flex flex-col items-center gap-3 ml-4 shrink-0">
```

Ajouter le bouton 📷 **entre** le bouton "Modifier" et "Copier/Déplacer" :

```html
<!-- NOUVEAU BOUTON PHOTO HÔTEL -->
<button data-day-id="${day.id}" 
        class="view-hotel-photos-btn relative text-indigo-600 hover:text-indigo-800 opacity-60 hover:opacity-100 transition-opacity ${hotelPhotosCount === 0 ? 'cursor-not-allowed opacity-30' : ''}"
        ${hotelPhotosCount === 0 ? 'disabled' : ''}
        title="Photos de l'hôtel (${hotelPhotosCount})">
    <i class="fas fa-camera"></i>
    ${hotelPhotosCount > 0 ? `<span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">${hotelPhotosCount}</span>` : ''}
</button>
```

---

## 📐 Modales à Créer

**Ajouter ces 4 modales AVANT la balise de fermeture `</body>`** :

### Modale 1 : Gestionnaire de Médias Principal

```html
<!-- Modale Gestionnaire de Médias -->
<div id="media-manager-modal" class="modal fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 hidden z-50 overflow-y-auto">
    <div class="modal-content bg-white rounded-lg shadow-xl w-full max-w-5xl transform scale-95 my-8 max-h-[90vh] overflow-hidden flex flex-col">
        
        <!-- En-tête -->
        <div class="flex justify-between items-center p-6 border-b">
            <h3 class="text-2xl font-semibold text-gray-900">
                <i class="fas fa-images mr-2 text-purple-600"></i>
                Médias - <span id="media-trip-name"></span>
            </h3>
            <button type="button" id="close-media-manager-btn" class="text-gray-400 hover:text-gray-600">
                <i class="fas fa-times text-2xl"></i>
            </button>
        </div>

        <!-- Onglets -->
        <div class="flex border-b bg-gray-50">
            <button id="tab-general-btn" class="flex-1 px-6 py-3 font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 border-b-4 border-purple-600 transition-colors">
                <i class="fas fa-mountain mr-2"></i>Cols & Routes
            </button>
            <button id="tab-hotels-btn" class="flex-1 px-6 py-3 font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border-b-4 border-transparent transition-colors">
                <i class="fas fa-hotel mr-2"></i>Hôtels
            </button>
        </div>

        <!-- Contenu dynamique des onglets -->
        <div class="flex-1 overflow-y-auto p-6">
            
            <!-- ONGLET 1 : Cols & Routes -->
            <div id="tab-general-content" class="space-y-4">
                
                <!-- Barre de recherche -->
                <div class="flex gap-3">
                    <div class="flex-1 relative">
                        <input type="text" 
                               id="search-tags-input" 
                               placeholder="Rechercher par tag (ex: Stelvio, Furka...)"
                               class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <i class="fas fa-search absolute right-3 top-3 text-gray-400"></i>
                    </div>
                </div>

                <!-- Bouton upload -->
                <div>
                    <input type="file" id="upload-general-input" accept="image/*" multiple class="hidden">
                    <button id="upload-general-btn" class="w-full bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 font-medium flex items-center justify-center gap-2">
                        <i class="fas fa-cloud-upload-alt"></i>
                        Ajouter des photos (cols, routes, POI)
                    </button>
                </div>

                <!-- Tags populaires -->
                <div class="bg-gray-50 p-4 rounded-lg">
                    <p class="text-sm text-gray-600 mb-2">
                        <i class="fas fa-tags mr-2"></i>Tags populaires :
                    </p>
                    <div id="popular-tags-container" class="flex flex-wrap gap-2">
                        <!-- Les tags seront injectés dynamiquement -->
                    </div>
                </div>

                <!-- Galerie de photos -->
                <div id="general-photos-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
                    <!-- Les photos seront injectées ici -->
                </div>

                <!-- Message si vide -->
                <div id="no-general-photos" class="text-center py-12 text-gray-500 hidden">
                    <i class="fas fa-images text-5xl mb-4 opacity-50"></i>
                    <p>Aucune photo. Ajoutez des photos de vos cols et routes !</p>
                </div>

                <!-- Monitoring espace -->
                <div class="bg-blue-50 p-4 rounded-lg mt-6">
                    <p class="text-sm text-gray-600 mb-2">
                        📊 Espace utilisé : <strong id="space-used-general">0 MB</strong> / 5 GB
                    </p>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div id="space-bar-general" class="bg-blue-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                </div>
            </div>

            <!-- ONGLET 2 : Hôtels -->
            <div id="tab-hotels-content" class="space-y-4 hidden">
                
                <!-- Barre de recherche hôtel -->
                <div class="flex gap-3">
                    <div class="flex-1 relative">
                        <input type="text" 
                               id="search-hotels-input" 
                               placeholder="Rechercher un hôtel..."
                               class="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <i class="fas fa-search absolute right-3 top-3 text-gray-400"></i>
                    </div>
                </div>

                <!-- Bouton upload -->
                <div>
                    <input type="file" id="upload-hotel-input" accept="image/*" multiple class="hidden">
                    <button id="upload-hotel-btn" class="w-full bg-indigo-600 text-white px-4 py-3 rounded-md hover:bg-indigo-700 font-medium flex items-center justify-center gap-2">
                        <i class="fas fa-hotel mr-2"></i>
                        Ajouter photos d'hôtel
                    </button>
                </div>

                <!-- Liste des hôtels avec photos -->
                <div id="hotels-photos-list" class="space-y-4 mt-6">
                    <!-- Les hôtels seront injectés ici -->
                </div>

                <!-- Message si vide -->
                <div id="no-hotel-photos" class="text-center py-12 text-gray-500 hidden">
                    <i class="fas fa-hotel text-5xl mb-4 opacity-50"></i>
                    <p>Aucune photo d'hôtel. Uploadez des photos de vos hébergements !</p>
                </div>

                <!-- Monitoring espace -->
                <div class="bg-blue-50 p-4 rounded-lg mt-6">
                    <p class="text-sm text-gray-600 mb-2">
                        📊 Espace utilisé : <strong id="space-used-hotels">0 MB</strong> / 5 GB
                    </p>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div id="space-bar-hotels" class="bg-indigo-600 h-2 rounded-full transition-all" style="width: 0%"></div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>
```

### Modale 2 : Tagging pour Photos Générales

```html
<!-- Modale de Tagging -->
<div id="tagging-modal" class="modal fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 hidden z-[60]">
    <div class="modal-content bg-white p-8 rounded-lg shadow-xl w-full max-w-md transform scale-95">
        <h3 class="text-xl font-semibold mb-4 text-purple-600">
            <i class="fas fa-tags mr-2"></i>Ajouter des tags
        </h3>
        
        <p class="text-gray-600 mb-4">
            Vous uploadez <strong id="files-count">0</strong> photo(s)
        </p>

        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Tags (séparés par virgule) :
            </label>
            <input type="text" 
                   id="tags-input" 
                   placeholder="Ex: Stelvio, Col, Italie"
                   class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500">
        </div>

        <div class="mb-6">
            <p class="text-sm text-gray-600 mb-2">Suggestions :</p>
            <div id="suggested-tags" class="flex flex-wrap gap-2">
                <!-- Tags suggérés injectés ici -->
            </div>
        </div>

        <!-- Barre de progression -->
        <div id="upload-progress-container" class="mb-4 hidden">
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="upload-progress-bar" class="bg-purple-600 h-2 rounded-full transition-all" style="width: 0%"></div>
            </div>
            <p class="text-sm text-gray-600 mt-2 text-center">
                Upload en cours... <span id="upload-progress-text">0%</span>
            </p>
        </div>

        <div class="flex justify-end gap-4">
            <button type="button" id="cancel-tagging-btn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 font-medium">
                Annuler
            </button>
            <button type="button" id="confirm-upload-general-btn" class="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 font-medium">
                <i class="fas fa-cloud-upload-alt mr-2"></i>Uploader
            </button>
        </div>
    </div>
</div>
```

### Modale 3 : Sélection d'Hôtel

```html
<!-- Modale de Sélection d'Hôtel -->
<div id="hotel-selection-modal" class="modal fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-4 hidden z-[60]">
    <div class="modal-content bg-white p-8 rounded-lg shadow-xl w-full max-w-md transform scale-95 max-h-[80vh] overflow-hidden flex flex-col">
        <h3 class="text-xl font-semibold mb-4 text-indigo-600">
            <i class="fas fa-hotel mr-2"></i>Sélectionner un hôtel
        </h3>
        
        <p class="text-gray-600 mb-4">
            Vous uploadez <strong id="hotel-files-count">0</strong> photo(s)
        </p>

        <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
                Choisir l'étape/hôtel :
            </label>
            <div id="hotels-list-selection" class="space-y-2 max-h-64 overflow-y-auto border border-gray-300 rounded-md p-2">
                <!-- Liste des hôtels injectée ici -->
            </div>
        </div>

        <!-- Barre de progression -->
        <div id="upload-hotel-progress-container" class="mb-4 hidden">
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div id="upload-hotel-progress-bar" class="bg-indigo-600 h-2 rounded-full transition-all" style="width: 0%"></div>
            </div>
            <p class="text-sm text-gray-600 mt-2 text-center">
                Upload en cours... <span id="upload-hotel-progress-text">0%</span>
            </p>
        </div>

        <div class="flex justify-end gap-4 mt-4">
            <button type="button" id="cancel-hotel-selection-btn" class="bg-gray-300 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-400 font-medium">
                Annuler
            </button>
            <button type="button" id="confirm-upload-hotel-btn" class="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 font-medium" disabled>
                <i class="fas fa-cloud-upload-alt mr-2"></i>Uploader
            </button>
        </div>
    </div>
</div>
```

### Modale 4 : Lightbox Photos Hôtel

```html
<!-- Modale Lightbox Photos Hôtel -->
<div id="hotel-lightbox-modal" class="modal fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 hidden z-[60]">
    <div class="w-full max-w-4xl">
        
        <!-- En-tête -->
        <div class="flex justify-between items-center mb-4 text-white">
            <div>
                <h3 class="text-xl font-semibold" id="lightbox-hotel-name"></h3>
                <p class="text-sm text-gray-300" id="lightbox-day-name"></p>
            </div>
            <button type="button" id="close-lightbox-btn" class="text-white hover:text-gray-300 text-3xl">
                <i class="fas fa-times"></i>
            </button>
        </div>

        <!-- Image principale -->
        <div class="relative bg-black rounded-lg overflow-hidden mb-4" style="min-height: 400px;">
            <img id="lightbox-main-image" src="" alt="" class="w-full h-auto max-h-[70vh] object-contain">
            
            <!-- Boutons navigation -->
            <button id="lightbox-prev-btn" class="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-900 w-12 h-12 rounded-full flex items-center justify-center">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button id="lightbox-next-btn" class="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 text-gray-900 w-12 h-12 rounded-full flex items-center justify-center">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>

        <!-- Miniatures -->
        <div id="lightbox-thumbnails" class="flex gap-2 overflow-x-auto pb-2">
            <!-- Miniatures injectées ici -->
        </div>

        <!-- Footer -->
        <div class="flex justify-between items-center text-white mt-4">
            <p class="text-sm">
                Photo <span id="lightbox-current-index">1</span> / <span id="lightbox-total-count">1</span>
            </p>
            <button id="lightbox-download-btn" class="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium">
                <i class="fas fa-download mr-2"></i>Télécharger
            </button>
        </div>

    </div>
</div>
```

---

## 💻 Code JavaScript - Variables Globales

**À ajouter après les variables existantes (après `let stepToReassign = null;`)** :

```javascript
// Variables pour le système de médias
let storage = null; // Sera initialisé après Firebase
let selectedFilesGeneral = []; // Fichiers sélectionnés pour upload général
let selectedFilesHotel = []; // Fichiers sélectionnés pour upload hôtel
let selectedHotelForUpload = null; // {dayId, hotelName, dayName}
let allGeneralPhotos = []; // Cache des photos générales
let allHotelPhotos = []; // Cache des photos d'hôtels
let currentLightboxPhotos = []; // Photos dans la lightbox
let currentLightboxIndex = 0; // Index actuel dans la lightbox
let hotelPhotoCounts = {}; // Cache des compteurs {dayId: count}
```

---

## 🔧 Code JavaScript - Initialisation

**Dans la fonction `initAuth()`, après l'initialisation de `db`** :

Chercher :
```javascript
db = getFirestore(app);
```

Ajouter juste après :
```javascript
// NOUVEAU : Initialiser Storage
storage = getStorage(app);
```

---

## 📝 Code JavaScript - Fonctions Principales

**Ajouter toutes ces fonctions AVANT la ligne `startApp();`** :

```javascript
/**
 * Ouvre la modale de gestion des médias
 */
function openMediaManager() {
    if (!currentTripId || !currentTripName) {
        showToast("Veuillez sélectionner un voyage d'abord.", "error");
        return;
    }
    
    document.getElementById('media-trip-name').textContent = currentTripName;
    toggleModal(document.getElementById('media-manager-modal'), true);
    
    // Charge les données de l'onglet actif (par défaut: Général)
    loadGeneralPhotos();
    loadPopularTags();
    updateSpaceMonitoring();
}

/**
 * Gestion des onglets Général / Hôtels
 */
function switchTab(tabName) {
    const tabGeneralBtn = document.getElementById('tab-general-btn');
    const tabHotelsBtn = document.getElementById('tab-hotels-btn');
    const tabGeneralContent = document.getElementById('tab-general-content');
    const tabHotelsContent = document.getElementById('tab-hotels-content');
    
    if (tabName === 'general') {
        tabGeneralBtn.classList.add('border-purple-600', 'text-gray-900');
        tabGeneralBtn.classList.remove('border-transparent', 'text-gray-600');
        tabHotelsBtn.classList.remove('border-purple-600', 'text-gray-900');
        tabHotelsBtn.classList.add('border-transparent', 'text-gray-600');
        
        tabGeneralContent.classList.remove('hidden');
        tabHotelsContent.classList.add('hidden');
        
        loadGeneralPhotos();
    } else {
        tabHotelsBtn.classList.add('border-purple-600', 'text-gray-900');
        tabHotelsBtn.classList.remove('border-transparent', 'text-gray-600');
        tabGeneralBtn.classList.remove('border-purple-600', 'text-gray-900');
        tabGeneralBtn.classList.add('border-transparent', 'text-gray-600');
        
        tabHotelsContent.classList.remove('hidden');
        tabGeneralContent.classList.add('hidden');
        
        loadHotelPhotos();
    }
}

/**
 * Gère le clic sur "Ajouter des photos (cols, routes)"
 */
function handleGeneralUploadClick() {
    document.getElementById('upload-general-input').click();
}

/**
 * Gère la sélection de fichiers pour upload général
 */
function handleGeneralFilesSelected(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    selectedFilesGeneral = files;
    
    // Affiche la modale de tagging
    document.getElementById('files-count').textContent = files.length;
    document.getElementById('tags-input').value = '';
    
    // Charge les tags suggérés
    loadSuggestedTags();
    
    toggleModal(document.getElementById('tagging-modal'), true);
}

/**
 * Charge les tags suggérés (tags populaires du voyage)
 */
async function loadSuggestedTags() {
    const suggestedTagsContainer = document.getElementById('suggested-tags');
    suggestedTagsContainer.innerHTML = '';
    
    try {
        const mediaQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
            where('type', '==', 'general')
        );
        
        const snapshot = await getDocs(mediaQuery);
        const tagsCount = {};
        
        snapshot.forEach(doc => {
            const tags = doc.data().tags || [];
            tags.forEach(tag => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
        });
        
        // Trie par popularité et affiche les 6 premiers
        const sortedTags = Object.entries(tagsCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([tag]) => tag);
        
        sortedTags.forEach(tag => {
            const tagBtn = document.createElement('button');
            tagBtn.type = 'button';
            tagBtn.className = 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition-colors';
            tagBtn.textContent = tag;
            tagBtn.addEventListener('click', () => {
                const input = document.getElementById('tags-input');
                const currentTags = input.value.split(',').map(t => t.trim()).filter(t => t);
                if (!currentTags.includes(tag)) {
                    currentTags.push(tag);
                    input.value = currentTags.join(', ');
                }
            });
            suggestedTagsContainer.appendChild(tagBtn);
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des tags suggérés:", error);
    }
}

/**
 * Confirme l'upload des photos générales avec les tags
 */
async function confirmGeneralUpload() {
    const tagsInput = document.getElementById('tags-input').value.trim();
    
    if (!tagsInput) {
        showToast("Veuillez ajouter au moins un tag.", "error");
        return;
    }
    
    const tags = tagsInput.split(',').map(t => t.trim()).filter(t => t);
    
    if (tags.length === 0) {
        showToast("Veuillez ajouter au moins un tag valide.", "error");
        return;
    }
    
    // Désactive les boutons
    document.getElementById('confirm-upload-general-btn').disabled = true;
    document.getElementById('cancel-tagging-btn').disabled = true;
    
    // Affiche la barre de progression
    const progressContainer = document.getElementById('upload-progress-container');
    const progressBar = document.getElementById('upload-progress-bar');
    const progressText = document.getElementById('upload-progress-text');
    progressContainer.classList.remove('hidden');
    
    try {
        const totalFiles = selectedFilesGeneral.length;
        let uploadedFiles = 0;
        
        for (const file of selectedFilesGeneral) {
            // Upload vers Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = ref(storage, `users/${userId}/trips/${currentTripId}/general/${fileName}`);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            // Enregistre dans Firestore
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`), {
                type: 'general',
                fileName: file.name,
                storagePath: storageRef.fullPath,
                downloadURL: downloadURL,
                tags: tags,
                fileSize: file.size,
                uploadedAt: serverTimestamp()
            });
            
            uploadedFiles++;
            const progress = Math.round((uploadedFiles / totalFiles) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
        
        showToast(`${totalFiles} photo(s) uploadée(s) avec succès !`, "success");
        
        // Ferme la modale
        toggleModal(document.getElementById('tagging-modal'), false);
        
        // Recharge la galerie
        loadGeneralPhotos();
        loadPopularTags();
        updateSpaceMonitoring();
        
        // Réinitialise
        selectedFilesGeneral = [];
        document.getElementById('upload-general-input').value = '';
        
    } catch (error) {
        console.error("Erreur lors de l'upload:", error);
        showToast("Erreur lors de l'upload des photos.", "error");
    } finally {
        // Réactive les boutons
        document.getElementById('confirm-upload-general-btn').disabled = false;
        document.getElementById('cancel-tagging-btn').disabled = false;
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    }
}

/**
 * Charge et affiche les photos générales (cols/routes)
 */
async function loadGeneralPhotos(filterTag = null) {
    const gridContainer = document.getElementById('general-photos-grid');
    const noPhotosMessage = document.getElementById('no-general-photos');
    
    gridContainer.innerHTML = '<p class="col-span-full text-center text-gray-500">Chargement...</p>';
    
    try {
        let mediaQuery;
        
        if (filterTag) {
            mediaQuery = query(
                collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
                where('type', '==', 'general'),
                where('tags', 'array-contains', filterTag),
                orderBy('uploadedAt', 'desc')
            );
        } else {
            mediaQuery = query(
                collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
                where('type', '==', 'general'),
                orderBy('uploadedAt', 'desc')
            );
        }
        
        const snapshot = await getDocs(mediaQuery);
        
        if (snapshot.empty) {
            gridContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        noPhotosMessage.classList.add('hidden');
        gridContainer.innerHTML = '';
        allGeneralPhotos = [];
        
        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            allGeneralPhotos.push(photo);
            
            const photoCard = document.createElement('div');
            photoCard.className = 'relative group bg-gray-100 rounded-lg overflow-hidden aspect-square';
            photoCard.innerHTML = `
                <img src="${photo.downloadURL}" 
                     alt="${photo.fileName}" 
                     class="w-full h-full object-cover">
                
                <!-- Overlay avec tags -->
                <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                    <div class="flex flex-wrap gap-1">
                        ${photo.tags.map(tag => `
                            <span class="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                                ${tag}
                            </span>
                        `).join('')}
                    </div>
                </div>
                
                <!-- Boutons d'action (visibles au hover) -->
                <div class="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="download-photo-btn bg-blue-600 hover:bg-blue-700 text-white w-8 h-8 rounded-full flex items-center justify-center"
                            data-url="${photo.downloadURL}"
                            data-filename="${photo.fileName}"
                            title="Télécharger">
                        <i class="fas fa-download text-xs"></i>
                    </button>
                    <button class="delete-photo-btn bg-red-600 hover:bg-red-700 text-white w-8 h-8 rounded-full flex items-center justify-center"
                            data-id="${photo.id}"
                            data-path="${photo.storagePath}"
                            title="Supprimer">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                </div>
            `;
            
            gridContainer.appendChild(photoCard);
        });
        
        // Ajoute les listeners sur les boutons
        document.querySelectorAll('.download-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadPhoto(btn.dataset.url, btn.dataset.filename);
            });
        });
        
        document.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePhoto(btn.dataset.id, btn.dataset.path, 'general');
            });
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des photos:", error);
        gridContainer.innerHTML = '<p class="col-span-full text-center text-red-500">Erreur de chargement</p>';
    }
}

/**
 * Charge les tags populaires pour le filtre
 */
async function loadPopularTags() {
    const container = document.getElementById('popular-tags-container');
    container.innerHTML = '';
    
    try {
        const mediaQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
            where('type', '==', 'general')
        );
        
        const snapshot = await getDocs(mediaQuery);
        const tagsCount = {};
        
        snapshot.forEach(doc => {
            const tags = doc.data().tags || [];
            tags.forEach(tag => {
                tagsCount[tag] = (tagsCount[tag] || 0) + 1;
            });
        });
        
        // Trie par popularité
        const sortedTags = Object.entries(tagsCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);
        
        if (sortedTags.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">Aucun tag pour le moment</p>';
            return;
        }
        
        sortedTags.forEach(([tag, count]) => {
            const tagBtn = document.createElement('button');
            tagBtn.type = 'button';
            tagBtn.className = 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition-colors flex items-center gap-2';
            tagBtn.innerHTML = `
                ${tag}
                <span class="bg-purple-300 text-purple-900 px-1.5 py-0.5 rounded-full text-xs font-bold">${count}</span>
            `;
            tagBtn.addEventListener('click', () => {
                document.getElementById('search-tags-input').value = tag;
                loadGeneralPhotos(tag);
            });
            container.appendChild(tagBtn);
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des tags:", error);
    }
}

/**
 * Gère le clic sur "Ajouter photos d'hôtel"
 */
function handleHotelUploadClick() {
    document.getElementById('upload-hotel-input').click();
}

/**
 * Gère la sélection de fichiers pour upload hôtel
 */
function handleHotelFilesSelected(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;
    
    selectedFilesHotel = files;
    
    // Affiche la modale de sélection d'hôtel
    document.getElementById('hotel-files-count').textContent = files.length;
    
    // Charge la liste des hôtels
    loadHotelsForSelection();
    
    toggleModal(document.getElementById('hotel-selection-modal'), true);
}

/**
 * Charge la liste des hôtels/étapes pour la sélection
 */
async function loadHotelsForSelection() {
    const listContainer = document.getElementById('hotels-list-selection');
    listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Chargement des hôtels...</p>';
    
    try {
        // Récupère toutes les étapes du voyage
        const daysQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/days`),
            orderBy('createdAt')
        );
        
        const snapshot = await getDocs(daysQuery);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-center text-gray-500 py-4">Aucune étape dans ce voyage</p>';
            return;
        }
        
        listContainer.innerHTML = '';
        
        snapshot.forEach(doc => {
            const day = doc.data();
            const hotelOption = document.createElement('div');
            hotelOption.className = 'hotel-option border border-gray-300 rounded-md p-3 cursor-pointer hover:bg-blue-50 hover:border-blue-500 transition-colors';
            hotelOption.dataset.dayId = doc.id;
            hotelOption.dataset.hotelName = day.hotelName;
            hotelOption.dataset.dayName = day.dayName;
            hotelOption.dataset.city = day.city || '';
            hotelOption.innerHTML = `
                <p class="font-semibold text-gray-900">
                    <i class="fas fa-map-marker-alt text-gray-400 mr-2"></i>
                    ${day.dayName}${day.city ? ' • ' + day.city : ''}
                </p>
                <p class="text-sm text-gray-600 mt-1">
                    <i class="fas fa-hotel text-gray-400 mr-2"></i>
                    ${day.hotelName}
                </p>
            `;
            
            hotelOption.addEventListener('click', () => {
                // Désélectionne tous
                document.querySelectorAll('.hotel-option').forEach(opt => {
                    opt.classList.remove('bg-blue-100', 'border-blue-500');
                    opt.classList.add('border-gray-300');
                });
                
                // Sélectionne celui-ci
                hotelOption.classList.add('bg-blue-100', 'border-blue-500');
                hotelOption.classList.remove('border-gray-300');
                
                // Stocke la sélection
                selectedHotelForUpload = {
                    dayId: doc.id,
                    hotelName: day.hotelName,
                    dayName: day.dayName
                };
                
                // Active le bouton d'upload
                document.getElementById('confirm-upload-hotel-btn').disabled = false;
            });
            
            listContainer.appendChild(hotelOption);
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des hôtels:", error);
        listContainer.innerHTML = '<p class="text-center text-red-500 py-4">Erreur de chargement</p>';
    }
}

/**
 * Confirme l'upload des photos d'hôtel
 */
async function confirmHotelUpload() {
    if (!selectedHotelForUpload) {
        showToast("Veuillez sélectionner un hôtel.", "error");
        return;
    }
    
    // Désactive les boutons
    document.getElementById('confirm-upload-hotel-btn').disabled = true;
    document.getElementById('cancel-hotel-selection-btn').disabled = true;
    
    // Affiche la barre de progression
    const progressContainer = document.getElementById('upload-hotel-progress-container');
    const progressBar = document.getElementById('upload-hotel-progress-bar');
    const progressText = document.getElementById('upload-hotel-progress-text');
    progressContainer.classList.remove('hidden');
    
    try {
        const totalFiles = selectedFilesHotel.length;
        let uploadedFiles = 0;
        
        for (const file of selectedFilesHotel) {
            // Upload vers Storage
            const timestamp = Date.now();
            const fileName = `${timestamp}_${file.name}`;
            const storageRef = ref(storage, `users/${userId}/trips/${currentTripId}/hotels/${selectedHotelForUpload.dayId}/${fileName}`);
            
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);
            
            // Enregistre dans Firestore
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`), {
                type: 'hotel',
                fileName: file.name,
                storagePath: storageRef.fullPath,
                downloadURL: downloadURL,
                linkedDayId: selectedHotelForUpload.dayId,
                linkedHotelName: selectedHotelForUpload.hotelName,
                fileSize: file.size,
                uploadedAt: serverTimestamp()
            });
            
            uploadedFiles++;
            const progress = Math.round((uploadedFiles / totalFiles) * 100);
            progressBar.style.width = progress + '%';
            progressText.textContent = progress + '%';
        }
        
        showToast(`${totalFiles} photo(s) d'hôtel uploadée(s) avec succès !`, "success");
        
        // Ferme la modale
        toggleModal(document.getElementById('hotel-selection-modal'), false);
        
        // Recharge les données
        loadHotelPhotos();
        updateSpaceMonitoring();
        
        // Recharge les badges des étapes
        loadDays();
        
        // Réinitialise
        selectedFilesHotel = [];
        selectedHotelForUpload = null;
        document.getElementById('upload-hotel-input').value = '';
        
    } catch (error) {
        console.error("Erreur lors de l'upload:", error);
        showToast("Erreur lors de l'upload des photos d'hôtel.", "error");
    } finally {
        // Réactive les boutons
        document.getElementById('confirm-upload-hotel-btn').disabled = false;
        document.getElementById('cancel-hotel-selection-btn').disabled = false;
        progressContainer.classList.add('hidden');
        progressBar.style.width = '0%';
    }
}

/**
 * Charge et affiche les photos d'hôtels groupées par étape
 */
async function loadHotelPhotos(filterHotelName = null) {
    const listContainer = document.getElementById('hotels-photos-list');
    const noPhotosMessage = document.getElementById('no-hotel-photos');
    
    listContainer.innerHTML = '<p class="text-center text-gray-500">Chargement...</p>';
    
    try {
        const mediaQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
            where('type', '==', 'hotel'),
            orderBy('uploadedAt', 'desc')
        );
        
        const snapshot = await getDocs(mediaQuery);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '';
            noPhotosMessage.classList.remove('hidden');
            return;
        }
        
        noPhotosMessage.classList.add('hidden');
        listContainer.innerHTML = '';
        allHotelPhotos = [];
        
        // Groupe les photos par dayId
        const photosByDay = {};
        
        snapshot.forEach(doc => {
            const photo = { id: doc.id, ...doc.data() };
            allHotelPhotos.push(photo);
            
            // Filtre si nécessaire
            if (filterHotelName && !photo.linkedHotelName.toLowerCase().includes(filterHotelName.toLowerCase())) {
                return;
            }
            
            if (!photosByDay[photo.linkedDayId]) {
                photosByDay[photo.linkedDayId] = {
                    hotelName: photo.linkedHotelName,
                    photos: []
                };
            }
            photosByDay[photo.linkedDayId].photos.push(photo);
        });
        
        // Affiche chaque groupe
        for (const [dayId, data] of Object.entries(photosByDay)) {
            const hotelSection = document.createElement('div');
            hotelSection.className = 'bg-gray-50 border border-gray-200 rounded-lg p-4';
            
            // Récupère les infos de l'étape
            const dayDoc = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/days/${dayId}`));
            const dayData = dayDoc.exists() ? dayDoc.data() : { dayName: 'Étape inconnue', city: '' };
            
            hotelSection.innerHTML = `
                <div class="mb-3">
                    <h4 class="font-semibold text-lg text-gray-900">
                        <i class="fas fa-map-marker-alt text-indigo-500 mr-2"></i>
                        ${dayData.dayName}${dayData.city ? ' • ' + dayData.city : ''}
                    </h4>
                    <p class="text-sm text-gray-600">
                        <i class="fas fa-hotel text-gray-400 mr-2"></i>
                        ${data.hotelName}
                    </p>
                </div>
                
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    ${data.photos.map(photo => `
                        <div class="relative group bg-white rounded-lg overflow-hidden aspect-square border border-gray-200">
                            <img src="${photo.downloadURL}" 
                                 alt="${photo.fileName}" 
                                 class="w-full h-full object-cover cursor-pointer"
                                 data-day-id="${dayId}">
                            
                            <!-- Boutons d'action -->
                            <div class="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button class="download-photo-btn bg-blue-600 hover:bg-blue-700 text-white w-7 h-7 rounded-full flex items-center justify-center"
                                        data-url="${photo.downloadURL}"
                                        data-filename="${photo.fileName}"
                                        title="Télécharger">
                                    <i class="fas fa-download text-xs"></i>
                                </button>
                                <button class="delete-photo-btn bg-red-600 hover:bg-red-700 text-white w-7 h-7 rounded-full flex items-center justify-center"
                                        data-id="${photo.id}"
                                        data-path="${photo.storagePath}"
                                        title="Supprimer">
                                    <i class="fas fa-trash text-xs"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <p class="text-xs text-gray-500 mt-3 text-right">
                    ${data.photos.length} photo${data.photos.length > 1 ? 's' : ''}
                </p>
            `;
            
            listContainer.appendChild(hotelSection);
        }
        
        // Ajoute les listeners
        document.querySelectorAll('.download-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                downloadPhoto(btn.dataset.url, btn.dataset.filename);
            });
        });
        
        document.querySelectorAll('.delete-photo-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                deletePhoto(btn.dataset.id, btn.dataset.path, 'hotel');
            });
        });
        
        // Listener pour ouvrir la lightbox
        document.querySelectorAll('[data-day-id]').forEach(img => {
            if (img.tagName === 'IMG') {
                img.addEventListener('click', () => {
                    openHotelLightbox(img.dataset.dayId);
                });
            }
        });
        
    } catch (error) {
        console.error("Erreur lors du chargement des photos d'hôtels:", error);
        listContainer.innerHTML = '<p class="text-center text-red-500">Erreur de chargement</p>';
    }
}

/**
 * Compte les photos d'un hôtel (pour afficher le badge)
 */
async function countHotelPhotos(dayId) {
    try {
        const mediaQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
            where('type', '==', 'hotel'),
            where('linkedDayId', '==', dayId)
        );
        
        const snapshot = await getDocs(mediaQuery);
        const count = snapshot.size;
        
        // Mise en cache
        hotelPhotoCounts[dayId] = count;
        
        return count;
    } catch (error) {
        console.error("Erreur lors du comptage des photos:", error);
        return 0;
    }
}

/**
 * Ouvre la lightbox pour les photos d'un hôtel spécifique
 */
async function openHotelLightbox(dayId) {
    try {
        // Récupère les infos de l'étape
        const dayDoc = await getDoc(doc(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/days/${dayId}`));
        if (!dayDoc.exists()) {
            showToast("Étape introuvable.", "error");
            return;
        }
        
        const dayData = dayDoc.data();
        
        // Récupère les photos
        const mediaQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`),
            where('type', '==', 'hotel'),
            where('linkedDayId', '==', dayId),
            orderBy('uploadedAt', 'asc')
        );
        
        const snapshot = await getDocs(mediaQuery);
        
        if (snapshot.empty) {
            showToast("Aucune photo pour cet hôtel.", "error");
            return;
        }
        
        currentLightboxPhotos = [];
        snapshot.forEach(doc => {
            currentLightboxPhotos.push({ id: doc.id, ...doc.data() });
        });
        
        currentLightboxIndex = 0;
        
        // Met à jour l'en-tête
        document.getElementById('lightbox-hotel-name').textContent = dayData.hotelName;
        document.getElementById('lightbox-day-name').textContent = `${dayData.dayName}${dayData.city ? ' • ' + dayData.city : ''}`;
        
        // Affiche la première photo
        updateLightboxDisplay();
        
        // Ouvre la modale
        toggleModal(document.getElementById('hotel-lightbox-modal'), true);
        
    } catch (error) {
        console.error("Erreur lors de l'ouverture de la lightbox:", error);
        showToast("Erreur lors du chargement des photos.", "error");
    }
}

/**
 * Met à jour l'affichage de la lightbox
 */
function updateLightboxDisplay() {
    const currentPhoto = currentLightboxPhotos[currentLightboxIndex];
    
    // Image principale
    document.getElementById('lightbox-main-image').src = currentPhoto.downloadURL;
    
    // Compteur
    document.getElementById('lightbox-current-index').textContent = currentLightboxIndex + 1;
    document.getElementById('lightbox-total-count').textContent = currentLightboxPhotos.length;
    
    // Miniatures
    const thumbnailsContainer = document.getElementById('lightbox-thumbnails');
    thumbnailsContainer.innerHTML = '';
    
    currentLightboxPhotos.forEach((photo, index) => {
        const thumb = document.createElement('img');
        thumb.src = photo.downloadURL;
        thumb.alt = photo.fileName;
        thumb.className = `w-20 h-20 object-cover rounded cursor-pointer border-2 transition-all ${
            index === currentLightboxIndex ? 'border-purple-600 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
        }`;
        thumb.addEventListener('click', () => {
            currentLightboxIndex = index;
            updateLightboxDisplay();
        });
        thumbnailsContainer.appendChild(thumb);
    });
    
    // Bouton download
    const downloadBtn = document.getElementById('lightbox-download-btn');
    downloadBtn.onclick = () => downloadPhoto(currentPhoto.downloadURL, currentPhoto.fileName);
    
    // Gère la visibilité des boutons de navigation
    document.getElementById('lightbox-prev-btn').style.display = 
        currentLightboxPhotos.length > 1 ? 'flex' : 'none';
    document.getElementById('lightbox-next-btn').style.display = 
        currentLightboxPhotos.length > 1 ? 'flex' : 'none';
}

/**
 * Navigation précédent dans la lightbox
 */
function lightboxPrev() {
    if (currentLightboxIndex > 0) {
        currentLightboxIndex--;
        updateLightboxDisplay();
    } else {
        // Boucle vers la fin
        currentLightboxIndex = currentLightboxPhotos.length - 1;
        updateLightboxDisplay();
    }
}

/**
 * Navigation suivant dans la lightbox
 */
function lightboxNext() {
    if (currentLightboxIndex < currentLightboxPhotos.length - 1) {
        currentLightboxIndex++;
        updateLightboxDisplay();
    } else {
        // Boucle vers le début
        currentLightboxIndex = 0;
        updateLightboxDisplay();
    }
}

/**
 * Télécharge une photo
 */
async function downloadPhoto(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        link.click();
        URL.revokeObjectURL(link.href);
        showToast("Photo téléchargée !", "success");
    } catch (error) {
        console.error("Erreur lors du téléchargement:", error);
        showToast("Erreur lors du téléchargement.", "error");
    }
}

/**
 * Supprime une photo
 */
async function deletePhoto(mediaId, storagePath, type) {
    showDeleteConfirm("Voulez-vous vraiment supprimer cette photo ?", async () => {
        try {
            // Supprime de Storage
            const storageRef = ref(storage, storagePath);
            await deleteObject(storageRef);
            
            // Supprime de Firestore
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media/${mediaId}`));
            
            showToast("Photo supprimée.", "success");
            
            // Recharge l'affichage
            if (type === 'general') {
                loadGeneralPhotos();
                loadPopularTags();
            } else {
                loadHotelPhotos();
                loadDays(); // Pour mettre à jour les badges
            }
            
            updateSpaceMonitoring();
            
        } catch (error) {
            console.error("Erreur lors de la suppression:", error);
            showToast("Erreur lors de la suppression.", "error");
        }
    });
}

/**
 * Met à jour le monitoring de l'espace utilisé
 */
async function updateSpaceMonitoring() {
    try {
        const mediaQuery = query(
            collection(db, `artifacts/${appId}/users/${userId}/trips/${currentTripId}/media`)
        );
        
        const snapshot = await getDocs(mediaQuery);
        
        let totalSizeGeneral = 0;
        let totalSizeHotels = 0;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.type === 'general') {
                totalSizeGeneral += data.fileSize || 0;
            } else {
                totalSizeHotels += data.fileSize || 0;
            }
        });
        
        // Conversion en MB
        const totalMBGeneral = (totalSizeGeneral / (1024 * 1024)).toFixed(2);
        const totalMBHotels = (totalSizeHotels / (1024 * 1024)).toFixed(2);
        const totalGB = 5;
        
        // Pourcentage
        const percentGeneral = (totalSizeGeneral / (totalGB * 1024 * 1024 * 1024)) * 100;
        const percentHotels = (totalSizeHotels / (totalGB * 1024 * 1024 * 1024)) * 100;
        
        // Mise à jour de l'affichage
        document.getElementById('space-used-general').textContent = totalMBGeneral + ' MB';
        document.getElementById('space-bar-general').style.width = Math.min(percentGeneral, 100) + '%';
        
        document.getElementById('space-used-hotels').textContent = totalMBHotels + ' MB';
        document.getElementById('space-bar-hotels').style.width = Math.min(percentHotels, 100) + '%';
        
    } catch (error) {
        console.error("Erreur lors du calcul de l'espace:", error);
    }
}

/**
 * Recherche dans les tags (avec debounce)
 */
let searchTagsTimeout = null;
function handleSearchTags(event) {
    const searchTerm = event.target.value.trim();
    
    if (searchTagsTimeout) {
        clearTimeout(searchTagsTimeout);
    }
    
    searchTagsTimeout = setTimeout(() => {
        if (searchTerm) {
            loadGeneralPhotos(searchTerm);
        } else {
            loadGeneralPhotos();
        }
    }, 300);
}

/**
 * Recherche dans les hôtels (avec debounce)
 */
let searchHotelsTimeout = null;
function handleSearchHotels(event) {
    const searchTerm = event.target.value.trim();
    
    if (searchHotelsTimeout) {
        clearTimeout(searchHotelsTimeout);
    }
    
    searchHotelsTimeout = setTimeout(() => {
        if (searchTerm) {
            loadHotelPhotos(searchTerm);
        } else {
            loadHotelPhotos();
        }
    }, 300);
}
```

---

## 🔄 Modification de la fonction loadDays()

**DANS la fonction `loadDays()` existante, modifier la boucle `snapshot.forEach()`** :

Chercher cette ligne :
```javascript
snapshot.forEach((doc) => {
```

Remplacer par :
```javascript
snapshot.forEach(async (doc) => {
```

Puis, **juste après** :
```javascript
const day = doc.data();
day.id = doc.id;
allDaysCache.push(day);
```

**Ajouter** :
```javascript
// NOUVEAU : Compte les photos de l'hôtel
const hotelPhotosCount = await countHotelPhotos(day.id);
```

Ensuite, dans le HTML de la carte (dayEl.innerHTML), **ajouter le bouton 📷 entre le bouton "Modifier" et "Copier/Déplacer"** :

```javascript
<!-- NOUVEAU BOUTON PHOTO HÔTEL -->
<button data-day-id="${day.id}" 
        class="view-hotel-photos-btn relative text-indigo-600 hover:text-indigo-800 opacity-60 hover:opacity-100 transition-opacity ${hotelPhotosCount === 0 ? 'cursor-not-allowed opacity-30' : ''}"
        ${hotelPhotosCount === 0 ? 'disabled' : ''}
        title="Photos de l'hôtel (${hotelPhotosCount})">
    <i class="fas fa-camera"></i>
    ${hotelPhotosCount > 0 ? `<span class="absolute -top-1 -right-1 bg-green-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">${hotelPhotosCount}</span>` : ''}
</button>
```

Enfin, **avant la ligne `daysListEl.appendChild(dayEl);`**, ajouter :

```javascript
// NOUVEAU : Listener pour le bouton photo
dayEl.querySelector('.view-hotel-photos-btn')?.addEventListener('click', () => {
    if (hotelPhotosCount > 0) {
        openHotelLightbox(day.id);
    }
});
```

---

## 🔗 Event Listeners à Ajouter

**À la toute fin du script, APRÈS `startApp();`** :

```javascript
// ============================================
// LISTENERS POUR LE SYSTÈME DE MÉDIAS
// ============================================

// Bouton principal "Médias"
document.getElementById('manage-media-btn').addEventListener('click', openMediaManager);

// Fermeture de la modale principale
document.getElementById('close-media-manager-btn').addEventListener('click', () => {
    toggleModal(document.getElementById('media-manager-modal'), false);
});

// Onglets
document.getElementById('tab-general-btn').addEventListener('click', () => switchTab('general'));
document.getElementById('tab-hotels-btn').addEventListener('click', () => switchTab('hotels'));

// Upload général
document.getElementById('upload-general-btn').addEventListener('click', handleGeneralUploadClick);
document.getElementById('upload-general-input').addEventListener('change', handleGeneralFilesSelected);
document.getElementById('confirm-upload-general-btn').addEventListener('click', confirmGeneralUpload);
document.getElementById('cancel-tagging-btn').addEventListener('click', () => {
    toggleModal(document.getElementById('tagging-modal'), false);
    selectedFilesGeneral = [];
    document.getElementById('upload-general-input').value = '';
});

// Upload hôtel
document.getElementById('upload-hotel-btn').addEventListener('click', handleHotelUploadClick);
document.getElementById('upload-hotel-input').addEventListener('change', handleHotelFilesSelected);
document.getElementById('confirm-upload-hotel-btn').addEventListener('click', confirmHotelUpload);
document.getElementById('cancel-hotel-selection-btn').addEventListener('click', () => {
    toggleModal(document.getElementById('hotel-selection-modal'), false);
    selectedFilesHotel = [];
    selectedHotelForUpload = null;
    document.getElementById('upload-hotel-input').value = '';
});

// Recherche
document.getElementById('search-tags-input').addEventListener('input', handleSearchTags);
document.getElementById('search-hotels-input').addEventListener('input', handleSearchHotels);

// Lightbox
document.getElementById('close-lightbox-btn').addEventListener('click', () => {
    toggleModal(document.getElementById('hotel-lightbox-modal'), false);
});
document.getElementById('lightbox-prev-btn').addEventListener('click', lightboxPrev);
document.getElementById('lightbox-next-btn').addEventListener('click', lightboxNext);

// Navigation clavier dans la lightbox
document.addEventListener('keydown', (e) => {
    const lightboxModal = document.getElementById('hotel-lightbox-modal');
    if (!lightboxModal.classList.contains('hidden')) {
        if (e.key === 'ArrowLeft') {
            lightboxPrev();
        } else if (e.key === 'ArrowRight') {
            lightboxNext();
        } else if (e.key === 'Escape') {
            toggleModal(lightboxModal, false);
        }
    }
});

// Fermeture des modales en cliquant sur le fond
[
    'media-manager-modal',
    'tagging-modal',
    'hotel-selection-modal',
    'hotel-lightbox-modal'
].forEach(modalId => {
    const modal = document.getElementById(modalId);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            toggleModal(modal, false);
        }
    });
});
```

---

## ✅ Checklist de Validation

### Phase 1 - Structure de Base
- [ ] Import Firebase Storage ajouté
- [ ] Variable `storage` initialisée dans `initAuth()`
- [ ] Les 4 modales HTML ajoutées avant `</body>`
- [ ] Bouton "Médias" ajouté dans l'interface voyage
- [ ] Variables globales ajoutées (8 variables)

### Phase 2 - Onglet "Cols & Routes"
- [ ] Upload multi-fichiers fonctionnel
- [ ] Modale de tagging s'affiche
- [ ] Tags suggérés chargés dynamiquement
- [ ] Photos uploadées apparaissent dans la galerie
- [ ] Filtrage par tag fonctionnel
- [ ] Boutons download/delete opérationnels
- [ ] Tags populaires affichés avec compteurs

### Phase 3 - Onglet "Hôtels"
- [ ] Modale de sélection d'hôtel affiche toutes les étapes
- [ ] Upload lié à un `dayId` correct
- [ ] Photos groupées par hôtel dans l'affichage
- [ ] Recherche d'hôtel fonctionnelle

### Phase 4 - Bouton 📷 dans les Étapes
- [ ] Bouton ajouté dans `loadDays()`
- [ ] Compteur de photos correct (`countHotelPhotos`)
- [ ] Badge vert affiché si photos > 0
- [ ] Bouton grisé si 0 photo
- [ ] Clic ouvre la lightbox

### Phase 5 - Lightbox
- [ ] Affiche la photo principale
- [ ] Navigation ◀️ ▶️ fonctionne
- [ ] Miniatures cliquables
- [ ] Compteur "Photo X / Y" correct
- [ ] Bouton download fonctionne
- [ ] Touches clavier (flèches, ESC) fonctionnent

### Phase 6 - Finitions
- [ ] Monitoring de l'espace affiché correctement (2 barres)
- [ ] Barres de progression pendant upload
- [ ] Confirmations de suppression
- [ ] Messages d'erreur pertinents
- [ ] Toasts de succès
- [ ] Interface responsive (mobile)

---

## 🐛 Tests à Effectuer

### Test 1 - Upload Général
1. Ouvrir la modale Médias
2. Onglet "Cols & Routes"
3. Cliquer "Ajouter des photos"
4. Sélectionner 3 images
5. Ajouter tags : "Stelvio, Col, Italie"
6. Uploader
7. ✅ Vérifier : Photos dans la galerie + Tags affichés

### Test 2 - Upload Hôtel
1. Onglet "Hôtels"
2. Cliquer "Ajouter photos d'hôtel"
3. Sélectionner 2 images
4. Choisir un hôtel dans la liste
5. Uploader
6. ✅ Vérifier : Photos dans la section de l'hôtel + Badge sur l'étape

### Test 3 - Filtrage
1. Onglet "Cols & Routes"
2. Taper "Stelvio" dans la recherche
3. ✅ Vérifier : Seules les photos avec tag "Stelvio" s'affichent

### Test 4 - Lightbox
1. Cliquer sur bouton 📷 d'une étape avec photos
2. ✅ Vérifier : Lightbox s'ouvre avec la première photo
3. Cliquer sur ▶️
4. ✅ Vérifier : Photo suivante s'affiche
5. Cliquer sur une miniature
6. ✅ Vérifier : Photo correspondante s'affiche

### Test 5 - Suppression
1. Supprimer une photo générale
2. ✅ Vérifier : Confirmation demandée
3. Confirmer
4. ✅ Vérifier : Photo disparue + Tags mis à jour
5. Supprimer une photo d'hôtel
6. ✅ Vérifier : Badge de l'étape mis à jour

### Test 6 - Monitoring
1. Uploader plusieurs photos
2. ✅ Vérifier : Barres de progression pendant upload
3. ✅ Vérifier : Espace utilisé mis à jour
4. ✅ Vérifier : Barres d'espace (bleue/indigo) affichées

---

## 🎉 Résultat Final

Une fois terminé, l'application aura :

✅ Système complet de gestion de photos  
✅ Upload avec tags (cols/routes) ou lié à un hôtel  
✅ Recherche/filtre par tags ou nom d'hôtel  
✅ Visualisation en lightbox avec navigation  
✅ Download individuel des photos  
✅ Suppression avec confirmation  
✅ Monitoring de l'espace utilisé (5GB)  
✅ Badge sur chaque étape indiquant le nombre de photos  
✅ Interface moderne et responsive  

---

**Bon courage pour l'implémentation ! 🚀**
