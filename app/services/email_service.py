"""
Service d'envoi d'emails pour MotoTrip
Supporte plusieurs providers : SendGrid, AWS SES, SMTP
"""
import os
from typing import Optional
from flask import render_template_string


class EmailService:
    """Service pour envoyer des emails via différents providers"""
    
    def __init__(self, provider='smtp'):
        """
        Initialise le service d'email
        
        Args:
            provider: 'sendgrid', 'ses', ou 'smtp'
        """
        self.provider = provider.lower()
        self.from_email = os.getenv('EMAIL_FROM', 'noreply@mototrip.com')
        self.from_name = os.getenv('EMAIL_FROM_NAME', 'MotoTrip')
        
        if self.provider == 'sendgrid':
            self._init_sendgrid()
        elif self.provider == 'ses':
            self._init_ses()
        else:
            self._init_smtp()
    
    def _init_sendgrid(self):
        """Initialise SendGrid"""
        try:
            from sendgrid import SendGridAPIClient
            self.sg_client = SendGridAPIClient(os.getenv('SENDGRID_API_KEY'))
            print("✅ SendGrid initialisé")
        except ImportError:
            print("⚠️  sendgrid non installé. Installez-le avec: pip install sendgrid")
            self.provider = 'mock'
        except Exception as e:
            print(f"⚠️  Erreur SendGrid: {e}")
            self.provider = 'mock'
    
    def _init_ses(self):
        """Initialise AWS SES"""
        try:
            import boto3
            self.ses_client = boto3.client('ses',
                region_name=os.getenv('AWS_REGION', 'eu-west-1'),
                aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
                aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY')
            )
            print("✅ AWS SES initialisé")
        except ImportError:
            print("⚠️  boto3 non installé. Installez-le avec: pip install boto3")
            self.provider = 'mock'
        except Exception as e:
            print(f"⚠️  Erreur AWS SES: {e}")
            self.provider = 'mock'
    
    def _init_smtp(self):
        """Initialise SMTP"""
        try:
            import smtplib
            self.smtp_host = os.getenv('SMTP_HOST', 'localhost')
            self.smtp_port = int(os.getenv('SMTP_PORT', 587))
            self.smtp_user = os.getenv('SMTP_USER')
            self.smtp_pass = os.getenv('SMTP_PASS')
            print(f"✅ SMTP configuré: {self.smtp_host}:{self.smtp_port}")
        except Exception as e:
            print(f"⚠️  Erreur SMTP: {e}")
            self.provider = 'mock'
    
    def send_email(self, to_email: str, subject: str, html_content: str, text_content: Optional[str] = None) -> bool:
        """
        Envoie un email
        
        Args:
            to_email: Destinataire
            subject: Sujet de l'email
            html_content: Contenu HTML
            text_content: Contenu texte (optionnel)
        
        Returns:
            True si envoyé avec succès
        """
        if self.provider == 'mock':
            print(f"📧 [MOCK] Email à {to_email}: {subject}")
            return True
        
        try:
            if self.provider == 'sendgrid':
                return self._send_sendgrid(to_email, subject, html_content, text_content)
            elif self.provider == 'ses':
                return self._send_ses(to_email, subject, html_content, text_content)
            else:
                return self._send_smtp(to_email, subject, html_content, text_content)
        except Exception as e:
            print(f"❌ Erreur envoi email: {e}")
            return False
    
    def _send_sendgrid(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
        """Envoie via SendGrid"""
        from sendgrid.helpers.mail import Mail, Email, To, Content
        
        message = Mail(
            from_email=Email(self.from_email, self.from_name),
            to_emails=To(to_email),
            subject=subject,
            html_content=Content("text/html", html_content)
        )
        
        if text_content:
            message.plain_text_content = Content("text/plain", text_content)
        
        response = self.sg_client.send(message)
        return response.status_code in [200, 201, 202]
    
    def _send_ses(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
        """Envoie via AWS SES"""
        body = {'Html': {'Data': html_content}}
        if text_content:
            body['Text'] = {'Data': text_content}
        
        response = self.ses_client.send_email(
            Source=f"{self.from_name} <{self.from_email}>",
            Destination={'ToAddresses': [to_email]},
            Message={
                'Subject': {'Data': subject},
                'Body': body
            }
        )
        
        return 'MessageId' in response
    
    def _send_smtp(self, to_email: str, subject: str, html_content: str, text_content: Optional[str]) -> bool:
        """Envoie via SMTP"""
        import smtplib
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        
        msg = MIMEMultipart('alternative')
        msg['From'] = f"{self.from_name} <{self.from_email}>"
        msg['To'] = to_email
        msg['Subject'] = subject
        
        if text_content:
            msg.attach(MIMEText(text_content, 'plain'))
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            server.starttls()
            if self.smtp_user and self.smtp_pass:
                server.login(self.smtp_user, self.smtp_pass)
            server.send_message(msg)
        
        return True
    
    # ============================================
    # EMAILS SPÉCIFIQUES MOTOTRIP
    # ============================================
    
    def send_booking_confirmation(self, email: str, booking, access_token: str, base_url: str) -> bool:
        """Email post-paiement acompte à l'organisateur"""
        subject = "Votre réservation est confirmée ! 🎉"
        
        register_link = f"{base_url}/auth/register/{access_token}"
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">🎉 Réservation confirmée !</h1>
            
            <p>Bonjour,</p>
            
            <p>Merci pour votre réservation ! Votre acompte de <strong>{booking.deposit_amount}€</strong> a été reçu.</p>
            
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Récapitulatif de votre réservation</h3>
                <p><strong>Voyage :</strong> {booking.trip_template_id}</p>
                <p><strong>Dates :</strong> {booking.start_date} → {booking.end_date}</p>
                <p><strong>Participants :</strong> {booking.total_participants} personne(s)</p>
                <p><strong>Montant total :</strong> {booking.total_amount}€</p>
                <p><strong>Acompte payé :</strong> {booking.deposit_amount}€</p>
                <p><strong>Solde restant :</strong> {booking.remaining_amount}€</p>
            </div>
            
            <h3>📝 Prochaines étapes</h3>
            
            <ol>
                <li><strong>Créez votre compte</strong> pour accéder aux détails complets du voyage</li>
                <li>Ajoutez les autres participants de votre groupe</li>
                <li>Consultez l'itinéraire détaillé et les informations pratiques</li>
            </ol>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{register_link}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Créer mon compte
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Le lien est valable 7 jours. Si vous avez des questions, n'hésitez pas à nous contacter.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
                MotoTrip - Voyages moto d'exception<br>
                Cet email a été envoyé à {email}
            </p>
        </body>
        </html>
        """
        
        text = f"""
        RÉSERVATION CONFIRMÉE !
        
        Merci pour votre réservation ! Votre acompte de {booking.deposit_amount}€ a été reçu.
        
        Récapitulatif :
        - Voyage : {booking.trip_template_id}
        - Dates : {booking.start_date} → {booking.end_date}
        - Participants : {booking.total_participants}
        - Total : {booking.total_amount}€
        - Acompte : {booking.deposit_amount}€
        - Solde : {booking.remaining_amount}€
        
        Créez votre compte : {register_link}
        
        MotoTrip
        """
        
        return self.send_email(email, subject, html, text)
    
    def send_participant_invitation(self, email: str, participant, booking, trip_name: str, organizer_name: str, invitation_token: str, base_url: str) -> bool:
        """Email invitation à un membre du groupe"""
        subject = f"Vous êtes invité au voyage {trip_name} ! 🏍️"
        
        join_link = f"{base_url}/auth/join/{invitation_token}"
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">🏍️ Invitation à un voyage moto !</h1>
            
            <p>Bonjour {participant.first_name},</p>
            
            <p><strong>{organizer_name}</strong> vous invite à participer au voyage <strong>{trip_name}</strong> !</p>
            
            <div style="background: #f0f4ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Informations du voyage</h3>
                <p><strong>Dates :</strong> {booking.start_date} → {booking.end_date}</p>
                <p><strong>Votre rôle :</strong> {"🏍️ Pilote" if participant.rider_type == "pilot" else "👤 Passager"}</p>
            </div>
            
            <h3>📝 Créez votre compte</h3>
            
            <p>Pour accéder aux détails complets du voyage (itinéraire, hôtels, fichiers GPX), créez votre compte :</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{join_link}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Rejoindre le voyage
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Ce lien d'invitation est personnel et expire dans 7 jours.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
                MotoTrip - Voyages moto d'exception<br>
                Cet email a été envoyé à {email}
            </p>
        </body>
        </html>
        """
        
        text = f"""
        INVITATION AU VOYAGE {trip_name.upper()}
        
        Bonjour {participant.first_name},
        
        {organizer_name} vous invite à participer au voyage {trip_name} !
        
        Dates : {booking.start_date} → {booking.end_date}
        Votre rôle : {"Pilote" if participant.rider_type == "pilot" else "Passager"}
        
        Rejoignez le voyage : {join_link}
        
        MotoTrip
        """
        
        return self.send_email(email, subject, html, text)
    
    def send_payment_reminder(self, email: str, booking, trip_name: str, payment_link: str) -> bool:
        """Email rappel paiement solde"""
        subject = f"Finalisez votre paiement pour {trip_name}"
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">💳 Paiement du solde</h1>
            
            <p>Bonjour,</p>
            
            <p>Votre voyage <strong>{trip_name}</strong> approche !</p>
            
            <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <h3 style="margin-top: 0; color: #856404;">Solde restant à payer</h3>
                <p style="font-size: 24px; font-weight: bold; color: #856404; margin: 10px 0;">{booking.remaining_amount}€</p>
                <p style="color: #856404; margin-bottom: 0;">
                    <small>Acompte déjà payé : {booking.deposit_amount}€</small>
                </p>
            </div>
            
            <p>Pour finaliser votre réservation, merci de procéder au paiement du solde :</p>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{payment_link}" style="background: #ffc107; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Payer le solde
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Paiement sécurisé via Stripe. Si vous avez des questions, contactez-nous.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
                MotoTrip - Voyages moto d'exception<br>
                Cet email a été envoyé à {email}
            </p>
        </body>
        </html>
        """
        
        text = f"""
        PAIEMENT DU SOLDE - {trip_name.upper()}
        
        Votre voyage approche !
        
        Solde restant : {booking.remaining_amount}€
        (Acompte déjà payé : {booking.deposit_amount}€)
        
        Payer maintenant : {payment_link}
        
        MotoTrip
        """
        
        return self.send_email(email, subject, html, text)
    
    def send_account_created_confirmation(self, email: str, user_name: str, booking_id: str, base_url: str) -> bool:
        """Email confirmation création compte"""
        subject = "Bienvenue sur MotoTrip ! 🎉"
        
        booking_link = f"{base_url}/bookings/{booking_id}"
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #667eea;">🎉 Bienvenue {user_name} !</h1>
            
            <p>Votre compte MotoTrip a été créé avec succès.</p>
            
            <p>Vous pouvez maintenant accéder aux détails complets de votre voyage :</p>
            
            <ul>
                <li>✅ Itinéraire jour par jour</li>
                <li>✅ Informations sur les hôtels</li>
                <li>✅ Fichiers GPX à télécharger</li>
                <li>✅ Liste des participants</li>
                <li>✅ Statut du paiement</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
                <a href="{booking_link}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Voir mes réservations
                </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
                Si vous avez des questions, notre équipe est là pour vous aider.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #666; font-size: 12px; text-align: center;">
                MotoTrip - Voyages moto d'exception<br>
                Cet email a été envoyé à {email}
            </p>
        </body>
        </html>
        """
        
        text = f"""
        BIENVENUE {user_name.upper()} !
        
        Votre compte MotoTrip est créé.
        
        Accédez à vos réservations : {booking_link}
        
        MotoTrip
        """
        
        return self.send_email(email, subject, html, text)
