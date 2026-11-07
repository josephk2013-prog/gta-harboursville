import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { createHarboursvilleTextures } from './textures.js';
import { loadSydneyMap } from './sydney-map.js';

const textures = createHarboursvilleTextures();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9bb8c4);
scene.fog = new THREE.Fog(0x9bb8c4, 900, 5200);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.1, 12000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

scene.add(new THREE.HemisphereLight(0xdceeff, 0x66705d, 2.0));
const sun = new THREE.DirectionalLight(0xffe2b5, 3.2);
sun.position.set(-90, 140, 70);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -180; sun.shadow.camera.right = 180;
sun.shadow.camera.top = 180; sun.shadow.camera.bottom = -180;
scene.add(sun);

const mat = (color, roughness=0.85, map=null) => new THREE.MeshStandardMaterial({color, roughness, map});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000,9000), mat(0xffffff,0.95,textures.grass));
ground.rotation.x = -Math.PI/2; ground.position.y = -0.12; ground.receiveShadow = true; scene.add(ground);

const water = new THREE.Mesh(new THREE.PlaneGeometry(6000,1500), new THREE.MeshStandardMaterial({color:0x367f9b, roughness:0.28, metalness:0.12}));
water.rotation.x=-Math.PI/2; water.position.set(0,-0.08,-850); scene.add(water);

const roadMat=mat(0xffffff,0.96,textures.asphalt), lineMat=mat(0xe5d9a5), pavementMat=mat(0xffffff,0.92,textures.concrete);
function box(w,h,d,material,x,y,z,shadow=true){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);m.position.set(x,y,z);m.castShadow=shadow;m.receiveShadow=true;scene.add(m);return m;}
function road(w,d,x,z){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),roadMat);m.rotation.x=-Math.PI/2;m.position.set(x,0.045,z);m.receiveShadow=true;scene.add(m);return m;}

// Real Sydney CBD roads and building footprints from OpenStreetMap.
let sydneyMap;
try {
  sydneyMap = await loadSydneyMap(scene, { road: roadMat });
  console.info(`Loaded Sydney map: ${sydneyMap.roads} roads, ${sydneyMap.buildings} buildings`);
  document.querySelector('.location').textContent = 'SYDNEY CBD · CIRCULAR QUAY';
} catch (error) {
  console.warn(error);
  document.querySelector('#loading').textContent = 'Sydney map service unavailable · refresh to retry';
  // Keep the driving prototype usable until the real OSM extract is generated.
  for (let x=-240;x<=240;x+=80) road(13,520,x,-30);
  for (let z=-240;z<=200;z+=80) road(520,13,0,z);
  for (let x=-220;x<=220;x+=80) for (let z=-220;z<=140;z+=80) {
    const h=18+Math.random()*35;
    box(24,h,24,mat(0x92999a,0.8,textures.facade),x,h/2,z);
  }
}

// Harbourfront promenade and pier.
box(500,0.5,12,mat(0xc4bba7),0,0.1,-205);
for(let x=-130;x<=130;x+=18) box(2,0.5,30,mat(0x8b7962),x,0.15,-235);

// Player vehicle.
const car = new THREE.Group(); scene.add(car); car.position.set(0,0.8,35);
const body= new THREE.Mesh(new THREE.BoxGeometry(2.2,0.65,4.2),mat(0xb72f2b,0.42)); body.position.y=.65; body.castShadow=true; car.add(body);
const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.65,.72,2.0),mat(0x243b45,0.25)); cabin.position.set(0,1.3,-.25); cabin.castShadow=true; car.add(cabin);
const hood=new THREE.Mesh(new THREE.BoxGeometry(2.05,.18,1.1),mat(0xd34b3d)); hood.position.set(0,.99,1.35); car.add(hood);
const wheelGeo=new THREE.CylinderGeometry(.42,.42,.28,16);
const wheels=[];
for(const x of [-1.08,1.08]) for(const z of [-1.35,1.35]){
  const w=new THREE.Mesh(wheelGeo,mat(0x17191a)); w.rotation.z=Math.PI/2; w.position.set(x,.42,z); w.castShadow=true; car.add(w); wheels.push(w);
}
const headlightMat=new THREE.MeshBasicMaterial({color:0xffe7ad});
for(const x of [-.72,.72]){const l=new THREE.Mesh(new THREE.BoxGeometry(.42,.16,.06),headlightMat);l.position.set(x,.72,2.12);car.add(l);}

const keys={}; addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=true;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();});
addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
let speed=0, heading=0;
const speedEl=document.querySelector('#speed');
const cameraOffset=new THREE.Vector3(0,7,-13);
function animate(){
  requestAnimationFrame(animate);
  const forward=keys.w||keys.arrowup, reverse=keys.s||keys.arrowdown;
  const left=keys.a||keys.arrowleft, right=keys.d||keys.arrowright;
  const boost=keys.shift;
  if(forward) speed+=boost?.24:.14;
  else if(reverse) speed-=.17;
  else speed*=.975;
  if(keys[' ']) speed*=.88;
  speed=THREE.MathUtils.clamp(speed,-1.2,boost?2.4:1.65);
  const steer=(left?1:0)-(right?1:0);
  if(Math.abs(speed)>.025) heading+=steer*.035*Math.sign(speed)*Math.min(1,Math.abs(speed));
  car.rotation.y=heading;
  car.position.x+=Math.sin(heading)*speed;
  car.position.z+=Math.cos(heading)*speed;
  wheels.forEach(w=>w.rotation.x-=speed*.12);
  const target=car.position.clone().add(new THREE.Vector3(0,1,0));
  const desired=cameraOffset.clone().applyAxisAngle(new THREE.Vector3(0,1,0),heading).add(car.position);
  camera.position.lerp(desired,.09); camera.lookAt(target);
  speedEl.textContent=String(Math.round(Math.abs(speed)*58)).padStart(3,'0');
  renderer.render(scene,camera);
}
animate();
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
if (sydneyMap) {
  document.querySelector('#loading').classList.add('hidden');
  setTimeout(()=>document.querySelector('#loading')?.remove(),700);
} else {
  document.querySelector('#loading').textContent = 'SYDNEY MAP SERVICE UNAVAILABLE · REFRESH TO RETRY';
}