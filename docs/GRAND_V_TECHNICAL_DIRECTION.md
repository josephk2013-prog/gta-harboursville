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
