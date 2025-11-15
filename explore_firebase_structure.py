#!/usr/bin/env python3
"""
Script d'exploration complète Firebase
Explore TOUTE la structure Firebase sans présupposer l'APP_ID
"""

import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        cred_path = os.getenv('FIREBASE_CREDENTIALS_PATH', './mototrip-63c76-firebase-adminsdk-fbsvc-d909861cfa.json')
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("✅ Firebase initialisé avec succès")
        return db
    except Exception as e:
        print(f"❌ Erreur lors de l'initialisation Firebase: {e}")
        return None

def explore_collection(db, path, level=0):
    """Explore récursivement une collection Firebase"""
    indent = "   " * level
    
    try:
        # Si c'est un chemin de collection
        parts = path.split('/')
        
        if len(parts) % 2 == 1:  # C'est une collection
            col_ref = db.collection(parts[0]) if len(parts) == 1 else db.document('/'.join(parts[:-1])).collection(parts[-1])
            docs = list(col_ref.stream())
            
            if not docs:
                return
            
            print(f"{indent}📁 {parts[-1]}/ ({len(docs)} document(s))")
            
            for doc in docs:
                doc_data = doc.to_dict()
                print(f"{indent}   └─ 📄 {doc.id}")
                
                # Afficher quelques champs importants
                if 'title' in doc_data:
                    print(f"{indent}      └─ title: {doc_data['title']}")
                if 'description' in doc_data:
                    desc = doc_data['description'][:50] if doc_data['description'] else ''
                    print(f"{indent}      └─ description: {desc}...")
                if 'duration' in doc_data:
                    print(f"{indent}      └─ duration: {doc_data['duration']}")
                if 'price' in doc_data:
                    print(f"{indent}      └─ price: {doc_data['price']}")
                
                # Explorer les sous-collections
                subcollections = doc.reference.collections()
                for subcol in subcollections:
                    explore_collection(db, f"{path}/{doc.id}/{subcol.id}", level + 2)
    
    except Exception as e:
        print(f"{indent}❌ Erreur: {e}")

def main():
    """Fonction principale"""
    print("=" * 80)
    print("🔍 EXPLORATION COMPLÈTE DE FIREBASE")
    print("=" * 80)
    
    # Initialiser Firebase
    db = initialize_firebase()
    if not db:
        print("\n❌ Impossible de continuer sans connexion Firebase")
        return
    
    print("\n🌳 STRUCTURE COMPLÈTE:")
    print("=" * 80)
    
    # Explorer à partir de la racine
    try:
        # Lister toutes les collections racine
        collections = db.collections()
        
        for collection in collections:
            print(f"\n📁 {collection.id}/")
            
            # Lister les documents dans cette collection
            docs = list(collection.stream())
            
            if not docs:
                print(f"   └─ ⚠️  Collection vide")
                continue
            
            print(f"   ({len(docs)} document(s))")
            
            for doc in docs:
                doc_data = doc.to_dict()
                print(f"   └─ 📄 {doc.id}")
                
                # Afficher les champs pertinents
                if doc_data:
                    for key in ['title', 'name', 'type']:
                        if key in doc_data:
                            print(f"      └─ {key}: {doc_data[key]}")
                
                # Explorer les sous-collections de ce document
                subcollections = doc.reference.collections()
                for subcol in subcollections:
                    print(f"      └─ 📁 {subcol.id}/")
                    
                    # Lister les documents de la sous-collection
                    subdocs = list(subcol.stream())
                    print(f"         ({len(subdocs)} document(s))")
                    
                    # Afficher quelques docs
                    for i, subdoc in enumerate(subdocs[:3]):  # Montrer max 3 docs
                        subdoc_data = subdoc.to_dict()
                        print(f"         └─ 📄 {subdoc.id}")
                        
                        if 'title' in subdoc_data:
                            print(f"            └─ title: {subdoc_data['title']}")
                        
                        # Explorer les sous-sous-collections
                        subsubcollections = subdoc.reference.collections()
                        for subsubcol in subsubcollections:
                            subsubdocs = list(subsubcol.stream())
                            print(f"            └─ 📁 {subsubcol.id}/ ({len(subsubdocs)} doc(s))")
                    
                    if len(subdocs) > 3:
                        print(f"         └─ ... et {len(subdocs) - 3} autre(s)")
        
        print("\n" + "=" * 80)
        print("✅ Exploration terminée")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'exploration: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
