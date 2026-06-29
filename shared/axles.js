// SOLO-like axle markers from the response (no formula port — engine emits positions).
// Group -> layer index: tt=tractor/lorry layer, pp=semitrailer, pr=coupling trailer.
// Axle z uses the SAME layer Z offset as the boxes (layerOffsetsZ), so markers stay
// aligned with their layer. VERIFY GROUP_LAYER against the real sample (spec §4.3).
import { layerOffsetsZ } from './sceneFromResult.js';
const MM_TO_M = 0.001;
const GROUP_LAYER = { tt: 0, pp: 1, pr: 1 };

export function axleMarkers(result) {
  const markers = [];
  for (const load of result.loads || []) {
    const axes = load.axes;
    if (!axes || axes.flag !== 1 || !axes.data || Array.isArray(axes.data)) continue;
    const layers = load.layers || [];
    const offsets = layerOffsetsZ(load);
    for (const g of ['tt', 'pp', 'pr']) {
      const grp = axes.data[g];
      if (!grp) continue;
      const li = Math.min(GROUP_LAYER[g], layers.length - 1);
      const layer = layers[li];
      if (!layer) continue;
      const lz = offsets[li] || 0;
      for (const axle of grp.data || []) {
        if (axle.max === 0) continue; // invisible support (ССУ/дышло) — skip
        markers.push({
          center: {
            x: (layer.position.x + axle.position.x) * MM_TO_M,
            y: (layer.position.y + axle.position.y) * MM_TO_M,
            z: (layer.position.z + lz + axle.position.z) * MM_TO_M,
          },
          sideX: (layer.position.x + layer.scale.x / 2) * MM_TO_M, // leader starts at +X side of the layer
          val: axle.val,
          max: axle.max,
          overload: axle.max > 0 && axle.val > axle.max,
        });
      }
    }
  }
  return markers;
}
