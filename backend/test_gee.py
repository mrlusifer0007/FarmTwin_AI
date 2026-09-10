"""
Quick Earth Engine + Sentinel-2 connection test.
Run from inside the backend/ directory with venv active:

    python test_gee.py

Expected output:
    checkmark Earth Engine initialized
    AgriTwin Earth Engine connection successful!
    checkmark Sentinel-2 connection successful!
    Number of January 2025 images (global): <some number>
"""
import ee

# Will use locally stored OAuth credentials from `earthengine authenticate`
# or Application Default Credentials -- no JSON key needed.
ee.Initialize(project="agri-ad-68884")

print("Earth Engine initialized OK")
print(ee.String("AgriTwin Earth Engine connection successful!").getInfo())

# Test Sentinel-2 access
collection = (
    ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate("2025-01-01", "2025-01-31")
)

print("Sentinel-2 connection successful!")
print("Number of January 2025 images (global):", collection.size().getInfo())
