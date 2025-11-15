"""
Routes d'authentification pour les clients
"""
from flask import Blueprint, render_template, request, redirect, url_for, flash, session
from flask_login import login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
import uuid
from datetime import datetime

from app.services import FirebaseService
from app.models import User
from app.config import Config

bp = Blueprint('auth', __name__, url_prefix='/auth')


@bp.route('/login', methods=['GET', 'POST'])
def login():
    """Connexion client"""
    # Si déjà connecté, redirige vers mes réservations
    if current_user.is_authenticated:
        return redirect(url_for('bookings.my_bookings'))
    
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '')
        
        if not email or not password:
            flash('Veuillez remplir tous les champs.', 'error')
            return render_template('auth/login.html')
        
        # Récupère l'utilisateur depuis Firebase
        firebase = FirebaseService(Config.APP_ID)
        user = firebase.get_user_by_email(email)
        
        if user and user.check_password(password):
            if not user.is_active:
                flash('Votre compte a été désactivé. Contactez-nous.', 'error')
                return render_template('auth/login.html')
            
            # Connexion réussie
            login_user(user)
            flash(f'Bienvenue {user.get_full_name()}!', 'success')
            
            # Redirige vers la page demandée ou mes réservations
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            return redirect(url_for('bookings.my_bookings'))
        else:
            flash('Email ou mot de passe incorrect.', 'error')
    
    return render_template('auth/login.html')


@bp.route('/logout')
@login_required
def logout():
    """Déconnexion"""
    logout_user()
    flash('Vous êtes déconnecté.', 'success')
    return redirect(url_for('trips.list_trips'))


