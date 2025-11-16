# test_api.py - Updated to use your live Hugging Face Space

import requests
import zipfile
import tempfile
from PIL import Image, ImageDraw, ImageFont
import matplotlib.pyplot as plt
import os

# === UPDATE THIS URL TO YOUR HF SPACE ===
API_URL = "https://rajdeeps2003-nih-yolo-api.hf.space/predict"
# Alternative: https://huggingface.co/spaces/rajdeeps2003/nih-yolo-api/predict

# Path to your local ZIP file
ZIP_PATH = r"D:\IISC_Projects\NIH_YOLO_IT2\NIH_Image_Labeller\subject2 test images.zip"

def test_api():
    print("Uploading ZIP to API...")
    with open(ZIP_PATH, 'rb') as f:
        files = {'zip_file': (os.path.basename(ZIP_PATH), f, 'application/zip')}
        try:
            response = requests.post(API_URL, files=files, timeout=120)
        except requests.exceptions.RequestException as e:
            print(f"Request failed: {e}")
            return

    if response.status_code != 200:
        print(f"API Error {response.status_code}: {response.text}")
        return

    print("API Response received. Parsing bounding boxes...")
    results = response.json()  # {image_name: [{'class': str, 'conf': float, 'bbox': [x1,y1,x2,y2]}, ...]}

    # Extract images from local ZIP to temp dir
    with tempfile.TemporaryDirectory() as extract_dir:
        with zipfile.ZipFile(ZIP_PATH, 'r') as zip_ref:
            zip_ref.extractall(extract_dir)
        
        print(f"Found {len(results)} images with detections.")
        
        # For each image in results, overlay boxes and show
        for image_name, boxes in results.items():
            img_path = os.path.join(extract_dir, image_name)
            if not os.path.exists(img_path):
                print(f"Warning: Image {image_name} not found in ZIP")
                continue
            
            im = Image.open(img_path).convert("RGB")
            draw = ImageDraw.Draw(im)
            
            # Font for labels
            try:
                font = ImageFont.truetype("arial.ttf", 18)
            except:
                font = ImageFont.load_default()
            
            print(f"  → {image_name}: {len(boxes)} cells detected")
            for box in boxes:
                x1, y1, x2, y2 = box['bbox']
                conf = box['conf']
                class_name = box['class']
                label = f"{class_name} {conf:.2f}"
                
                # Draw box + label
                draw.rectangle([x1, y1, x2, y2], outline="lime", width=3)
                draw.text((x1 + 4, y1 - 20), label, fill="lime", font=font)
            
            # Show the annotated image
            plt.figure(figsize=(12, 8))
            plt.imshow(im)
            plt.title(f"Detected Cells: {image_name} ({len(boxes)} found)", fontsize=14)
            plt.axis('off')
            plt.tight_layout()
            plt.show()

    print("Done! All images processed.")

if __name__ == "__main__":
    test_api()