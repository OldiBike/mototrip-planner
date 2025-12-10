import pandas as pd
import os

file_path = "/Users/oldibox/Library/CloudStorage/OneDrive-Personnel/OldiBike/App/wbt_export.xlsx"
df = pd.read_excel(file_path)
print("Columns:", df.columns.tolist())
print("First 10 rows:")
print(df.head(10))
