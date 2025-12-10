# 📊 Système de Logs en Temps Réel pour l'Import Excel

## 🎯 Objectif

Afficher les logs d'import en temps réel dans l'interface utilisateur pour que l'admin voie exactement ce qui se passe pendant l'import (parsing Gemini, création des hôtels, téléchargement des photos, etc.).

---

## 🏗️ Architecture

```
Frontend (hotels.js)
    ↓ POST /api/hotels/import-excel
    ↓ Ouvre une connexion streaming
Backend (admin.py)
    ↓ Fonction generator qui yield les événements JSON
    ↓ {"type": "log", "message": "📊 Fichier lu: 80 lignes"}
    ↓ {"type": "progress", "current": 1, "total": 75}
    ↓ {"type": "log", "message": "✅ Hôtel 1/75 importé"}
    ↓ {"type": "complete", "imported": 73, "skipped": 2}
Frontend
    ↓ ReadableStream API pour lire les chunks
    ↓ Affiche chaque log dans une console en temps réel
```

---

## 📝 Implémentation Backend (admin.py)

### Étape 1: Importer Flask Response et stream_with_context

```python
from flask import Response, stream_with_context
import json
```

### Étape 2: Modifier l'endpoint /api/hotels/import-excel

```python
@bp.route('/api/hotels/import-excel', methods=['POST'])
@login_required
def api_import_hotels_from_excel():
    """API: Importe avec streaming des logs en temps réel"""
    user_id = get_current_user_id()
    
    def generate_import_logs():
        """Générateur qui yield les logs un par un"""
        import pandas as pd
        from app.services.gemini_service import parse_full_excel_file
        from datetime import datetime
        import requests
        
        try:
            # 1. Validation fichier
            yield json.dumps({'type': 'log', 'message': '📁 Validation du fichier...'}) + '\n'
            
            if 'file' not in request.files:
                yield json.dumps({'type': 'error', 'message': 'Aucun fichier fourni'}) + '\n'
                return
            
            file = request.files['file']
            
            if file.filename == '':
                yield json.dumps({'type': 'error', 'message': 'Nom de fichier vide'}) + '\n'
                return
            
            if not file.filename.lower().endswith(('.xlsx', '.xls')):
                yield json.dumps({'type': 'error', 'message': 'Format invalide (xlsx, xls uniquement)'}) + '\n'
                return
            
            # 2. Récupération paramètres
            partner_id = request.form.get('partnerId')
            if not partner_id:
                yield json.dumps({'type': 'error', 'message': 'Partenaire requis'}) + '\n'
                return
            
            download_photos = request.form.get('downloadPhotos', 'false').lower() == 'true'
            skip_duplicates = request.form.get('skipDuplicates', 'true').lower() == 'true'
            
            # 3. Lecture Excel
            yield json.dumps({'type': 'log', 'message': '📊 Lecture du fichier Excel...'}) + '\n'
            
            try:
                df = pd.read_excel(file, sheet_name=0, header=None)
                yield json.dumps({'type': 'log', 'message': f'📊 Fichier Excel lu: {len(df)} lignes brutes'}) + '\n'
                
                excel_text = df.to_string(index=False, header=False, max_rows=200)
                yield json.dumps({'type': 'log', 'message': f'📝 Texte préparé: {len(excel_text)} caractères'}) + '\n'
            except Exception as e:
                yield json.dumps({'type': 'error', 'message': f'Erreur lecture Excel: {str(e)}'}) + '\n'
                return
            
            # 4. Parsing Gemini
            yield json.dumps({'type': 'log', 'message': '🤖 Envoi à Gemini AI pour parsing...'}) + '\n'
            
            hotels_data = parse_full_excel_file(excel_text)
            
            if not hotels_data:
                yield json.dumps({'type': 'error', 'message': 'Gemini n\'a pas pu parser le fichier'}) + '\n'
                return
            
            yield json.dumps({'type': 'log', 'message': f'✅ Gemini a extrait {len(hotels_data)} hôtel(s)'}) + '\n'
            
            # 5. Import de chaque hôtel
            firebase = get_firebase_service()
            imported = 0
            skipped = 0
            errors = []
            
            for idx, parsed in enumerate(hotels_data, 1):
                try:
                    # Mise à jour progression
                    yield json.dumps({
                        'type': 'progress',
                        'current': idx,
                        'total': len(hotels_data)
                    }) + '\n'
                    
                    # Log de l'hôtel en cours
                    yield json.dumps({
                        'type': 'log',
                        'message': f'🏨 Import {idx}/{len(hotels_data)}: {parsed["name"]}'
                    }) + '\n'
                    
                    # Validation
                    if not parsed.get('name') or not parsed.get('city'):
                        error_msg = f'❌ Hôtel {idx}: Données incomplètes'
                        yield json.dumps({'type': 'log', 'message': error_msg}) + '\n'
                        errors.append(error_msg)
                        continue
                    
                    # Vérification doublons
                    if skip_duplicates:
                        existing = firebase.search_hotels(user_id, parsed['name'], parsed['city'])
                        duplicate = next((h for h in existing 
                                        if h['name'].lower() == parsed['name'].lower() 
                                        and h['city'].lower() == parsed['city'].lower()), None)
                        
                        if duplicate:
                            skipped += 1
                            yield json.dumps({
                                'type': 'log',
                                'message': f'⏭️ Hôtel {idx}: Doublon ignoré ({parsed["name"]})'
                            }) + '\n'
                            continue
                    
                    # Création hôtel
                    hotel_data = {
                        'name': parsed['name'],
                        'city': parsed['city'],
                        'address': parsed['address'],
                        'description': parsed['description'],
                        'type': parsed['type'],
                        'partnerIds': [partner_id],
                        'contact': {
                            'phone': parsed['phone'],
                            'email': '',
                            'website': parsed['website']
                        },
                        'photos': []
                    }
                    
                    hotel_id = firebase.create_hotel(user_id, hotel_data)
                    
                    if hotel_id:
                        imported += 1
                        yield json.dumps({
                            'type': 'log',
                            'message': f'✅ {parsed["name"]} importé'
                        }) + '\n'
                        
                        # Téléchargement photos si demandé
                        if download_photos:
                            yield json.dumps({
                                'type': 'log',
                                'message': f'📸 Téléchargement photos pour {parsed["name"]}...'
                            }) + '\n'
                            
                            # TODO: Implémenter téléchargement photos Google avec logs
                            # Pour chaque photo téléchargée:
                            # yield json.dumps({'type': 'log', 'message': f'📸 Photo {i}/5 téléchargée'}) + '\n'
                    else:
                        error_msg = f'❌ Erreur création hôtel: {parsed["name"]}'
                        yield json.dumps({'type': 'log', 'message': error_msg}) + '\n'
                        errors.append(error_msg)
                
                except Exception as row_error:
                    error_msg = f'❌ Erreur hôtel {idx}: {str(row_error)}'
                    yield json.dumps({'type': 'log', 'message': error_msg}) + '\n'
                    errors.append(error_msg)
            
            # 6. Rapport final
            yield json.dumps({
                'type': 'complete',
                'imported': imported,
                'skipped': skipped,
                'errors': len(errors)
            }) + '\n'
            
        except Exception as e:
            yield json.dumps({'type': 'error', 'message': str(e)}) + '\n'
    
    # Retourne une Response avec streaming
    return Response(
        stream_with_context(generate_import_logs()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'  # Pour Nginx
        }
    )
```

