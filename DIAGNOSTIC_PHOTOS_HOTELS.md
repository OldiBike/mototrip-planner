# 🔍 DIAGNOSTIC : Double système de stockage des photos

## ❌ PROBLÈME ACTUEL

Il existe **2 banques de photos** qui créent de la confusion :

### **Banque 1 : Collection `media` (ANCIEN système)**
```
Firestore: artifacts/mototrip/users/sam-user/media/{mediaId}
{
  type: "hotel",
  hotelName: "Das Hotel Panorama",
  hotelId: "3dbsCPLIclujgnsfmA9A",
  downloadURL: "https://storage.googleapis.com/...",
  linkedDayId: "mqYMFGs0pKCpiFHrenCt"
}
```

**Utilisé par** : `fetch-google-photos` (depuis une étape)

### **Banque 2 : Champ `photos` dans `hotels` (NOUVEAU système)**
```
Firestore: artifacts/mototrip/users/sam-user/hotels/{hotelId}
{
  name: "Das Hotel Panorama",
  city: "Orbey",
  photos: [
    "https://maps.googleapis.com/maps/api/place/photo?...",
    "https://maps.googleapis.com/maps/api/place/photo?...",
    ...
  ]
}
```

**Utilisé par** : `/admin/hotels` → "Nouvel Hôtel" avec checkbox "Télécharger photos"

## 🔍 CE QUI SE PASSE

### Scénario actuel de l'utilisateur :

1. **Crée une étape** sans avoir créé l'hôtel d'abord
2. L'hôtel est créé automatiquement dans la banque (`hotels`)
3. **Clique** "Télécharger photos Google"
4. Les photos vont dans la collection `media` (❌ mauvais endroit)
5. Les photos ne sont PAS dans `hotel.photos` (❌)
6. Les cartes n'affichent rien car elles lisent `hotel.photos`

### Ensuite il essaie :

1. Va sur `/admin/hotels`
2. Crée un nouvel hôtel avec même nom
3. **Checkbox** "Télécharger photos Google"
4. Le système vérifie `get_hotel_photos()` qui lit la collection `media`
5. ✅ Trouve les photos (dans `media`)
6. ❌ **MESSAGE** : "photos existent déjà"
7. ❌ Mais `hotel.photos` est toujours vide !

## 💡 SOLUTION

### Option A : Supprimer complètement l'ancien système `media`

**Actions** :
1. Supprimer la fonction `fetch-google-photos` (étapes)
2. Supprimer `get_hotel_photos()` qui lit la collection `media`
3. Ne garder QUE `hotel.photos` dans la banque
4. Forcer à créer les hôtels via `/admin/hotels` d'abord

**Avantages** :
- ✅ Source unique
- ✅ Pas de confusion
- ✅ Architecture propre

**Inconvénients** :
- ❌ Perd la fonctionnalité "télécharger photos" depuis les étapes

### Option B : Synchroniser les 2 systèmes (complexe)

**Actions** :
1. Quand on télécharge des photos dans `media` → Les copier dans `hotel.photos`
2. Quand on lit `hotel.photos` → Merger avec les photos de `media`

**Avantages** :
- ✅ Garde les 2 fonctionnalités

**Inconvénients** :
- ❌ Complexe
- ❌ Duplication
- ❌ Désynchronisation possible

### Option C : Nettoyer et recommencer (RECOMMANDÉ)

**Actions immédiates** :
1. **Supprimer** la collection `media` (vide Firebase)
2. **Supprimer** tous les hôtels de la banque
3. **Supprimer** tous les voyages
4. **Workflow propre** :
   - D'abord créer l'hôtel via `/admin/hotels` (avec photos)
   - Ensuite créer le voyage
   - Ajouter des étapes en sélectionnant les hôtels

**Avantages** :
- ✅ Recommence proprement
- ✅ Architecture correcte dès le début
- ✅ Pas de legacy code

## 📋 DÉCISION

**Je recommande l'Option C** :

1. Reset complet de Firebase
2. Ne garder QUE le système `hotel.photos`
3. Workflow : Banque d'hôtels PUIS voyages

**Voulez-vous que je** :
- A) Supprime le code `fetch-google-photos` (étapes)
- B) Crée un script de nettoyage Firebase
- C) Les deux
