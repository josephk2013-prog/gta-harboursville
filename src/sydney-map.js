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

// Bundled starter map: fixed Sydney CBD street corridors and building blocks.
// Coordinates are WGS84; no map service or network request is needed at runtime.
const SYDNEY_ROADS = [
  ["George Street", [[151.2061,-33.8730],[151.2064,-33.8690],[151.2067,-33.8650],[151.2070,-33.8610],[151.2073,-33.8585]], "primary"],
  ["Pitt Street", [[151.2090,-33.8730],[151.2093,-33.8690],[151.2096,-33.8650],[151.2099,-33.8610],[151.2102,-33.8585]], "primary"],
  ["Castlereagh Street", [[151.2080,-33.8730],[151.2083,-33.8690],[151.2086,-33.8650],[151.2089,-33.8610],[151.2092,-33.8585]], "secondary"],
  ["Elizabeth Street", [[151.2100,-33.8730],[151.2103,-33.8690],[151.2106,-33.8650],[151.2109,-33.8610],[151.2112,-33.8585]], "secondary"],
  ["Macquarie Street", [[151.2125,-33.8730],[151.2128,-33.8690],[151.2131,-33.8650],[151.2134,-33.8610],[151.2137,-33.8585]], "secondary"],
  ["York Street", [[151.2040,-33.8700],[151.2043,-33.8660],[151.2046,-33.8620]], "secondary"],
  ["Clarence Street", [[151.2030,-33.8700],[151.2033,-33.8660],[151.2036,-33.8620]], "secondary"],
  ["Kent Street", [[151.2020,-33.8700],[151.2023,-33.8660],[151.2026,-33.8620]], "secondary"],
  ["Bridge Street", [[151.2020,-33.8620],[151.2050,-33.8620],[151.2080,-33.8620],[151.2110,-33.8620],[151.2140,-33.8620]], "secondary"],
  ["Hunter Street", [[151.2020,-33.8660],[151.2050,-33.8660],[151.2080,-33.8660],[151.2110,-33.8660],[151.2140,-33.8660]], "secondary"],
  ["King Street", [[151.2020,-33.8680],[151.2050,-33.8680],[151.2080,-33.8680],[151.2110,-33.8680],[151.2140,-33.8680]], "secondary"],
  ["Market Street", [[151.2020,-33.8700],[151.2050,-33.8700],[151.2080,-33.8700],[151.2110,-33.8700],[151.2140,-33.8700]], "secondary"],
  ["Park Street", [[151.2020,-33.8720],[151.2050,-33.8720],[151.2080,-33.8720],[151.2110,-33.8720],[151.2140,-33.8720]], "secondary"],
  ["Liverpool Street", [[151.2020,-33.8740],[151.2050,-33.8740],[151.2080,-33.8740],[151.2110,-33.8740],[151.2140,-33.8740]], "secondary"],
  ["Bathurst Street", [[151.2020,-33.8760],[151.2050,-33.8760],[151.2080,-33.8760],[151.2110,-33.8760],[151.2140,-33.8760]], "secondary"],
  ["Goulburn Street", [[151.2020,-33.8780],[151.2050,-33.8780],[151.2080,-33.8780],[151.2110,-33.8780],[151.2140,-33.8780]], "secondary"],
  ["Campbell Street", [[151.2020,-33.8800],[151.2050,-33.8800],[151.2080,-33.8800],[151.2110,-33.8800],[151.2140,-33.8800]], "secondary"]
];

function bundledSydneyFeatures() {
  const features = SYDNEY_ROADS.map(([name, coordinates, highway]) => ({
    type: "Feature", properties: { name, highway },
    geometry: { type: "LineString", coordinates }
  }));
  // Fixed CBD block footprints between the bundled street corridors.
  const xs = [151.2028,151.2040,151.2055,151.2072,151.2084,151.2100,151.2116,151.2130];
  const ys = [-33.8600,-33.8630,-33.8670,-33.8690,-33.8710,-33.8730,-33.8750,-33.8770,-33.8790];
  let index = 0;
  for (let row = 0; row < ys.length - 1; row++) {
    for (let col = 0; col < xs.length - 1; col++) {
      const west = xs[col], east = xs[col + 1], north = ys[row], south = ys[row + 1];
      const insetX = 0.00012, insetY = 0.00012;
      const ring = [[west+insetX,north-insetY],[east-insetX,north-insetY],
        [east-insetX,south+insetY],[west+insetX,south+insetY],[west+insetX,north-insetY]];
      const levels = 4 + ((row * 7 + col * 3) % 28);
      features.push({ type: "Feature", properties: { building: "yes", "building:levels": String(levels) },
        geometry: { type: "Polygon", coordinates: [ring] } });
      index++;
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
  return { roads, buildings, attribution: 'Bundled Sydney CBD starter layout' };
}
