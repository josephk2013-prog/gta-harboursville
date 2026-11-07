# GTA: Harboursville

An original, browser-based open-world driving game inspired by the scale and freedom of open-world crime games, set in a fictionalised Sydney, Australia.

## Status

Early prototype / foundation. This project does **not** include Rockstar Games' GTA V assets or proprietary game data, and it is not an official GTA product.

## Development direction

- Build an original browser-playable 3D city and driving sandbox.
- Use open-source libraries and original or properly licensed assets.
- Investigate Grand-V / PlayGTA5 as technical references only; their runtime requirements and game-data licensing must be respected.
- Keep the game modular so the city, vehicles, missions, and UI can grow independently.

## Running locally

A browser prototype can be served from this folder with any simple static HTTP server. See the project files for the current entry point.

## Controls

Controls will be documented here as gameplay is added.


## Real Sydney map and PlayGTA5 runtime

The driving prototype now loads real Sydney CBD roads and building footprints from OpenStreetMap. Generate the local map extract with:

```bash
python tools/fetch_sydney_osm.py
```

Serve the project over HTTP and open `index.html`. The starter extract covers Circular Quay, The Rocks, the CBD, Barangaroo, Darling Harbour and Haymarket; it is not yet all of Greater Sydney. Map data attribution: © OpenStreetMap contributors (ODbL).

The HUD includes a separate-tab launch for the upstream PlayGTA5 WebAssembly/WebGPU runtime. That runtime is kept top-level because it requires cross-origin isolation and shared WebAssembly memory. Its current public snapshot does not expose a supported vehicle-physics/entity API, so Harboursville's own vehicle controller remains separate for now. See [the integration notes](docs/GRAND_V_TECHNICAL_DIRECTION.md).
