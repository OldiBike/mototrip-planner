# SPRINT 3 - TÂCHES RESTANTES

**Date**: 15/11/2025  
**Statut actuel**: Backend 100% ✅ | Frontend 30% 🔄

---

## 📋 CE QUI RESTE À FAIRE

### 🎨 PRIORITÉ 1 : Templates HTML (Essentiel pour tester)

#### Templates Authentification
```
📁 app/templates/auth/
  ✅ login.html (fait)
  ✅ register.html (fait)
  ❌ join.html - Page pour participants invités
  ❌ profile.html - Gestion du profil utilisateur
```

**Template join.html** :
- Formulaire similaire à register.html
- Pré-remplit email et nom depuis l'invitation
- Mot de passe + confirmation
- Bouton "Rejoindre le voyage"

**Template profile.html** :
- Affiche infos utilisateur
- Formulaire édition (prénom, nom, téléphone)
- Changement de mot de passe (optionnel)

---

#### Templates Voyages Publics (Vitrine)
```
📁 app/templates/trips/
  ❌ list.html - Liste tous les voyages publiés
  ❌ detail.html - Détail d'un voyage + formulaire réservation
```

**Template list.html** :
- Grid/Liste des voyages disponibles
- Affiche : photos, titre, prix, durée, highlights
- Lien vers détail : `/voyages/<slug>`
- **NE PAS AFFICHER** : itinéraire détaillé, noms hôtels, GPX

**Template detail.html** :
- Hero avec photos du voyage
- Description + points forts
- Prix par personne
- **Formulaire de réservation** :
  - Email
  - Nombre de participants (1-20)
  - Dates souhaitées (start_date, end_date)
  - Bouton "Réserver" → POST `/voyages/<slug>/book`
- **Ne pas afficher** : itinéraire complet, hôtels, fichiers

---

#### Templates Réservations Privées
```
📁 app/templates/bookings/
  ❌ my_bookings.html - Liste de mes réservations
  ❌ detail.html - Détail complet avec participants
  ❌ stats.html - Statistiques admin (optionnel)
```

**Template my_bookings.html** :
- Liste des réservations de l'utilisateur connecté
- Pour chaque réservation :
  - Nom du voyage
  - Dates
  - Statut paiement (badge coloré)
  - Participants (X/Y)
  - Lien vers détail
- Bouton "Découvrir d'autres voyages" → `/voyages`

**Template detail.html** :
- **Infos voyage** : Nom, dates, description COMPLÈTE
- **Itinéraire détaillé** : Toutes les étapes jour par jour
- **Hôtels** : Noms, adresses, liens
- **Fichiers GPX** : Téléchargement
- **Participants** :
  - Liste avec rôle (organisateur/membre)
  - Type (pilote/passager)
  - Statut compte (créé ou en attente)
  - Bouton "Ajouter participant" (si organisateur/admin)
  - Bouton "Retirer" par participant (si organisateur/admin)
- **Paiement** :
  - Acompte payé / Solde restant
  - Bouton "Payer le solde" (si applicable)
- **Stats groupe** :
  - X motos
  - Y pilotes + Z passagers = Total personnes

**Template stats.html** (optionnel) :
- Dashboard admin avec métriques
- Nombre total réservations
- Revenus
- Taux conversion

---

### ✉️ PRIORITÉ 2 : Système d'Emails

#### Créer le service
```python
# app/services/email_service.py

class EmailService:
    def send_booking_confirmation(self, email, booking, access_token):
        """Email post-paiement acompte à l'organisateur"""
        # Sujet: Votre réservation est confirmée ! 🎉
        # Contenu:
        #   - Merci pour votre acompte
        #   - Récap : voyage, dates, participants, montant
        #   - Lien création compte: /auth/register/{access_token}
        #   - Prochaines étapes
        pass
    
    def send_participant_invitation(self, email, participant, booking, invitation_token):
        """Email invitation à un membre du groupe"""
        # Sujet: Vous êtes invité au voyage {nom} ! 🏍️
        # Contenu:
        #   - {Organisateur} vous invite
        #   - Infos voyage (teaser)
        #   - Dates
        #   - Lien création compte: /auth/join/{invitation_token}
        pass
    
    def send_payment_reminder(self, email, booking, payment_link):
        """Email rappel paiement solde"""
        # Sujet: Finalisez votre paiement pour {voyage}
        # Contenu:
        #   - Votre voyage approche
        #   - Solde restant: {montant} €
        #   - Lien paiement Stripe
        #   - Date limite
        pass
    
    def send_account_created_confirmation(self, email, booking):
        """Email confirmation création compte"""
        # Sujet: Bienvenue ! Votre compte est créé
        # Contenu:
        #   - Confirmation
        #   - Accès voyage: /bookings/{booking_id}
        #   - Prochaines étapes
        pass
```

