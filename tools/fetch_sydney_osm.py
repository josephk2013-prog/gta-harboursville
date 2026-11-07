#!/usr/bin/env python3
"""Download real Sydney CBD roads and building footprints from OpenStreetMap.

Usage: python tools/fetch_sydney_osm.py
Output: data/sydney-cbd.geojson (WGS84; rendered at real-world scale).
"""
import json
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "sydney-cbd.geojson"
# Circular Quay-centred starter area: The Rocks, CBD, Barangaroo, Darling Harbour,
# Haymarket and Surry Hills edge. Expand this bbox in staged regional extracts.
BBOX = "-33.89,151.18,-33.84,151.225"
QUERY = f"""[out:json][timeout:180];
(
  way["highway"]({BBOX});
  way["building"]({BBOX});
);
out geom;"""

def main():
    body = urllib.parse.urlencode({"data": QUERY}).encode()
    endpoints = [
        "https://overpass-api.de/api/interpreter",
        "https://overpass.kumi.systems/api/interpreter",
    ]
    last_error = None
    for endpoint in endpoints:
        try:
            request = urllib.request.Request(
                endpoint, data=body,
                headers={"User-Agent": "GTA-Harboursville/0.1 (OpenStreetMap data import)"}
            )
            with urllib.request.urlopen(request, timeout=240) as response:
                osm = json.load(response)
            break
        except (OSError, urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            time.sleep(2)
    else:
        raise SystemExit(f"Could not download OSM data: {last_error}")

    features = []
    for element in osm.get("elements", []):
        if element.get("type") != "way" or "geometry" not in element:
            continue
        tags = element.get("tags", {})
        coords = [[p["lon"], p["lat"]] for p in element["geometry"]]
        if "highway" in tags and len(coords) >= 2:
            features.append({"type": "Feature", "properties": tags,
                             "geometry": {"type": "LineString", "coordinates": coords}})
        elif "building" in tags and len(coords) >= 4 and coords[0] == coords[-1]:
            features.append({"type": "Feature", "properties": tags,
                             "geometry": {"type": "Polygon", "coordinates": [coords]}})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"type": "FeatureCollection", "features": features},
                              separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(features):,} Sydney roads/buildings to {OUT}")
    print("Source: © OpenStreetMap contributors; data is under the ODbL.")

if __name__ == "__main__":
    main()
