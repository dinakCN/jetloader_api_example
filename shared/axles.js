// SOLO-like axle markers from the response (no formula port — engine emits positions).
// Group -> layer index: tt=tractor/lorry layer, pp=semitrailer, pr=coupling trailer.
// Axle position is local to its layer, so world = layer.position + axle.position — the
// same mapping as the boxes. VERIFY GROUP_LAYER against the real sample.
const MM_TO_M = 0.001;
const GROUP_LAYER = { tt: 0, pp: 1, pr: 1 };

export function axleMarkers(result) {
  const markers = [];
  const load = (result.loads || [])[0]; // first transport only — matches sceneFromResult
  if (!load) return markers;
  const axes = load.axes;
  if (!axes || axes.flag !== 1 || !axes.data || Array.isArray(axes.data)) return markers;
  const layers = load.layers || [];
  for (const g of ['tt', 'pp', 'pr']) {
    const grp = axes.data[g];
    if (!grp) continue;
    const li = Math.min(GROUP_LAYER[g], layers.length - 1);
    const layer = layers[li];
    if (!layer) continue;
    for (const axle of grp.data || []) {
      if (axle.max === 0) continue; // invisible support (ССУ/дышло) — skip
      markers.push({
        center: {
          x: (layer.position.x + axle.position.x) * MM_TO_M,
          y: (layer.position.y + axle.position.y) * MM_TO_M,
          z: (layer.position.z + axle.position.z) * MM_TO_M,
        },
        sideX: (layer.position.x + layer.scale.x / 2) * MM_TO_M, // leader starts at +X side of the layer
        floorY: (layer.position.y - layer.scale.y / 2) * MM_TO_M, // leader + label sit on the floor
        val: axle.val,
        max: axle.max,
        overload: axle.max > 0 && axle.val > axle.max,
      });
    }
  }
  return markers;
}
