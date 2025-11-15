class Customer:
    """Modèle représentant un client"""
    
    def __init__(self, customer_id, name, email, phone, address, created_at=None, assigned_trips=None):
        self.customer_id = customer_id
        self.name = name
        self.email = email
        self.phone = phone
        self.address = address
        self.created_at = created_at
        self.assigned_trips = assigned_trips or []

    def to_dict(self):
        """Convertit le client en dictionnaire pour Firebase"""
        return {
            "name": self.name,
            "email": self.email,
            "phone": self.phone,
            "address": self.address,
            "createdAt": self.created_at
        }
    
    @staticmethod
    def from_dict(customer_id, data):
        """Crée un objet Customer depuis un dictionnaire Firebase"""
        return Customer(
            customer_id=customer_id,
            name=data.get('name', ''),
            email=data.get('email', ''),
            phone=data.get('phone', ''),
            address=data.get('address', ''),
            created_at=data.get('createdAt'),
            assigned_trips=data.get('assignedTrips', [])
        )


class TripAssignment:
    """Modèle représentant l'assignation d'un voyage à un client"""
    
    def __init__(self, assignment_id, trip_id, trip_name, start_date, end_date, created_at=None):
        self.assignment_id = assignment_id
        self.trip_id = trip_id
        self.trip_name = trip_name
        self.start_date = start_date
        self.end_date = end_date
        self.created_at = created_at
    
    def to_dict(self):
        """Convertit l'assignation en dictionnaire pour Firebase"""
        return {
            "tripId": self.trip_id,
            "tripName": self.trip_name,
            "startDate": self.start_date,
            "endDate": self.end_date,
            "createdAt": self.created_at
        }
    
    @staticmethod
    def from_dict(assignment_id, data):
        """Crée un objet TripAssignment depuis un dictionnaire Firebase"""
        return TripAssignment(
            assignment_id=assignment_id,
            trip_id=data.get('tripId', ''),
            trip_name=data.get('tripName', ''),
            start_date=data.get('startDate', ''),
            end_date=data.get('endDate', ''),
            created_at=data.get('createdAt')
        )


class Voucher:
    """Modèle représentant un voucher d'hôtel"""
    
    def __init__(self, voucher_id, file_name, download_url, storage_path, uploaded_at=None, file_size=0):
        self.voucher_id = voucher_id
        self.file_name = file_name
        self.download_url = download_url
        self.storage_path = storage_path
        self.uploaded_at = uploaded_at
        self.file_size = file_size
    
    def to_dict(self):
        """Convertit le voucher en dictionnaire pour Firebase"""
        return {
            "fileName": self.file_name,
            "downloadURL": self.download_url,
            "storagePath": self.storage_path,
            "uploadedAt": self.uploaded_at,
            "fileSize": self.file_size
        }
    
    @staticmethod
    def from_dict(voucher_id, data):
        """Crée un objet Voucher depuis un dictionnaire Firebase"""
        return Voucher(
            voucher_id=voucher_id,
            file_name=data.get('fileName', ''),
            download_url=data.get('downloadURL', ''),
            storage_path=data.get('storagePath', ''),
            uploaded_at=data.get('uploadedAt'),
            file_size=data.get('fileSize', 0)
        )


class GPXFile:
    """Modèle représentant un fichier GPX"""
    
    def __init__(self, gpx_id, file_name, download_url, storage_path, uploaded_at=None, file_size=0, assignment_id=None):
        self.gpx_id = gpx_id
        self.file_name = file_name
        self.download_url = download_url
        self.storage_path = storage_path
        self.uploaded_at = uploaded_at
        self.file_size = file_size
        self.assignment_id = assignment_id
    
    def to_dict(self):
        """Convertit le fichier GPX en dictionnaire pour Firebase"""
        return {
            "fileName": self.file_name,
            "downloadURL": self.download_url,
            "storagePath": self.storage_path,
            "uploadedAt": self.uploaded_at,
            "fileSize": self.file_size,
            "assignmentId": self.assignment_id
        }
    
    @staticmethod
    def from_dict(gpx_id, data):
        """Crée un objet GPXFile depuis un dictionnaire Firebase"""
        return GPXFile(
            gpx_id=gpx_id,
            file_name=data.get('fileName', ''),
            download_url=data.get('downloadURL', ''),
            storage_path=data.get('storagePath', ''),
            uploaded_at=data.get('uploadedAt'),
            file_size=data.get('fileSize', 0),
            assignment_id=data.get('assignmentId')
        )
