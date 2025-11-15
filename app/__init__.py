"""
MotoTrip Planner - Application Flask
Initialisation de l'application
"""
import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_login import LoginManager
from dotenv import load_dotenv

# Charge les variables d'environnement
load_dotenv()

# Initialise les extensions
db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()


def create_app():
    """Factory pour créer l'application Flask"""
    app = Flask(__name__)
    
    # Charge la configuration depuis app/config.py
    from app.config import Config
    app.config.from_object(Config)
    
    # Si DATABASE_URL commence par postgres:// (Heroku/Railway ancien format)
    # il faut le remplacer par postgresql://
    if app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
        app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://', 1)
    
    # Initialise les extensions avec l'app
    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app)
    
    # Configure Flask-Login
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Veuillez vous connecter pour accéder à cette page.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        """Charge un utilisateur depuis Firebase pour Flask-Login"""
        from app.services import FirebaseService
        firebase = FirebaseService(app.config.get('APP_ID', 'default-app-id'))
        return firebase.get_user(user_id)
    
    # Initialise Firebase (sera fait dans config.py)
    from app.config import init_firebase
    init_firebase()
    
    # Enregistre les blueprints
    from app.routes import admin, client, api, hotels, auth, trips, bookings, webhooks
    
    app.register_blueprint(admin.bp)
    app.register_blueprint(client.bp)
    app.register_blueprint(api.bp)
    app.register_blueprint(hotels.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(trips.bp)
    app.register_blueprint(bookings.bp)
    app.register_blueprint(webhooks.bp)
    
    # Route racine
    @app.route('/')
    def index():
        """Redirige vers le login admin"""
        from flask import redirect, url_for, session
        # Si déjà connecté, va au dashboard, sinon va au login
        if session.get('admin_logged_in'):
            return redirect(url_for('admin.dashboard'))
        return redirect(url_for('admin.login'))
    
    # Gestion des erreurs
    @app.errorhandler(404)
    def not_found(error):
        from flask import render_template
        return render_template('errors/404.html'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        from flask import render_template
        db.session.rollback()
        return render_template('errors/500.html'), 500
    
    return app
