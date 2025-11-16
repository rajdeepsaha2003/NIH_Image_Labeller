import zipfile
import tempfile
import os
from PIL import Image
import matplotlib.pyplot as plt


ZIP_PATH = r"C:\Users\Rajdeep\Downloads\yolo_annotations.zip"  # change if needed


def crop_from_yolo(image, labels_path):
    """Crop using YOLO label format."""
    W, H = image.size
    crops = []

    with open(labels_path, "r") as f:
        lines = f.readlines()

    for idx, line in enumerate(lines):
        parts = line.strip().split()
        if len(parts) != 5:
            continue

        cls, cx, cy, w, h = map(float, parts)

        # Convert YOLO → pixel coordinates
        x1 = int((cx - w/2) * W)
        y1 = int((cy - h/2) * H)
        x2 = int((cx + w/2) * W)
        y2 = int((cy + h/2) * H)

        # Crop
        crop = image.crop((x1, y1, x2, y2))
        crops.append((idx, crop))

    return crops


def scroll_crops_from_zip(zip_path):

    if not os.path.exists(zip_path):
        print("❌ ZIP file not found!")
        return

    # Create temp directory
    temp_dir = tempfile.mkdtemp()

    # Extract ZIP contents
    with zipfile.ZipFile(zip_path, 'r') as z:
        z.extractall(temp_dir)

    print(f"📦 Extracted ZIP to: {temp_dir}")

    # Find images and labels
    images = sorted([f for f in os.listdir(temp_dir) if f.lower().endswith((".png", ".jpg", ".jpeg"))])
    labels = sorted([f for f in os.listdir(temp_dir) if f.lower().endswith(".txt")])

    if len(images) == 0 or len(labels) == 0:
        print("❌ No images or YOLO labels found.")
        return

    crop_dir = os.path.join(temp_dir, "cropped")
    os.makedirs(crop_dir, exist_ok=True)

    all_crops = []

    # Process each image + label
    for img_name in images:
        base = os.path.splitext(img_name)[0]
        label_file = os.path.join(temp_dir, f"{base}.txt")

        if not os.path.exists(label_file):
            continue

        img_path = os.path.join(temp_dir, img_name)
        img = Image.open(img_path)

        # Crop using the YOLO labels
        crops = crop_from_yolo(img, label_file)

        # Save each crop
        for idx, crop in crops:
            crop_name = f"{base}_crop_{idx+1}.png"
            crop_path = os.path.join(crop_dir, crop_name)
            crop.save(crop_path)
            all_crops.append(crop_path)

    if len(all_crops) == 0:
        print("❌ No crops generated.")
        return

    print(f"📸 Total Crops: {len(all_crops)}")
    print("➡️ Showing crops one-by-one...\n")

    # Scroll cropped images
    for crop_path in all_crops:
        img = Image.open(crop_path)
        plt.figure(figsize=(6, 6))
        plt.imshow(img)
        plt.title(os.path.basename(crop_path))
        plt.axis("off")
        plt.show()
        input("➡️ Press ENTER for next crop...")


scroll_crops_from_zip(ZIP_PATH)
