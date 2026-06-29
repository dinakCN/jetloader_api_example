# JetLoader 3D examples

Minimal, dependency-free examples that turn a **`POST /v1/calculate`** response from the
[JetLoader API](https://jload.me) into a 3D loading scene with [Three.js](https://threejs.org).

Each example is a single static page: it loads a bundled API response and renders the
transport as a wireframe box, the cargo as solid boxes, an axle-load readout, and a
summary panel. The goal is to show **the coordinate system and the result→scene mapping**,
not a production UI — there is no drag, hover, selection or animation.

| Example | Model | Shows |
|---|---|---|
| `01-lorry/` | Mercedes Atego van (`view=2`) | single layer, cargo, axle loads (`tt`) |
| `02-truck/` | Tractor + semitrailer (`view=1`) | single cargo body (13.6 m), axle groups `tt` (tractor) + `pp` (semitrailer) |
| `03-coupling/` | Central-axle coupling (`view=4`) | **two layers** (lorry + trailer), axle loads (`tt`+`pr`), an overload (red) |
| `04-container/` | 20DC container (`view=10`) | single layer, no axles |

Cargo is coloured **per route point** (`history.color`), the way the production scene does
it — each delivery point gets its own colour.

## Run

These are ES modules that `fetch()` local JSON, so they need an HTTP server — `file://`
will not work. Serve **from the repository root** (paths are relative to it):

```bash
npx serve .
# or:  python3 -m http.server 8080
```

Then open `http://localhost:<port>/01-lorry/` (and `02-truck/`, `03-coupling/`, `04-container/`).
Orbit with the mouse. Three.js is loaded from a CDN via an import map (no build step).

## The result → scene mapping

All the logic lives in `shared/sceneFromResult.js` (pure, no Three.js). Read it first.

### 1. Unwrap the envelope

The API wraps the result in an envelope. The scene is built from `data.result`:

```js
const result = response.data.result;   // may be null on failure — check it
```

### 2. Coordinate system

- Right-handed, **Y up** (the `AxesHelper` shows it: **red = X = width, green = Y = height,
  blue = Z = length**).
- All response coordinates and sizes are in **millimetres**; the examples convert to metres
  (`× 0.001`).

### 3. Cargo boxes

Each placed item (`loads[].layers[].groups[].data[]`) becomes a box:

```js
size   = mesh.scale                         // {x: width, y: height, z: length} (mm)
center = layer.position + mesh.position      // mesh.position is the centre, local to the layer
```

> **Do not apply `mesh.euler`.** It is metadata recording the rotation the engine applied
> relative to the original orientation; `mesh.scale` is already the rotated, axis-aligned
> size. Building a box from `scale` **and** rotating by `euler` double-rotates it. Render
> from `scale` + `position` with identity rotation (this is what the production app does).

### 4. Layers and the floor

`layer.position` in the response **echoes the position you sent** in the request
(`area.sizes[i].position`). The offset between layers — e.g. a trailer behind a lorry — is
therefore your input, and the code uses `layer.position` directly (see `worldCenter`). The
coupling example sends the trailer at `position.z = -10100` and gets it back unchanged.

Each layer box is centred on Y, so its floor is at `−height/2`; the viewer lifts the whole
group so the floor rests on the grid (`y = 0`).

### 5. Axle markers

For auto models the response carries computed axle loads at
`loads[].axes.data.{tt,pp,pr}.data[i]` — each with `position`, `min` (empty), `max`
(allowed) and `val` (loaded). The examples draw a leader + label per axle and colour it
**red when `val > max`** (overload). No formula is ported — the engine emits the positions.

> Note: `axes.data[group]` is the **rich** form `{ history, data: [...] }` — `history`
> echoes the input axle params, `data[]` holds the computed axles. It is **not** the flat
> input shape (`n1`, `n1max`, …).

### 6. Summary

Payload weight is the **sum of placed `mesh.weight`** — not `layer.weight`, which echoes the
transport's gross-weight rating (`wg`), not the cargo.

## Use your own data

The bundled responses were captured from `POST /v1/calculate`. To render your own, call the
API from your server (an API key authorizes the request — keep it server-side) and save the
response next to the example:

```bash
curl -X POST https://api.jload.me/v1/calculate \
  -H "Authorization: Bearer jl_<your_key>" \
  -H "Content-Type: application/json" \
  --data @samples/lorry/request.json \
  > samples/lorry/response.json
```

Then reload the page. Calling the API directly from the browser is blocked by CORS for
arbitrary origins, which is why these examples ship a captured response and call from the
server side.

## Troubleshooting

- **Blank page / module errors** — you opened it via `file://`; use a server (see *Run*).
- **404 for `../shared/...` or `../samples/...`** — serve from the repo **root**, not the
  example folder.
- **Mirrored or shifted layout** — check the axis mapping (`x/y/z`) and the mm→m conversion;
  do not flip a sign to "fix" a mirror — find the real cause.
- **Import map does not resolve** — both `three` and `three/addons/` must be pinned to the
  same version (`0.183.2`) from one CDN.
- **Edits not showing during local dev** — the browser caches ES modules; hard-reload.

## License

MIT — see [LICENSE](LICENSE).
