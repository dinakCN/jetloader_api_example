import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const OVERLOAD = 0xe15759;

/** Build and run the scene. scene3d = { transports[], boxes[], axles?[] } (metres). */
export function mountViewer(canvas, scene3d) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf0f0f0);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 10000);

  scene.add(new THREE.AmbientLight(0xffffff, 1.0));
  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 2.5);
  dir.position.set(5, 10, 7);
  scene.add(dir);

  const group = new THREE.Group();
  scene.add(group);

  for (const t of scene3d.transports || []) {
    const geo = new THREE.BoxGeometry(t.size.x, t.size.y, t.size.z);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x333333 }));
    edges.position.set(t.center.x, t.center.y, t.center.z);
    group.add(edges);
    geo.dispose();
  }
  for (const b of scene3d.boxes || []) {
    const geo = new THREE.BoxGeometry(b.size.x, b.size.y, b.size.z);
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(b.color), metalness: 0, roughness: 1, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(b.center.x, b.center.y, b.center.z);
    group.add(mesh);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x222222, transparent: true, opacity: 0.25 }));
    edge.position.copy(mesh.position);
    group.add(edge);
  }
  for (const m of scene3d.axles || []) addAxleMarker(group, m);

  scene.add(new THREE.GridHelper(30, 30, 0x999999, 0xcccccc));
  scene.add(new THREE.AxesHelper(2)); // X=red=width, Y=green=height, Z=blue=length

  const controls = new OrbitControls(camera, renderer.domElement);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h || 1;
    fitCameraToScene(camera, controls, group);
  }
  window.addEventListener('resize', resize);
  resize();
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

  return { dispose() { window.removeEventListener('resize', resize); renderer.setAnimationLoop(null); renderer.dispose(); } };
}

function addAxleMarker(group, m) {
  const color = m.overload ? OVERLOAD : 0x333333;
  const start = new THREE.Vector3(m.sideX, m.center.y, m.center.z);
  const end = new THREE.Vector3(m.sideX + 0.8, m.center.y, m.center.z);
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), new THREE.LineBasicMaterial({ color })));
  const label = makeLabelSprite(formatTons(m.val), m.overload ? '#e15759' : '#222222');
  label.position.copy(end).add(new THREE.Vector3(0.6, 0, 0));
  group.add(label);
}

function formatTons(kg) { return (kg / 1000).toFixed(2) + ' t'; }

function makeLabelSprite(text, color) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 64;
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = color; ctx.font = 'bold 36px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 32);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
  sprite.scale.set(1.2, 0.3, 1);
  return sprite;
}

/** Frame the whole object3D; rotation-safe bbox via setFromObject; tan-based distance. */
export function fitCameraToScene(camera, controls, object3D) {
  object3D.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(object3D);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const halfFovY = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const fitH = (size.y * 0.5) / Math.tan(halfFovY);
  const fitW = (size.x * 0.5) / Math.tan(halfFovY) / camera.aspect;
  const distance = 1.3 * Math.max(fitH, fitW) + size.z * 0.5;
  camera.near = Math.max(0.01, distance / 100);
  camera.far = distance * 100;
  camera.position.set(center.x + distance * 0.6, center.y + distance * 0.5, center.z + distance * 0.6);
  camera.lookAt(center);
  camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}
