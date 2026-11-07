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

// Hard-coded Greater Sydney region. The procedural street fabric and named corridors
// are bundled in source: no runtime map requests. This is a playable regional layout,
// not a survey-accurate street/building dataset.
const REGION = { west: 150.98, east: 151.36, south: -34.02, north: -33.70 };
const CORRIDORS = [
  ["M1 Pacific Motorway", [[151.21,-33.86],[151.225,-33.82],[151.245,-33.78],[151.27,-33.74]], "motorway"],
  ["M2 Hills Motorway", [[151.10,-33.77],[151.16,-33.78],[151.22,-33.79],[151.29,-33.79]], "motorway"],
  ["M4 Western Motorway", [[150.99,-33.87],[151.06,-33.87],[151.13,-33.87],[151.20,-33.87]], "motorway"],
  ["M5 South Western Motorway", [[151.20,-33.92],[151.14,-33.94],[151.08,-33.96],[151.02,-33.97]], "motorway"],
  ["M8", [[151.20,-33.91],[151.16,-33.94],[151.12,-33.97]], "motorway"],
  ["Eastern Distributor", [[151.21,-33.87],[151.215,-33.90],[151.22,-33.94]], "trunk"],
  ["Parramatta Road", [[151.20,-33.88],[151.15,-33.88],[151.10,-33.88],[151.05,-33.88]], "trunk"],
  ["Victoria Road", [[151.20,-33.86],[151.16,-33.85],[151.12,-33.84],[151.08,-33.83]], "trunk"],
  ["Anzac Parade", [[151.22,-33.89],[151.22,-33.93],[151.22,-33.97]], "trunk"],
  ["Pacific Highway", [[151.21,-33.86],[151.22,-33.82],[151.23,-33.78],[151.24,-33.73]], "trunk"],
  ["Princes Highway", [[151.20,-33.91],[151.16,-33.94],[151.12,-33.98]], "trunk"],
  ["Canterbury Road", [[151.20,-33.91],[151.15,-33.91],[151.10,-33.91],[151.05,-33.92]], "primary"],
  ["Forest Road", [[151.14,-33.95],[151.18,-33.94],[151.22,-33.93],[151.27,-33.92]], "primary"],
  ["Lane Cove Road", [[151.16,-33.80],[151.18,-33.82],[151.20,-33.85],[151.22,-33.88]], "primary"]
];

function bundledSydneyFeatures() {
  const features = CORRIDORS.map(([name, coordinates, highway]) => ({
    type: "Feature", properties: { name, highway },
    geometry: { type: "LineString", coordinates }
  }));
  // Broad suburban street mesh across the Greater Sydney play area.
  const lonStep = 0.012, latStep = 0.010;
  let row = 0;
  for (let lat = REGION.south; lat <= REGION.north; lat += latStep, row++) {
    if (row % 3 !== 1) features.push({ type: "Feature",
      properties: { highway: row % 6 === 0 ? "tertiary" : "residential" },
      geometry: { type: "LineString", coordinates: [[REGION.west,lat],[REGION.east,lat + 0.0015*Math.sin(row)]] } });
  }
  let col = 0;
  for (let lon = REGION.west; lon <= REGION.east; lon += lonStep, col++) {
    if (col % 3 !== 1) features.push({ type: "Feature",
      properties: { highway: col % 6 === 0 ? "tertiary" : "residential" },
      geometry: { type: "LineString", coordinates: [[lon,REGION.south],[lon + 0.001*Math.sin(col),REGION.north]] } });
  }
  // Block footprints spread through the region, with denser development around the CBD.
  for (let lat = REGION.south + 0.004, r = 0; lat < REGION.north; lat += 0.010, r++) {
    for (let lon = REGION.west + 0.004, col = 0; lon < REGION.east; lon += 0.012, col++) {
      const cbd = Math.abs(lon - 151.209) < 0.025 && Math.abs(lat + 33.868) < 0.025;
      const skip = ((r * 17 + col * 13) % 7 === 0) || (Math.sin(r*2.1+col*1.7) > 0.92);
      if (skip && !cbd) continue;
      const w = (cbd ? 0.0024 : 0.0042) * (0.75 + ((r+col)%4)*0.08);
      const h = (cbd ? 0.0018 : 0.0026);
      const ring = [[lon,lat],[lon+w,lat],[lon+w,lat-h],[lon,lat-h],[lon,lat]];
      const levels = cbd ? 8 + ((r*7+col*3)%42) : 1 + ((r*5+col*3)%5);
      features.push({ type: "Feature", properties: { building: "yes", "building:levels": String(levels) },
        geometry: { type: "Polygon", coordinates: [ring] } });
    }
  }
  return { type: "FeatureCollection", features };
}

export async function loadSydneyMap(scene, materials) {
  const data = bundledSydneyFeatures();
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
  return { roads, buildings, attribution: 'Bundled Greater Sydney procedural map' };
}