#### Configuration
```bash
# .env
EMAIL_SERVICE=sendgrid  # ou "ses" ou "smtp"
SENDGRID_API_KEY=xxx
SENDGRID_FROM_EMAIL=noreply@mototrip.com
SENDGRID_FROM_NAME=MotoTrip
```

#### Intégration
```python
# Dans app/routes/webhooks.py
# Après succès paiement acompte
email_service = EmailService()
email_service.send_booking_confirmation(
    email=organizer_email,
    booking=booking,
    access_token=booking.access_token
)

# Dans app/routes/bookings.py
# Après ajout participant
email_service.send_participant_invitation(
    email=participant.email,
    participant=participant,
    booking=booking,
    invitation_token=participant.invitation_token
)
```

---

### 🔧 PRIORITÉ 3 : Intégration Admin

#### Enrichir customer_detail.html

**Ajouter section "Réservations" après "Voyages assignés"** :
```html
<!-- Section Réservations de groupe -->
<div class="card mb-4">
    <div class="card-header">
        <h5>📅 Réservations</h5>
    </div>
    <div class="card-body">
        {% if bookings %}
            <table class="table">
                <thead>
                    <tr>
                        <th>Voyage</th>
                        <th>Dates</th>
                        <th>Participants</th>
                        <th>Statut</th>
                        <th>Paiement</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {% for booking in bookings %}
                    <tr>
                        <td>{{ booking.trip_name }}</td>
                        <td>{{ booking.start_date }} → {{ booking.end_date }}</td>
                        <td>{{ booking.current_participants }}/{{ booking.total_participants }}</td>
                        <td><span class="badge bg-{{ booking.status_color }}">{{ booking.status }}</span></td>
                        <td>{{ booking.payment_progress }}%</td>
                        <td>
                            <a href="{{ url_for('bookings.booking_detail', booking_id=booking.booking_id) }}" class="btn btn-sm btn-primary">Détails</a>
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        {% else %}
            <p class="text-muted">Aucune réservation.</p>
        {% endif %}
    </div>
</div>
```

#### Route admin à ajouter
```python
# app/routes/admin.py

@bp.route('/bookings')
@admin_required
def list_bookings():
    """Liste toutes les réservations"""
    firebase = FirebaseService(Config.APP_ID)
    # TODO: Récupérer toutes les bookings
    # Filtres : statut, dates, voyage
    return render_template('admin/bookings.html', bookings=bookings)
```

---

### 🚀 PRIORITÉ 4 : Publication de voyages

#### Route admin à créer
```python
# app/routes/admin.py

@bp.route('/trips/<trip_id>/publish', methods=['GET', 'POST'])
@admin_required
def publish_trip(trip_id):
    """Publie un voyage vers la vitrine publique"""
    firebase = FirebaseService(Config.APP_ID)
    
    if request.method == 'POST':
        slug = request.form.get('slug')
        price_per_person = float(request.form.get('price'))
        deposit_percentage = int(request.form.get('deposit_percentage', 30))
        
        # Récupère le voyage complet
        trip = firebase.get_trip(session['user_id'], trip_id)
        
        # Prépare la version publique (teaser)
        published_trip = {
            'slug': slug,
            'name': trip['name'],
            'description': trip.get('description', ''),
            'photos': trip.get('photos', [])[:5],  # Max 5 photos teaser
            'highlights': trip.get('highlights', []),
            'duration': trip.get('duration', ''),
            'pricePerPerson': price_per_person,
            'depositPercentage': deposit_percentage,
            'sourceUserId': session['user_id'],
            'sourceTripId': trip_id,
            # NE PAS inclure: days, hotels, gpx
        }
        
        firebase.create_published_trip(slug, published_trip)
        flash('Voyage publié avec succès!', 'success')
        return redirect(url_for('trips.trip_detail', slug=slug))
    
    return render_template('admin/publish_trip.html', trip_id=trip_id)
```