---

## 📝 Implémentation Frontend (hotels.js)

### Étape 1: Modifier la fonction startImport()

```javascript
async function startImport() {
    if (!selectedExcelFile) {
        showToast('Aucun fichier sélectionné', 'error');
        return;
    }
    
    const partnerId = document.getElementById('importPartner').value;
    if (!partnerId) {
        showToast('Veuillez sélectionner un partenaire', 'error');
        return;
    }
    
    // Prépare le FormData
    const formData = new FormData();
    formData.append('file', selectedExcelFile);
    formData.append('partnerId', partnerId);
    formData.append('downloadPhotos', document.getElementById('importDownloadPhotos').checked);
    formData.append('skipDuplicates', document.getElementById('importSkipDuplicates').checked);
    
    // Désactive le bouton
    const btnStart = document.getElementById('btnStartImport');
    const originalHTML = btnStart.innerHTML;
    btnStart.disabled = true;
    btnStart.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Import en cours...';
    
    // Affiche les containers
    const progressDiv = document.getElementById('importProgress');
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');
    const logsContainer = document.getElementById('importLogs');
    
    progressDiv.classList.remove('hidden');
    logsContainer.classList.remove('hidden');
    logsContainer.innerHTML = '';
    
    try {
        // Lance le fetch avec streaming
        const response = await fetch('/admin/api/hotels/import-excel', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        // Lecture du stream
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        
        while (true) {
            const {done, value} = await reader.read();
            
            if (done) {
                console.log('✅ Stream terminé');
                break;
            }
            
            // Décode le chunk et l'ajoute au buffer
            buffer += decoder.decode(value, {stream: true});
            
            // Traite toutes les lignes complètes dans le buffer
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Garde la dernière ligne incomplète
            
            for (const line of lines) {
                if (!line.trim()) continue;
                
                try {
                    const event = JSON.parse(line);
                    handleStreamEvent(event, progressBar, progressText, logsContainer);
                } catch (e) {
                    console.warn('Parse error:', e, line);
                }
            }
        }
        
        // Affiche le rapport après quelques secondes
        setTimeout(() => {
            loadHotels(); // Recharge les hôtels
            setTimeout(() => {
                closeImportModal();
            }, 3000);
        }, 2000);
        
    } catch (error) {
        console.error('❌ Erreur import:', error);
        showToast(`Erreur lors de l'import: ${error.message}`, 'error');
        
        // Réactive le bouton
        btnStart.disabled = false;
        btnStart.innerHTML = originalHTML;
        progressDiv.classList.add('hidden');
    }
}

