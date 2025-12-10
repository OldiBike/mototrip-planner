import os
import sys
import pandas as pd
import io

# Add the app directory to the path so we can import the service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'app')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from app.services.gemini_service import detect_excel_structure, parse_excel_file_with_gemini

def test_v2_import():
    file_path = "/Users/oldibox/Library/CloudStorage/OneDrive-Personnel/OldiBike/App/wbt_export.xlsx"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    print(f"🧪 Reading real Excel file: {file_path}")
    with open(file_path, 'rb') as f:
        file_bytes = f.read()
    
    # Test 1: Structure Detection
    print("\n🧪 Testing detect_excel_structure...")
    df_preview = pd.read_excel(io.BytesIO(file_bytes), header=None, nrows=20)
    structure = detect_excel_structure(df_preview)
    print(f"✅ Structure detected: {structure}")
    
    if structure.get('header_row_index') != 4: # Assuming 4 based on previous runs (0-indexed, so row 5)
        # Wait, previous run said line 4. Let's see what it finds.
        print(f"⚠️ Expected header row might be different. Found: {structure.get('header_row_index')}")

    # Test 2: Full Parsing
    print("\n🧪 Testing parse_excel_file_with_gemini (V2)...")
    
    def progress_cb(msg, pct):
        print(f"  🔄 Progress {pct}%: {msg}")
        
    results = parse_excel_file_with_gemini(file_bytes, "wbt_export.xlsx", progress_callback=progress_cb)
    
    if results:
        print(f"\n✅ Success! Parsed {len(results)} items.")
        print("First item sample:")
        print(results[0])
    else:
        print("\n❌ Parsing failed or returned None.")

if __name__ == "__main__":
    test_v2_import()