@bp.route('/register/<token>', methods=['GET', 'POST'])
def register(token):
    """Création de compte organisateur après paiement"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Vérifie le token dans les bookings
    booking = firebase.get_booking_by_token(token)
    
    if not booking:
        flash('Lien d\'inscription invalide ou expiré.', 'error')
        return redirect(url_for('trips.list_trips'))
    
    # Vérifie si le compte n'est pas déjà créé
    organizer_user = firebase.get_user(booking.organizer_user_id)
    if organizer_user and organizer_user.password_hash:
        flash('Votre compte est déjà créé. Connectez-vous.', 'info')
        return redirect(url_for('auth.login'))
    
    if request.method == 'POST':
        first_name = request.form.get('first_name', '').strip()
        last_name = request.form.get('last_name', '').strip()
        phone = request.form.get('phone', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        if not all([first_name, last_name, password]):
            flash('Veuillez remplir tous les champs obligatoires.', 'error')
            return render_template('auth/register.html', booking=booking)
        
        if len(password) < 8:
            flash('Le mot de passe doit contenir au moins 8 caractères.', 'error')
            return render_template('auth/register.html', booking=booking)
        
        if password != confirm_password:
            flash('Les mots de passe ne correspondent pas.', 'error')
            return render_template('auth/register.html', booking=booking)
        
        # Met à jour l'utilisateur
        user_data = {
            'firstName': first_name,
            'lastName': last_name,
            'phone': phone,
            'passwordHash': generate_password_hash(password, method='pbkdf2:sha256'),
            'isActive': True,
            'emailVerified': True
        }
        
        if firebase.update_user(booking.organizer_user_id, user_data):
            # Met à jour le participant organizer
            participants = firebase.get_booking_participants(booking.booking_id)
            for participant in participants:
                if participant.role == 'organizer':
                    firebase.update_participant(booking.booking_id, participant.participant_id, {
                        'firstName': first_name,
                        'lastName': last_name,
                        'phone': phone,
                        'accountCreated': True,
                        'joinedAt': datetime.now().isoformat()
                    })
                    break
            
            # Connexion automatique
            user = firebase.get_user(booking.organizer_user_id)
            login_user(user)
            
            flash('Votre compte a été créé avec succès!', 'success')
            return redirect(url_for('bookings.booking_detail', booking_id=booking.booking_id))
        else:
            flash('Erreur lors de la création du compte.', 'error')
    
    return render_template('auth/register.html', booking=booking)


@bp.route('/join/<invitation_token>', methods=['GET', 'POST'])
def join(invitation_token):
    """Création de compte participant via invitation"""
    firebase = FirebaseService(Config.APP_ID)
    
    # Récupère le participant par son token
    participant = firebase.get_participant_by_token(invitation_token)
    
    if not participant:
        flash('Invitation invalide ou expirée.', 'error')
        return redirect(url_for('trips.list_trips'))
    
    # Vérifie si le participant a déjà un compte
    if participant.has_account():
        flash('Vous avez déjà créé votre compte. Connectez-vous.', 'info')
        return redirect(url_for('auth.login'))
    
    # Récupère la réservation
    booking = firebase.get_booking(participant.booking_id)
    
    if not booking:
        flash('Réservation introuvable.', 'error')
        return redirect(url_for('trips.list_trips'))
    
    if request.method == 'POST':
        first_name = request.form.get('first_name', participant.first_name).strip()
        last_name = request.form.get('last_name', participant.last_name).strip()
        phone = request.form.get('phone', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')
        
        # Validation
        if not all([first_name, last_name, password]):
            flash('Veuillez remplir tous les champs obligatoires.', 'error')
            return render_template('auth/join.html', participant=participant, booking=booking)
        
        if len(password) < 8:
            flash('Le mot de passe doit contenir au moins 8 caractères.', 'error')
            return render_template('auth/join.html', participant=participant, booking=booking)
        
        if password != confirm_password:
            flash('Les mots de passe ne correspondent pas.', 'error')
            return render_template('auth/join.html', participant=participant, booking=booking)
        
        # Vérifie si un user existe déjà avec cet email
        existing_user = firebase.get_user_by_email(participant.email)
        
        if existing_user:
            # Lie le participant au user existant
            user_id = existing_user.user_id
        else:
            # Crée un nouveau user
            user_data = {
                'email': participant.email,
                'firstName': first_name,
                'lastName': last_name,
                'phone': phone,
                'passwordHash': generate_password_hash(password, method='pbkdf2:sha256'),
                'role': 'customer',
                'isActive': True,
                'emailVerified': True,
                'createdAt': datetime.now().isoformat()
            }
            
            user_id = firebase.create_user(user_data)
            
            if not user_id:
                flash('Erreur lors de la création du compte.', 'error')
                return render_template('auth/join.html', participant=participant, booking=booking)
        
        # Met à jour le participant
        participant_data = {
            'userId': user_id,
            'firstName': first_name,
            'lastName': last_name,
            'phone': phone,
            'accountCreated': True,
            'joinedAt': datetime.now().isoformat()
        }
        
        if firebase.update_participant(booking.booking_id, participant.participant_id, participant_data):
            # Connexion automatique
            user = firebase.get_user(user_id)
            login_user(user)
            
            flash('Votre compte a été créé avec succès!', 'success')
            return redirect(url_for('bookings.booking_detail', booking_id=booking.booking_id))
        else:
            flash('Erreur lors de la mise à jour du participant.', 'error')
    
    return render_template('auth/join.html', participant=participant, booking=booking)


@bp.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    """Profil utilisateur"""
    firebase = FirebaseService(Config.APP_ID)
    
    if request.method == 'POST':
        first_name = request.form.get('first_name', '').strip()
        last_name = request.form.get('last_name', '').strip()
        phone = request.form.get('phone', '').strip()
        
        # Validation
        if not all([first_name, last_name]):
            flash('Prénom et nom sont obligatoires.', 'error')
            return render_template('auth/profile.html')
        
        # Met à jour l'utilisateur
        user_data = {
            'firstName': first_name,
            'lastName': last_name,
            'phone': phone
        }
        
        if firebase.update_user(current_user.user_id, user_data):
            flash('Profil mis à jour avec succès!', 'success')
            return redirect(url_for('auth.profile'))
        else:
            flash('Erreur lors de la mise à jour du profil.', 'error')
    
    return render_template('auth/profile.html')
