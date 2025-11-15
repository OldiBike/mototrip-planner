# SPRINT 3 - SYSTÈME DE RÉSERVATION ET GESTION DE GROUPE

## 📋 Vue d'ensemble

Implémentation d'un système complet de réservation de voyages avec :
- Authentification utilisateur (clients)
- Gestion de groupe (organisateur + participants)
- Vitrine publique (teaser) vs Espace privé (détails complets)
- Paiement Stripe avec acompte
- Système d'invitations pour les participants

---

## 🏗️ ARCHITECTURE TECHNIQUE

### 1. Modèle de données

#### **User** (Utilisateurs clients)
```python
class User:
    user_id: str (primary key)
    email: str (unique, required)
    password_hash: str (bcrypt)
    first_name: str
    last_name: str
    phone: str
    role: str = "customer"  # "customer" | "admin"
    created_at: datetime
    is_active: bool = True
    email_verified: bool = False
```

**Firestore**: `artifacts/{app_id}/users/{user_id}`

#### **TripBooking** (Réservations de voyages)
```python
class TripBooking:
    booking_id: str (primary key)
    trip_template_id: str  # Référence au voyage "template"
    organizer_user_id: str  # Chef de groupe (Samuel)
    
    # Dates
    start_date: str (YYYY-MM-DD)
    end_date: str (YYYY-MM-DD)
    
    # Participants
    total_participants: int  # Ex: 4 personnes
    current_participants: int  # Compteur actuel
    
    # Paiement
    total_amount: float
    deposit_amount: float  # Acompte payé
    remaining_amount: float  # Solde à payer
    payment_status: str  # "pending" | "deposit_paid" | "fully_paid"
    stripe_session_id: str
    stripe_payment_intent_id: str
    
    # Accès
    access_token: str (unique, pour lien privé)
    
    # Statut
    status: str  # "pending" | "confirmed" | "completed" | "cancelled"
    created_at: datetime
    updated_at: datetime
```

**Firestore**: `artifacts/{app_id}/bookings/{booking_id}`

#### **Participant** (Membres du groupe)
```python
class Participant:
    participant_id: str (primary key)
    booking_id: str (foreign key)
    user_id: str (nullable, si compte créé)
    
    # Infos personnelles
    first_name: str
    last_name: str
    email: str
    phone: str (optional)
    
    # Rôle dans le groupe
    role: str  # "organizer" | "member"
    rider_type: str  # "pilot" | "passenger"
    
    # Gestion de l'invitation
    invitation_token: str (unique)
    invitation_sent_at: datetime
    account_created: bool = False
    joined_at: datetime (nullable)
    
    # Origine
    added_by: str  # "admin" | "organizer"
    added_by_user_id: str
    
    created_at: datetime
```

**Firestore**: `artifacts/{app_id}/bookings/{booking_id}/participants/{participant_id}`

---

### 2. WORKFLOW COMPLET

#### **Phase 1 : Vitrine Publique (Teaser)**

**Page**: `/voyages` et `/voyages/{slug}`

**Contenu affiché**:
- Photos du voyage
- Titre et description générale
- Durée (nombre de jours)
- Prix par personne
- Points forts / highlights
- ❌ **Pas d'itinéraire détaillé**
- ❌ **Pas de noms d'hôtels**
- ❌ **Pas de fichiers GPX**

**Actions**:
- Bouton "Réserver ce voyage"
- Formulaire rapide : Dates souhaitées, Nombre de participants

---

#### **Phase 2 : Paiement Stripe**

**Flow**:
1. Client clique "Réserver"
2. Formulaire de réservation :
   - Email
   - Nombre de participants
   - Dates souhaitées (validées avec disponibilité)
3. Calcul automatique :
   - Total = prix_par_personne × nb_participants
   - Acompte = 30% du total
4. Création session Stripe Checkout
5. Paiement de l'acompte
6. **Webhook Stripe** → Création automatique :
   - User (avec email temporaire)
   - TripBooking (status: "deposit_paid")
   - Participant (organizer, pilot par défaut)

---

#### **Phase 3 : Création de compte (Post-paiement)**

**Page**: `/register/{token}`

**Flow**:
1. Email envoyé : "Finalisez votre réservation"
2. Lien vers `/register/{token}`
3. Formulaire :
   - Prénom
   - Nom
   - Téléphone
   - Mot de passe (min 8 caractères)
4. Validation → Compte activé
5. Redirection vers `/my-bookings`

---

#### **Phase 4 : Ajout des participants**

##### **Option A : Admin encode**

**Page**: `/admin/customers/{customer_id}`

**Section**: "Réservations de voyages"

**Actions**:
1. Liste des réservations du client
2. Clic sur une réservation → Détails
3. Section "Participants" (3/4 ajoutés)
4. Bouton "Ajouter un participant"
5. Formulaire :
   - Prénom, Nom
   - Email
   - Pilote / Passager
6. Envoi automatique d'invitation par email

##### **Option B : Client (organisateur) encode**

**Page**: `/booking/{booking_id}` (authentifié)

