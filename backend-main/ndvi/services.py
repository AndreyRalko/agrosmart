import numpy as np
import rasterio
import io
from PIL import Image
import matplotlib.cm as cm
from django.core.files.base import ContentFile
from .models import DroneUpload

FILE_TYPE_MAP = {
    '.tif': 'GeoTIFF',
    '.tiff': 'GeoTIFF',
    '.shp': 'Shapefile',
    '.geojson': 'GeoJSON',
}

def calculate_ndvi(file) -> dict:
    with rasterio.open(file) as src:
        bands = src.count
        if bands >= 4:
            red = src.read(3).astype(float)
            nir = src.read(4).astype(float)
        elif bands == 2:
            red = src.read(1).astype(float)
            nir = src.read(2).astype(float)
        else:
            raise ValueError(f"Недостаточно каналов: {bands}. Нужно минимум 2 (RED, NIR)")

        mask = (nir + red) == 0
        ndvi = np.where(mask, np.nan, (nir - red) / (nir + red))
        valid = ndvi[~np.isnan(ndvi)]

        stats = {
            "min": round(float(np.min(valid)), 4),
            "max": round(float(np.max(valid)), 4),
            "mean": round(float(np.mean(valid)), 4),
            "std": round(float(np.std(valid)), 4),
        }

        ndvi_norm = np.clip((ndvi + 1) / 2, 0, 1)
        ndvi_norm = np.nan_to_num(ndvi_norm, nan=0)
        colored = (cm.RdYlGn(ndvi_norm) * 255).astype(np.uint8)
        img = Image.fromarray(colored[:, :, :3])
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)

        return {"image_content": buffer, "stats": stats}


def save_drone_upload(file, field, flight_date) -> DroneUpload:
    filename = file.name
    ext = '.' + filename.rsplit('.', 1)[-1].lower()
    file_size_mb = round(file.size / (1024 * 1024), 2)
    file_type = FILE_TYPE_MAP.get(ext, 'Unknown')

    result = calculate_ndvi(file)
    stats = result["stats"]

    upload = DroneUpload(
        field=field,
        flight_date=flight_date,
        original_filename=filename,
        file_size_mb=file_size_mb,
        file_type=file_type,
        ndvi_mean=stats["mean"],
        ndvi_min=stats["min"],
        ndvi_max=stats["max"],
        ndvi_std=stats["std"],
    )

    image_name = f"ndvi_{field.no}_{flight_date}_{filename}.png"
    upload.ndvi_image.save(image_name, ContentFile(result["image_content"].read()), save=True)

    return upload