import base64
import io
import json
from datetime import date, timedelta
from pathlib import Path

import numpy as np
import planetary_computer
import pystac_client
import rasterio
from PIL import Image
from django.conf import settings
from matplotlib import cm
from rasterio.features import geometry_mask
from rasterio.warp import transform, transform_bounds
from rasterio.windows import Window, from_bounds

from field.models import Field
from ndvi.models import DroneUpload, NdviObservation

CATALOG_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
NDVI_COLOR_MIN = -0.1
NDVI_COLOR_MAX = 0.8
_history_ready: set[int] = set()


def _cache_dir():
    path = Path(settings.MEDIA_ROOT) / "ndvi" / "cache"
    path.mkdir(parents=True, exist_ok=True)
    return path


def _field_ring(field: Field):
    corners = [
        (float(field.pos_top_left_lon), float(field.pos_top_left_lat)),
        (float(field.pos_top_right_lon), float(field.pos_top_right_lat)),
        (float(field.pos_bottom_right_lon), float(field.pos_bottom_right_lat)),
        (float(field.pos_bottom_left_lon), float(field.pos_bottom_left_lat)),
    ]
    if any(abs(lon) < 1e-6 and abs(lat) < 1e-6 for lon, lat in corners):
        return None
    if corners[0] != corners[-1]:
        corners = corners + [corners[0]]
    return corners


def _bbox_of(rings):
    lons = [lon for ring in rings for lon, _lat in ring]
    lats = [lat for ring in rings for _lon, lat in ring]
    pad = 0.001
    return (min(lons) - pad, min(lats) - pad, max(lons) + pad, max(lats) + pad)


def _catalog():
    return pystac_client.Client.open(CATALOG_URL, modifier=planetary_computer.sign_inplace)


def _scene_covers(item, bbox):
    west, south, east, north = item.bbox
    return west <= bbox[0] and south <= bbox[1] and east >= bbox[2] and north >= bbox[3]


def _choose_scene(bbox, day: date):
    cache_path = _cache_dir() / f"scene-{day.isoformat()}.json"
    if cache_path.exists():
        cached = json.loads(cache_path.read_text(encoding="utf-8"))
        search = _catalog().search(collections=["sentinel-2-l2a"], ids=[cached["id"]])
        items = list(search.items())
        if items:
            return items[0], cached

    start = (day - timedelta(days=20)).isoformat()
    end = (day + timedelta(days=2)).isoformat()
    search = _catalog().search(
        collections=["sentinel-2-l2a"],
        bbox=list(bbox),
        datetime=f"{start}/{end}",
        query={"eo:cloud_cover": {"lt": 40}},
        max_items=12,
    )
    candidates = [item for item in search.items() if _scene_covers(item, bbox)]
    if not candidates:
        raise ValueError("Нет безоблачного снимка Sentinel-2 для этой даты")

    target = day.toordinal()

    def sort_key(item):
        scene_day = item.datetime.date().toordinal()
        cloud = float(item.properties.get("eo:cloud_cover") or 100)
        return (abs(scene_day - target), cloud)

    item = sorted(candidates, key=sort_key)[0]
    meta = {
        "id": item.id,
        "date": item.datetime.date().isoformat(),
        "cloud_cover": round(float(item.properties.get("eo:cloud_cover") or 0), 2),
    }
    cache_path.write_text(json.dumps(meta), encoding="utf-8")
    return item, meta


def _read_band(href, bbox):
    with rasterio.open(href) as src:
        left, bottom, right, top = transform_bounds("EPSG:4326", src.crs, *bbox)
        window = from_bounds(left, bottom, right, top, transform=src.transform)
        window = window.round_offsets().round_lengths()
        window = window.intersection(Window(0, 0, src.width, src.height))
        if window.width <= 1 or window.height <= 1:
            raise ValueError("Снимок не покрывает поля")
        data = src.read(1, window=window).astype("float32")
        return data, src.window_transform(window), src.crs


