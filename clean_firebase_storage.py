#!/usr/bin/env python3
"""
Script de nettoyage Firebase Storage
Supprime tous les fichiers photos pour repartir sur une base propre
"""

import firebase_admin
from firebase_admin import credentials, storage
import os

# Initialise Firebase
if not firebase_admin._apps:
    cred = credentials.Certificate('firebase-credentials.json')
    firebase_admin.initialize_app(cred, {
        'storageBucket': 'mototrip-63c76.firebasestorage.app'
    })

bucket = storage.bucket()

print("🧹 Nettoyage Firebase Storage...")
print("=" * 50)

# Liste tous les fichiers
blobs = list(bucket.list_blobs())

if not blobs:
    print("✅ Storage déjà vide")
else:
    print(f"📁 Trouvé {len(blobs)} fichier(s)")
    
    for blob in blobs:
        print(f"🗑️  Suppression : {blob.name}")
        blob.delete()
    
    print("=" * 50)
    print(f"✅ {len(blobs)} fichier(s) supprimé(s)")

print("\n✨ Firebase Storage est maintenant vide et propre !")
