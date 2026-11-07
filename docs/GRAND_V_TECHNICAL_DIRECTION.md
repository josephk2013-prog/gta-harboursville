# Grand-V technical direction and asset boundaries

Research checked against the public `SebasKitten/Grand-V` repository on 8 November 2026.

## What the public repository contains

The repository describes Grand-V as a Chromium browser launcher for a reverse-engineered RAGE runtime using WebAssembly and WebGPU. The checked-in source tree is primarily the Rust launcher and its support code. It does not provide a reusable city renderer, GTA V world models, or GTA V texture library in the public repository. The repository currently has no declared standard licence, so do not copy its source into this project unless its maintainers provide clear reuse permission.

## What this project can learn from it

- Keep rendering and game simulation separate from the HTML interface.
- Use GPU rendering and physically based material parameters where supported.
- Stream large world chunks and textures instead of loading a whole world at once.
- Move expensive asset preparation and data parsing into workers.
- Keep a fallback renderer for browsers without the required WebGPU features.

These are general engineering ideas, not copied Grand-V implementation code.

## City scale and accuracy

The current scene is a small, fictional placeholder and is **not** a 1:1 Sydney map. A true 1:1 real-world layout needs a defined geographic boundary and source data for roads, building footprints, terrain, coastline, and landmarks. OpenStreetMap can provide a starting point for street and building geometry, subject to its ODbL attribution/share-alike requirements. It does not provide GTA V assets.

Recommended next step: define the playable boundary (for example, Sydney CBD and the harbour), then generate a metre-scale world from properly licensed map data. Add original or CC0 PBR textures and models; do not bundle Rockstar game files or RPF archives.

## Current implementation

- `src/textures.js` generates original procedural asphalt, concrete, façade, and grass textures at runtime.
- `src/main.js` applies those textures to the prototype city.
- The current game still uses Three.js and its WebGL renderer. It is not running the Grand-V RAGE runtime or WebGPU renderer.


## PlayGTA5 runtime and Sydney integration

The owner describes `hammadshakeelai/gta5-web` as an open-source browser edition. Its repository contains the launcher, controller-to-keyboard bridge, asset-streaming helpers and support pages. The README describes the actual game as a compiled WebAssembly snapshot in a separate approximately 21.2 GB release download, not source files in the Git repository.

The controller helper maps a standard gamepad to the engine's shared keyboard/mouse input. It does not expose vehicle physics, vehicle spawning, entity state or a modding API. `ENGINE-LIMITATIONS.md` explicitly says there is no supported interface for reading/writing player entities, vehicles, ownership or mission state.

**Integration decision:** Harboursville now has a direct launch link to the PlayGTA5 runtime in a separate top-level tab. Do not iframe it: its diagnostics say embedded app browsers are unsupported, and its engine requires cross-origin isolation, SharedArrayBuffer, WebGPU and Memory64. This is a launch integration, not a claim that the original Los Santos world has been converted to Sydney.

## Sydney map data pipeline

The previous prototype generated random city blocks. The new map loader reads real WGS84 road centre-lines and building footprints from OpenStreetMap and projects them to metres around Circular Quay. Building heights use OSM `height` / `building:levels` tags when present, with a fallback estimate.

Generate the starter CBD dataset:

```bash
python tools/fetch_sydney_osm.py
```

Then serve the repository over HTTP (not `file://`). The starter extract covers The Rocks, Sydney CBD, Barangaroo, Darling Harbour, Haymarket and the edge of Surry Hills. It is a geographically accurate starter district, **not yet all of Greater Sydney**. Expand the import in regional tiles rather than requesting the entire metro area in one Overpass query.

OpenStreetMap attribution: © OpenStreetMap contributors. Data is available under the Open Database License (ODbL). Preserve attribution and review ODbL obligations when publishing a derived database.

## Route to full-scale Sydney

1. Expand OSM extraction to staged tiles covering the metropolitan footprint.
2. Add terrain/elevation, coastline, parks, rail corridors, bridges, tunnels and ferry terminals.
3. Replace placeholder building materials with original PBR facade/roof assets; add road markings, traffic signals, street furniture and vegetation.
4. Add a vehicle system with suspension, tyre grip, drivetrain, damage and traffic AI. The upstream controller bridge is reusable as a control-mapping reference, but its vehicle simulation is not exposed for reuse.
5. A true PlayGTA5-to-Sydney conversion needs a documented engine mod/map interface or buildable engine source. The current compiled snapshot does not provide that interface.
