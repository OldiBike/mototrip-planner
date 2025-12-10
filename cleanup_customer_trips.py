

CUSTOMER_ID = 'Bi2uWT15yBnfVEdB5nrz'



from app import create_app
from app.services.firebase_service import FirebaseService

CUSTOMER_ID = 'Bi2uWT15yBnfVEdB5nrz'

def cleanup_via_service():
    app = create_app()
    
    with app.app_context():
        app_id = app.config.get('APP_ID')
        print(f"🔹 APP_ID: {app_id}")
        
        service = FirebaseService(app_id)
        
        # 1. Fetch Customer to get User ID
        print(f"🔍 Fetching customer {CUSTOMER_ID}...")
        customer = service.get_customer(CUSTOMER_ID)
        
        if not customer:
            print("❌ Customer not found via Service.")
            return

        print(f"✅ Customer found: {customer.get('name')}")
        user_id = customer.get('userId')
        print(f"   User ID: {user_id}")

        # 2. Delete Assigned Trips
        print("🧹 Deleting assigned trips...")
        # FirebaseService doesn't have a 'delete_all_assigned_trips' so we use internal db ref
        # assignments_ref = service.db.collection(f'artifacts/{app_id}/customers').document(CUSTOMER_ID).collection('assignedTrips')
        # BUT wait, let's trust the service path construction
        
        # We can construct the path manually using the verified app_id
        cust_ref = service.db.collection(f'artifacts/{app_id}/customers').document(CUSTOMER_ID)
        
        # Delete assignedTrips subcollection docs
        assign_docs = cust_ref.collection('assignedTrips').stream()
        count = 0
        for doc in assign_docs:
            print(f"   - Deleting assignment: {doc.id}")
            doc.reference.delete()
            count += 1
        print(f"✅ Deleted {count} assignments.")
        
        # 3. Delete Bookings
        if user_id:
            print(f"🧹 Deleting bookings for user {user_id}...")
            bookings_ref = service.db.collection(f'artifacts/{app_id}/bookings').where('userId', '==', user_id)
            b_docs = bookings_ref.stream()
            b_count = 0
            for doc in b_docs:
                print(f"   - Deleting booking: {doc.id}")
                doc.reference.delete()
                b_count += 1
            print(f"✅ Deleted {b_count} bookings.")

if __name__ == '__main__':
    cleanup_via_service()

