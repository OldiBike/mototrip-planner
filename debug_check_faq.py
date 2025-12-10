from flask import Flask, render_template

app = Flask(__name__, template_folder='app/templates', static_folder='app/static')
app.secret_key = 'debug_key'
app.config['SERVER_NAME'] = 'localhost'
app.config['PREFERRED_URL_SCHEME'] = 'http'

@app.route('/book/<slug>', endpoint='trips.book_trip')
def book_trip(slug):
    return "Book"

if __name__ == '__main__':
    print("Checking FAQ rendering...")
    with app.test_request_context():
        try:
            rendered = render_template('trips/detail_v2.html', trip={
                'name': 'Test Trip',
                'region': 'Test Region',
                'totalDistance': 1200,
                'totalElevation': 15000,
                'difficultyLevel': 3,
                'coverImage': 'https://example.com/cover.jpg',
                'headerImage': 'https://example.com/header.jpg',
                'days': [],
                'pricePerPerson': 1200,
                'publishedSlug': 'test-trip'
            })
            
            checks = [
                "Questions Fréquemment Posées",
                "Qu'est ce qui est compris dans le prix ?",
                "Assurance beau temps"
            ]
            
            all_passed = True
            for check in checks:
                if check in rendered:
                    print(f"✅ Found: {check}")
                else:
                    print(f"❌ Missing: {check}")
                    all_passed = False
            
            if all_passed:
                print("SUCCESS: All FAQ items found.")
            else:
                print("FAILURE: Some FAQ items missing.")
                
        except Exception as e:
            print(f"Render Error: {e}")
