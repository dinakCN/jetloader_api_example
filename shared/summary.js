// Pure summary data — no Three.js. Dimensions/weight in source units (mm/kg); panel formats.
// We render only the first transport (loads[0]); loadsCount reports the total so the
// panel can note when cargo spilled into more vehicles than we draw.
export function summarize(result) {
  const loads = result.loads || [];
  return { loadsCount: loads.length, load: loads[0] ? summarizeLoad(loads[0]) : null };
}

function summarizeLoad(load) {
  let places = 0, weight = 0, boxVol = 0, layerVol = 0;
  const dims = [];
  for (const layer of load.layers || []) {
    // NB: layer.weight echoes the transport's wg (gross rating), NOT cargo weight —
    // payload is the sum of placed mesh weights.
    layerVol += layer.scale.x * layer.scale.y * layer.scale.z;
    dims.push({ x: layer.scale.x, y: layer.scale.y, z: layer.scale.z });
    for (const g of layer.groups || []) {
      for (const m of g.data || []) { places++; boxVol += m.scale.x * m.scale.y * m.scale.z; weight += m.weight || 0; }
    }
  }
  return {
    name: load.name, view: load.view,
    dims, layersCount: (load.layers || []).length,
    places, weight: Math.round(weight),
    fillPct: layerVol > 0 ? Math.round((boxVol / layerVol) * 100) : 0,
    axes: summarizeAxes(load.axes),
  };
}

/** Axle loads per group (rich response form). Returns null when no axes. */
function summarizeAxes(axes) {
  if (!axes || axes.flag !== 1 || !axes.data || Array.isArray(axes.data)) return null;
  const out = {};
  for (const g of ['tt', 'pp', 'pr']) {
    const grp = axes.data[g];
    if (!grp) continue;
    out[g] = (grp.data || []).map((a) => ({ min: a.min, max: a.max, val: a.val, overload: a.max > 0 && a.val > a.max }));
  }
  return Object.keys(out).length ? out : null;
}
