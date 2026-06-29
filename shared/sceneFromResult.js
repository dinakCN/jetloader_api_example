// Pure mapping — no Three.js. Output units: meters. euler is NOT applied (it is
// engine metadata; scale is already the post-rotation axis-aligned size).
const MM_TO_M = 0.001;
const PALETTE = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7'];

/** Unwrap the API envelope: response.data.result (throws if absent — no silent fallback). */
export function extractResult(response) {
  const result = response && response.data && response.data.result;
  if (!result) throw new Error('No result in API response (data.result is null/undefined)');
  return result;
}

/**
 * Per-layer Z offset (mm). The /v1 response carries no inter-layer offset
 * (layer.position is {0,0,0}); it is user data with this sequential default:
 * each layer centred at the cumulative length of preceding layers, the whole
 * assembly centred at origin. Single layer -> 0.
 */
export function layerOffsetsZ(load) {
  const lens = (load.layers || []).map((l) => l.scale.z);
  const total = lens.reduce((a, b) => a + b, 0);
  const offsets = [];
  let cursor = 0;
  for (const len of lens) { offsets.push(cursor + len / 2 - total / 2); cursor += len; }
  return offsets;
}

/** World centre of a placed item, in metres. layerZ = layerOffsetsZ()[layerIndex]. */
export function worldCenter(layer, mesh, layerZ) {
  return {
    x: (layer.position.x + mesh.position.x) * MM_TO_M,
    y: (layer.position.y + mesh.position.y) * MM_TO_M,
    z: (layer.position.z + layerZ + mesh.position.z) * MM_TO_M,
  };
}

/** Colour per route point (mirrors production); falls back to a fixed palette. */
export function colorForBox(mesh) {
  const c = mesh.history && mesh.history.color;
  if (typeof c === 'string' && c) return c;
  const point = Number.isFinite(mesh.history && mesh.history.point) ? mesh.history.point : 0;
  return PALETTE[point % PALETTE.length];
}

/** Map a calc result to framework-agnostic primitives (metres, no rotation). */
export function sceneFromResult(result) {
  const transports = [];
  const boxes = [];
  for (const load of result.loads || []) {
    const offsets = layerOffsetsZ(load);
    (load.layers || []).forEach((layer, li) => {
      const lz = offsets[li];
      transports.push({
        center: { x: layer.position.x * MM_TO_M, y: layer.position.y * MM_TO_M, z: (layer.position.z + lz) * MM_TO_M },
        size: { x: layer.scale.x * MM_TO_M, y: layer.scale.y * MM_TO_M, z: layer.scale.z * MM_TO_M },
      });
      for (const group of layer.groups || []) {
        for (const mesh of group.data || []) {
          boxes.push({
            center: worldCenter(layer, mesh, lz),
            size: { x: mesh.scale.x * MM_TO_M, y: mesh.scale.y * MM_TO_M, z: mesh.scale.z * MM_TO_M },
            color: colorForBox(mesh),
          });
        }
      }
    });
  }
  return { transports, boxes };
}
