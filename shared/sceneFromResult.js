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
 * World centre of a placed item, in metres: (layer.position + mesh.position) / 1000.
 * The inter-layer offset (e.g. a trailer behind a lorry) lives in `layer.position` —
 * it comes from the layer position you send in the request (`area.sizes[i].position`).
 */
export function worldCenter(layer, mesh) {
  return {
    x: (layer.position.x + mesh.position.x) * MM_TO_M,
    y: (layer.position.y + mesh.position.y) * MM_TO_M,
    z: (layer.position.z + mesh.position.z) * MM_TO_M,
  };
}

/** Colour per route point (mirrors production); falls back to a fixed palette. */
export function colorForBox(mesh) {
  const c = mesh.history && mesh.history.color;
  if (typeof c === 'string' && c) return c;
  const point = Number.isFinite(mesh.history && mesh.history.point) ? mesh.history.point : 0;
  return PALETTE[point % PALETTE.length];
}

/**
 * Map a calc result to framework-agnostic primitives (metres, no rotation).
 * Renders the FIRST transport only (loads[0]); when the cargo spills into more
 * than one vehicle the others are summarised by count, not drawn (see summarize()).
 */
export function sceneFromResult(result) {
  const transports = [];
  const boxes = [];
  const load = (result.loads || [])[0];
  if (!load) return { transports, boxes };
  for (const layer of load.layers || []) {
    transports.push({
      center: { x: layer.position.x * MM_TO_M, y: layer.position.y * MM_TO_M, z: layer.position.z * MM_TO_M },
      size: { x: layer.scale.x * MM_TO_M, y: layer.scale.y * MM_TO_M, z: layer.scale.z * MM_TO_M },
    });
    for (const group of layer.groups || []) {
      for (const mesh of group.data || []) {
        boxes.push({
          center: worldCenter(layer, mesh),
          size: { x: mesh.scale.x * MM_TO_M, y: mesh.scale.y * MM_TO_M, z: mesh.scale.z * MM_TO_M },
          color: colorForBox(mesh),
        });
      }
    }
  }
  return { transports, boxes };
}