**Section**: "Mon groupe"

**Actions**:
1. Liste des participants actuels
2. Bouton "Inviter un participant" (si places disponibles)
3. Même formulaire que admin
4. Limitation : max = total_participants de la réservation

---

#### **Phase 5 : Participants créent leur compte**

**Page**: `/join/{invitation_token}`

**Flow**:
1. Email reçu : "Vous êtes invité au voyage {nom}"
2. Clic sur lien `/join/{invitation_token}`
3. Page d'inscription :
   - Prénom, Nom (pré-remplis si fournis)
   - Mot de passe
   - Acceptation CGV
4. Compte créé → Lié au participant
5. Accès à `/booking/{booking_id}`

---

### 3. PAGES ET ROUTES

#### **Routes Publiques**

| Route | Méthode | Description |
|-------|---------|-------------|
| `/voyages` | GET | Liste des voyages (teaser) |
| `/voyages/{slug}` | GET | Détail d'un voyage (teaser) |
| `/voyages/{slug}/book` | POST | Formulaire de réservation → Stripe |
| `/login` | GET, POST | Connexion client |
| `/register/{token}` | GET, POST | Création compte organizer |
| `/join/{invitation_token}` | GET, POST | Création compte participant |
| `/logout` | GET | Déconnexion |

#### **Routes Privées** (Authentification requise)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/my-bookings` | GET | Liste des réservations du user |
| `/booking/{booking_id}` | GET | Détail complet d'une réservation |
| `/booking/{booking_id}/participants` | GET, POST | Gestion des participants (organizer) |
| `/booking/{booking_id}/participants/{id}` | DELETE | Retirer un participant |
| `/profile` | GET, POST | Profil utilisateur |

#### **Routes Admin** (Enrichissement)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/admin/bookings` | GET | Liste toutes les réservations |
| `/admin/bookings/{id}` | GET | Détail d'une réservation |
| `/admin/bookings/{id}/participants` | POST | Ajouter un participant |
| `/admin/customers/{id}` | GET | **Enrichi** : Section réservations |

#### **Webhooks**

| Route | Méthode | Description |
|-------|---------|-------------|
| `/webhooks/stripe` | POST | Gestion événements Stripe |

---

### 4. PERMISSIONS ET ACCÈS

#### **Rôles utilisateurs**

- **Admin** : Accès complet à tout
- **Customer (Organizer)** : Peut voir/gérer ses réservations + participants
- **Customer (Member)** : Peut voir la réservation, pas la gérer

#### **Règles d'accès à `/booking/{booking_id}`**

```python
# Accès autorisé si :
- user.role == "admin"
- user.id == booking.organizer_user_id
- user.id in booking.participants.user_ids
```

#### **Gestion des participants**

```python
# Peut ajouter/supprimer participants si :
- user.role == "admin"
- user.id == booking.organizer_user_id
```

---

### 5. COMPTAGE DES MOTOS

**Logique**:
```python
def calculate_motorcycles(booking_id):
    participants = get_participants(booking_id)
    
    pilots = sum(1 for p in participants if p.rider_type == "pilot")
    passengers = sum(1 for p in participants if p.rider_type == "passenger")
    
    return {
        "total_motorcycles": pilots,
        "total_pilots": pilots,
        "total_passengers": passengers,
        "total_people": pilots + passengers
    }
```

**Affichage**:
- Admin voit : "5 motos, 7 personnes (5 pilotes + 2 passagers)"
- Pour logistique : Nombre de chambres, parkings, etc.

---

### 6. SYSTÈME DE PAIEMENT

#### **Acompte (Checkout initial)**

```python
# Stripe Checkout Session
line_items = [{
    'price_data': {
        'currency': 'eur',
        'product_data': {
            'name': f'Acompte - {trip.name}',
            'description': f'{nb_participants} participants'
        },
        'unit_amount': int(deposit_amount * 100)  # centimes
    },
    'quantity': 1
}]

metadata = {
    'booking_type': 'deposit',
    'trip_id': trip_id,
    'nb_participants': nb_participants,
    'total_amount': total_amount,
    'customer_email': email
}
```

#### **Solde (Paiement final)**

**Déclenchement** : Admin marque "Envoyer lien paiement final"

**Flow**:
1. Génération nouvelle session Stripe
2. Email au client : "Finalisez votre paiement"
3. Montant = remaining_amount
4. Webhook success → Update `payment_status = "fully_paid"`

---

### 7. SYSTÈME D'EMAILS

#### **Templates d'emails**

