import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const ORIGIN = { lat: -33.8617, lon: 151.2100 }; // Circular Quay
const METRES_PER_DEG_LAT = 110540;
const METRES_PER_DEG_LON = 111320 * Math.cos(ORIGIN.lat * Math.PI / 180);

function project([lon, lat]) {
  return new THREE.Vector3((lon - ORIGIN.lon) * METRES_PER_DEG_LON, 0, -(lat - ORIGIN.lat) * METRES_PER_DEG_LAT);
}

function roadWidth(tags = {}) {
  const widths = { motorway: 15, trunk: 13, primary: 11, secondary: 9, tertiary: 7, residential: 6, living_street: 4, service: 3.5, footway: 2, path: 1.5 };
  return widths[tags.highway] || 5;
}

function addRoad(scene, coords, width, material) {
  for (let i = 1; i < coords.length; i++) {
    const a = project(coords[i - 1]), b = project(coords[i]);
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    if (length < 0.5) continue;
    const px = -dz / length * width / 2, pz = dx / length * width / 2;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([
      a.x + px, 0.035, a.z + pz, a.x - px, 0.035, a.z - pz,
      b.x - px, 0.035, b.z - pz, b.x + px, 0.035, b.z + pz
    ], 3));
    geometry.setIndex([0, 2, 1, 0, 3, 2]);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}

function addBuilding(scene, ring, tags, palette) {
  if (ring.length < 4) return;
  const points = ring.slice(0, -1).map(project);
  if (points.length < 3) return;
  const shape = new THREE.Shape();
  shape.moveTo(points[0].x, -points[0].z);
  for (const p of points.slice(1)) shape.lineTo(p.x, -p.z);
  shape.closePath();
  const explicitHeight = Number.parseFloat(tags.height);
  const levels = Number.parseFloat(tags['building:levels']);
  const height = Number.isFinite(explicitHeight) ? Math.max(3, Math.min(explicitHeight, 220))
    : Number.isFinite(levels) ? Math.max(3, Math.min(levels * 3.2, 220)) : 10 + Math.random() * 18;
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false });
  // ExtrudeGeometry uses its depth axis as Z; rotate to stand buildings upright.
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    color: palette[Math.floor(Math.random() * palette.length)],
    roughness: 0.78,
    metalness: 0.05
  });
  const building = new THREE.Mesh(geometry, material);
  building.position.y = 0;
  building.castShadow = true;
  building.receiveShadow = true;
  scene.add(building);
}

async function fetchSydneyFeatures() {
  const bbox = '-33.90,151.18,-33.858,151.225';
  const query = `[out:json][timeout:180];(way["highway"](${bbox});way["building"](${bbox}););out geom;`;
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      const url = endpoint + '?data=' + encodeURIComponent(query);
      const response = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Map server returned HTTP ' + response.status);
      const osm = await response.json();
      const features = [];
      for (const way of osm.elements || []) {
        if (way.type !== 'way' || !way.geometry || !way.tags) continue;
        const coords = way.geometry.map(point => [point.lon, point.lat]);
        if (way.tags.highway && coords.length >= 2) {
          features.push({ type: 'Feature', properties: way.tags,
            geometry: { type: 'LineString', coordinates: coords } });
        } else if (way.tags.building && coords.length >= 4 &&
                   coords[0][0] === coords.at(-1)[0] && coords[0][1] === coords.at(-1)[1]) {
          features.push({ type: 'Feature', properties: way.tags,
            geometry: { type: 'Polygon', coordinates: [coords] } });
        }
      }
      if (!features.length) throw new Error('The map service returned no Sydney features');
      return { type: 'FeatureCollection', features };
    } catch (error) { lastError = error; }
  }
  throw new Error('Could not load Sydney map automatically: ' + (lastError?.message || 'map services unavailable'));
}

export async function loadSydneyMap(scene, materials) {
  const data = await fetchSydneyFeatures();
  const palette = [0xaaa69b, 0xc1b8a8, 0x7f898d, 0x9daeb0, 0x8b9699, 0xd0c8b8];
  let roads = 0, buildings = 0;
  for (const feature of data.features || []) {
    const tags = feature.properties || {};
    const geometry = feature.geometry;
    if (!geometry) continue;
    if (geometry.type === 'LineString' && tags.highway) {
      addRoad(scene, geometry.coordinates, roadWidth(tags), materials.road);
      roads++;
    } else if (geometry.type === 'Polygon' && tags.building) {
      addBuilding(scene, geometry.coordinates[0], tags, palette);
      buildings++;
    }
  }
  return { roads, buildings, attribution: '© OpenStreetMap contributors' };
}