---

### ✅ PRIORITÉ 5 : Tests & Vérifications

#### Checklist de test

**1. Workflow réservation complet** :
- [ ] Aller sur `/voyages`
- [ ] Cliquer sur un voyage
- [ ] Remplir formulaire réservation
- [ ] Payer avec Stripe (mode test)
- [ ] Vérifier webhook reçu et booking créé
- [ ] Recevoir email confirmation
- [ ] Créer compte via `/auth/register/{token}`
- [ ] Accéder à `/bookings/my-bookings`
- [ ] Voir le détail complet du voyage

**2. Gestion participants** :
- [ ] Ajouter un participant
- [ ] Vérifier email invitation envoyé
- [ ] Participant crée compte via `/auth/join/{token}`
- [ ] Participant accède au voyage
- [ ] Organisateur peut voir tous les participants
- [ ] Comptage motos correct (pilotes/passagers)

**3. Contrôles d'accès** :
- [ ] Participant ne peut pas gérer d'autres participants
- [ ] User ne peut pas accéder aux bookings d'autres users
- [ ] Admin peut tout voir et gérer

**4. Paiement solde** :
- [ ] Admin génère lien paiement solde
- [ ] Client reçoit email
- [ ] Client paie via Stripe
- [ ] Webhook met à jour `paymentStatus = 'fully_paid'`

---

## 📊 RÉSUMÉ PRIORITÉS

| Priorité | Tâche | Effort | Impact | Statut |
|----------|-------|--------|--------|--------|
| 🔴 P1 | Templates HTML (6 fichiers) | 4h | Critique | ⏳ 30% |
| 🟠 P2 | Service emails (4 types) | 2h | Important | ⏳ 0% |
| 🟡 P3 | Intégration admin | 2h | Moyen | ⏳ 0% |
| 🟢 P4 | Publication voyages | 1h | Moyen | ⏳ 0% |
| 🔵 P5 | Tests end-to-end | 2h | Important | ⏳ 0% |

**Total estimé** : 11 heures de développement

---

## 🎯 PLAN D'ACTION SUGGÉRÉ

### Session 1 : Templates essentiels (2-3h)
1. Créer `trips/list.html` et `trips/detail.html`
2. Créer `bookings/my_bookings.html` et `bookings/detail.html`
3. Créer `auth/join.html` et `auth/profile.html`

### Session 2 : Emails (2h)
1. Configurer SendGrid ou AWS SES
2. Créer `email_service.py`
3. Intégrer dans webhooks et routes

### Session 3 : Tests (2h)
1. Publier un voyage test
2. Faire une réservation complète
3. Ajouter participants
4. Vérifier tous les emails

### Session 4 : Intégration admin (2h)
1. Enrichir dashboard admin
2. Page liste réservations
3. Outils de gestion

---

## ⚡ QUICK START (minimum viable)

**Pour tester rapidement** :

1. Créer uniquement ces 2 templates :
   - `trips/detail.html` (avec formulaire réservation)
   - `bookings/detail.html` (affichage réservation)

2. Publier manuellement un voyage dans Firebase :
```javascript
// Dans Firebase Console
artifacts/default-app-id/publishedTrips/test-voyage-alpes
{
  "slug": "test-voyage-alpes",
  "name": "Tour des Alpes",
  "description": "5 jours dans les Alpes",
  "pricePerPerson": 1200,
  "depositPercentage": 30,
  "photos": ["url1.jpg"],
  "highlights": ["Cols mythiques", "Hôtels 4*"]
}
```

3. Tester le workflow :
   - Aller sur `/voyages/test-voyage-alpes`
   - Réserver
   - Payer avec Stripe test
   - Créer compte
   - Voir détails

**Temps estimé** : 1-2 heures pour un MVP fonctionnel !

---

**Prochaine étape recommandée** : Créer les 2 templates essentiels `trips/detail.html` et `bookings/detail.html` pour avoir un workflow de bout en bout fonctionnel.