1. **Post-paiement acompte** (à l'organisateur)
```
Sujet: Votre réservation est confirmée ! 🎉
Corps:
- Merci pour votre acompte
- Récapitulatif de la réservation
- Lien pour créer votre compte : /register/{token}
- Lien pour ajouter vos participants
```

2. **Invitation participant**
```
Sujet: Vous êtes invité à un voyage moto ! 🏍️
Corps:
- {organizer_name} vous invite au voyage {trip_name}
- Dates : {start_date} → {end_date}
- Créez votre compte : /join/{invitation_token}
- Informations préliminaires sur le voyage
```

3. **Paiement solde**
```
Sujet: Finalisez votre paiement pour {trip_name}
Corps:
- Votre voyage approche !
- Solde restant : {remaining_amount} €
- Lien de paiement sécurisé
- Date limite de paiement
```

4. **Confirmation compte participant**
```
Sujet: Bienvenue ! Votre compte est créé
Corps:
- Accédez aux détails du voyage
- Lien : /booking/{booking_id}
- Prochaines étapes
```

---

### 8. SÉCURITÉ

#### **Tokens**

- **access_token** (TripBooking) : UUID v4, pour accès à `/booking/{token}`
- **invitation_token** (Participant) : UUID v4, usage unique
- Expiration : invitation_token expire après 7 jours

#### **Mots de passe**

```python
from werkzeug.security import generate_password_hash, check_password_hash

# Hashing
password_hash = generate_password_hash(password, method='pbkdf2:sha256')

# Vérification
is_valid = check_password_hash(password_hash, password)
```

#### **Sessions**

```python
# Flask-Login
from flask_login import LoginManager, login_user, logout_user, login_required

# Configuration
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
```

---

### 9. BASE DE DONNÉES FIREBASE

#### **Structure Firestore**

```
artifacts/
  {app_id}/
    users/
      {user_id}/
        - email, password_hash, first_name, last_name, ...
    
    bookings/
      {booking_id}/
        - trip_template_id, organizer_user_id, ...
        - start_date, end_date, ...
        - payment info, access_token, ...
        
        participants/
          {participant_id}/
            - user_id, first_name, last_name, email, ...
            - role, rider_type, ...
            - invitation_token, account_created, ...
    
    customers/  # Existant, lié via email
      {customer_id}/
        - name, email, phone, ...
```

---

## 📅 PLAN D'IMPLÉMENTATION

### Phase 1 : Fondations (Priorité 1)
- [x] Documentation (ce fichier)
- [ ] Modèles : User, TripBooking, Participant
- [ ] Service Firebase : méthodes CRUD
- [ ] Flask-Login : configuration authentification
- [ ] Routes auth : /login, /logout, /register

### Phase 2 : Vitrine publique (Priorité 1)
- [ ] Page `/voyages` (liste teaser)
- [ ] Page `/voyages/{slug}` (détail teaser)
- [ ] Formulaire de réservation
- [ ] Intégration Stripe Checkout (acompte)

### Phase 3 : Webhooks et création compte (Priorité 1)
- [ ] Webhook Stripe : `/webhooks/stripe`
- [ ] Logique création User + Booking + Participant
- [ ] Email post-paiement
- [ ] Page `/register/{token}`

### Phase 4 : Espace privé client (Priorité 2)
- [ ] Page `/my-bookings`
- [ ] Page `/booking/{booking_id}` (détails complets)
- [ ] Gestion participants (ajout/suppression)
- [ ] System d'invitations

### Phase 5 : Admin enrichi (Priorité 2)
- [ ] Liste réservations dans fiche client
- [ ] Gestion participants côté admin
- [ ] Génération lien paiement final
- [ ] Dashboard statistiques

### Phase 6 : Emails et finitions (Priorité 3)
- [ ] Service d'envoi d'emails
- [ ] Templates emails (Jinja2)
- [ ] Tests end-to-end
- [ ] Documentation utilisateur

---

## 🔄 MIGRATION DES DONNÉES EXISTANTES

### Lien Customer ↔ User

Lors de la création d'un User suite à un paiement :
1. Rechercher si un Customer existe avec cet email
2. Si oui : lier `user_id` dans la fiche Customer
3. Si non : créer un nouveau Customer automatiquement

Cela permet de conserver l'historique admin tout en ayant l'authentification.

---

## 🧪 TESTS À EFFECTUER

### Workflow complet
1. ✅ Réserver un voyage (paiement acompte)
2. ✅ Créer compte organisateur
3. ✅ Ajouter 3 participants
4. ✅ Participants créent leurs comptes
5. ✅ Tous accèdent aux détails du voyage
6. ✅ Organizer voit les infos du groupe
7. ✅ Admin gère les participants
8. ✅ Paiement du solde
9. ✅ Accès complet au voyage

### Cas limites
- Tentative d'ajouter plus de participants que prévu
- Accès à une réservation sans autorisation
- Expiration des tokens d'invitation
- Paiement échoué / annulé
- Double inscription avec même email

---

## 📊 INDICATEURS DE SUCCÈS

- ✅ Client peut réserver un voyage en ligne
- ✅ Système de groupe fonctionnel (max participants respecté)
- ✅ Authentification sécurisée
- ✅ Vitrine publique (teaser) vs Espace privé (détails)
- ✅ Paiement en 2 fois (acompte + solde)
- ✅ Admin garde le contrôle total
- ✅ Emails automatiques envoyés
- ✅ Comptage des motos précis

---

**Date de création** : 15/11/2025
**Dernière mise à jour** : 15/11/2025
**Statut** : 🚧 En cours d'implémentation