/**
 * Gère un événement du stream
 */
function handleStreamEvent(event, progressBar, progressText, logsContainer) {
    switch (event.type) {
        case 'log':
            // Affiche le log dans la console
            addLogEntry(event.message, logsContainer);
            break;
            
        case 'progress':
            // Met à jour la barre de progression
            const percent = Math.round((event.current / event.total) * 100);
            progressBar.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
            break;
            
        case 'complete':
            // Affiche le rapport final
            progressBar.style.width = '100%';
            progressText.textContent = '100%';
            addLogEntry(`✅ Import terminé: ${event.imported} importés, ${event.skipped} ignorés, ${event.errors} erreurs`, logsContainer, 'success');
            
            // Affiche aussi le rapport dans la div prévue
            document.getElementById('reportImported').textContent = event.imported;
            document.getElementById('reportSkipped').textContent = event.skipped;
            document.getElementById('reportErrors').textContent = event.errors;
            document.getElementById('importReport').classList.remove('hidden');
            break;
            
        case 'error':
            // Affiche l'erreur
            addLogEntry(`❌ Erreur: ${event.message}`, logsContainer, 'error');
            showToast(event.message, 'error');
            break;
    }
}

/**
 * Ajoute une ligne de log dans la console
 */
function addLogEntry(message, container, type = 'info') {
    const logLine = document.createElement('div');
    
    // Style selon le type
    let bgColor = 'bg-gray-800';
    let textColor = 'text-green-400';
    
    if (type === 'error') {
        bgColor = 'bg-red-900';
        textColor = 'text-red-200';
    } else if (type === 'success') {
        bgColor = 'bg-green-900';
        textColor = 'text-green-200';
    }
    
    logLine.className = `${textColor} font-mono text-xs py-1 px-2 border-b border-gray-700`;
    
    // Ajoute timestamp
    const now = new Date();
    const timestamp = now.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
    
    logLine.textContent = `[${timestamp}] ${message}`;
    container.appendChild(logLine);
    
    // Auto-scroll vers le bas
    container.scrollTop = container.scrollHeight;
}
```

---

## 📝 Modification HTML (hotels.html)

Ajouter un conteneur pour les logs en temps réel dans la modale d'import :

```html
<!-- Console de logs en temps réel -->
<div id="importLogs" class="hidden mt-4 bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
    <!-- Les logs apparaîtront ici -->
</div>
```

---

## 🎨 Résultat Attendu

```
Console d'import (style terminal):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[15:32:10] 📁 Validation du fichier...
[15:32:10] 📊 Fichier Excel lu: 80 lignes brutes
[15:32:11] 📝 Texte préparé: 8521 caractères
[15:32:11] 🤖 Envoi à Gemini AI pour parsing...
[15:32:15] ✅ Gemini a extrait 75 hôtel(s)
[15:32:15] 🏨 Import 1/75: Les Glaneuses
[15:32:16] ✅ Les Glaneuses importé
[15:32:16] 📸 Téléchargement photos pour Les Glaneuses...
[15:32:18] 📸 Photo 1/5 téléchargée
[15:32:19] 📸 Photo 2/5 téléchargée
[15:32:20] 🏨 Import 2/75: La Mosane
[15:32:21] ✅ La Mosane importé
...
[15:33:45] ✅ Import terminé: 73 importés, 2 ignorés
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ✅ Avantages

1. **Visibilité totale** : L'utilisateur voit exactement ce qui se passe
2. **Progression réelle** : Pas de simulation, vraie progression
3. **Débogage facile** : Logs détaillés en cas d'erreur
4. **Expérience pro** : Look & feel terminal, rassurant
5. **Performance** : Stream progressif, pas de timeout
6. **Feedback immédiat** : L'utilisateur sait immédiatement si un hôtel a été importé ou ignoré

---

## 📚 Références

- [Flask Streaming Responses](https://flask.palletsprojects.com/en/2.3.x/patterns/streaming/)
- [MDN ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