def _png_and_stats(red, nir, transform_grid, crs, ring):
    xs, ys = transform("EPSG:4326", crs, [p[0] for p in ring], [p[1] for p in ring])
    polygon = {"type": "Polygon", "coordinates": [list(zip(xs, ys))]}
    inside = geometry_mask(
        [polygon],
        out_shape=red.shape,
        transform=transform_grid,
        invert=True,
        all_touched=True,
    )
    denom = nir + red
    ndvi = np.where((denom == 0) | ~inside, np.nan, (nir - red) / denom)
    valid = ndvi[np.isfinite(ndvi)]
    if valid.size == 0:
        return None

    span = NDVI_COLOR_MAX - NDVI_COLOR_MIN
    normalized = np.clip((ndvi - NDVI_COLOR_MIN) / span, 0, 1)
    normalized = np.nan_to_num(normalized, nan=0)
    rgba = (cm.RdYlGn(normalized) * 255).astype(np.uint8)
    rgba[..., 3] = np.where(np.isfinite(ndvi), 235, 0)

    image = Image.fromarray(rgba, mode="RGBA")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG", optimize=True)
    height, width = red.shape
    west_x = transform_grid.c
    north_y = transform_grid.f
    east_x = west_x + transform_grid.a * width
    south_y = north_y + transform_grid.e * height
    lons, lats = transform(crs, "EPSG:4326", [west_x, east_x], [south_y, north_y])
    south, north = sorted(lats)
    west, east = sorted(lons)
    return {
        "png": buffer.getvalue(),
        "mean": round(float(np.mean(valid)), 3),
        "bounds": [round(south, 6), round(west, 6), round(north, 6), round(east, 6)],
    }


def build_ndvi_map(day: date) -> dict:
    fields = list(Field.objects.all().order_by("id"))
    located = [(field, ring) for field in fields if (ring := _field_ring(field))]
    if not located:
        return {
            "requested_date": day.isoformat(),
            "scene_date": None,
            "scene_id": None,
            "cloud_cover": None,
            "fields": [],
            "error": "У полей нет координат",
        }

    bbox = _bbox_of([ring for _field, ring in located])
    item, scene = _choose_scene(bbox, day)
    cache_dir = _cache_dir()
    pending = []
    ready = {}

    for field, ring in located:
        image_path = cache_dir / f"{scene['id']}-{field.id}.png"
        meta_path = cache_dir / f"{scene['id']}-{field.id}.json"
        if image_path.exists() and meta_path.exists():
            ready[field.id] = {
                "png": image_path.read_bytes(),
                **json.loads(meta_path.read_text(encoding="utf-8")),
            }
        else:
            pending.append((field, ring, image_path, meta_path))

    if pending:
        red, grid, crs = _read_band(item.assets["B04"].href, bbox)
        nir, _, _ = _read_band(item.assets["B08"].href, bbox)
        if red.shape != nir.shape:
            raise ValueError("Каналы снимка не совпадают по размеру")
        for field, ring, image_path, meta_path in pending:
            rendered = _png_and_stats(red, nir, grid, crs, ring)
            if rendered is None:
                continue
            image_path.write_bytes(rendered["png"])
            meta = {"mean": rendered["mean"], "bounds": rendered["bounds"]}
            meta_path.write_text(json.dumps(meta), encoding="utf-8")
            ready[field.id] = rendered

    payload_fields = []
    for field, _ring in located:
        rendered = ready.get(field.id)
        if not rendered:
            continue
        payload_fields.append({
            "field_id": field.id,
            "field_no": field.no,
            "square": field.square,
            "ndvi_mean": rendered["mean"],
            "bounds": rendered["bounds"],
            "image": "data:image/png;base64," + base64.b64encode(rendered["png"]).decode("ascii"),
        })
        NdviObservation.objects.update_or_create(
            field=field,
            scene_id=scene["id"],
            defaults={
                "scene_date": date.fromisoformat(scene["date"]),
                "ndvi_mean": rendered["mean"],
                "cloud_cover": scene["cloud_cover"],
                "source": "sentinel-2",
            },
        )

    return {
        "requested_date": day.isoformat(),
        "scene_date": scene["date"],
        "scene_id": scene["id"],
        "cloud_cover": scene["cloud_cover"],
        "fields": payload_fields,
    }


def get_field_history(field_id: int) -> dict:
    field = Field.objects.get(pk=field_id)
    stored = NdviObservation.objects.filter(field=field).count()
    if field_id not in _history_ready and stored < 4:
        _history_ready.add(field_id)
        today = date.today()
        for offset in (120, 90, 60, 30, 0):
            try:
                build_ndvi_map(today - timedelta(days=offset))
            except ValueError:
                continue

    points = [
        {
            "date": row.scene_date.isoformat(),
            "ndvi_mean": row.ndvi_mean,
            "source": row.source,
            "cloud_cover": row.cloud_cover,
        }
        for row in NdviObservation.objects.filter(field=field)
    ]
    for upload in DroneUpload.objects.filter(field=field).order_by("flight_date"):
        points.append({
            "date": upload.flight_date.isoformat(),
            "ndvi_mean": upload.ndvi_mean,
            "source": "drone",
            "cloud_cover": None,
        })
    points.sort(key=lambda item: item["date"])
    return {
        "field_id": field.id,
        "field_no": field.no,
        "square": field.square,
        "points": points,
    }
