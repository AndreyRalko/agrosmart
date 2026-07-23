import os
from sentinelsat import SentinelAPI, geojson_to_wkt
from datetime import date
import json

def get_sentinel_image (field, start_date, end_date, max_cloud=20):
    api = SentinelAPI (
        os.environ['COPERNICUS_USERNAME'],
        os.environ['COPERNICUS_PASSWORD'],
        'https://apihub.copernicus.eu/apihub'
    )

    geojson = {
        "type": "Polygon",
        "coordinates": [[
            [float(field.pos_top_left_long), float(field.pos_top_left_lat)],
            [float(field.pos_top_right_long), float(field.pos_top_right_lat)],
            [float(field.pos_btm_right_long), float(field.pos_btm_right_lat)],
            [float(field.pos_btm_left_long), float(field.pos_btm_left_lat)],
            [float(field.pos_top_left_long), float(field.pos_top_left_lat)],
        ]]
    }  

    footprint = geojson_to_wkt(geojson)

    products = api.query(
        footprint,
        date=(start_date, end_date),
        platformname='Sentinel-2',
        producttype='S2MSI2A',
        cloudcoverpercentage = (0, max_cloud)
    )

    if not products:
        raise ValueError("No satellite images found for this field and data range")

    best = sorted(products.values(), key = lambda x: x['cloudcoverpercentage']) [0]

    api.download(best['uuid'], directory_path='./media/sentinel/')

    return best