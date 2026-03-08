# RMXP Editor

A modern, cross-platform editor for **RPG Maker XP** projects, built specifically with **Pokémon Essentials v21.1** support in mind.

Built with [Tauri v2](https://v2.tauri.app/) + React + TypeScript for a native desktop experience on macOS, Windows, and Linux.

## Features

### Map Editor
- Visual tile-based map editing with a real-time canvas renderer
- Full 3-layer support (matching RMXP's layer system)
- Tileset palette with clickable tile grid and autotile previews
- Drawing tools: Pencil, Rectangle, Flood Fill, Eraser
- Undo/Redo with full history stack
- Zoom and pan navigation
- Grid and event marker overlays
- DPR-aware rendering for Retina/HiDPI displays

### Event System
- Event viewer with markers on the map canvas
- Event editor with full page/command inspection
- Double-click events on the map to open the editor
- Displays all RMXP event commands with human-readable descriptions

### Tileset Support
- Loads RMXP tileset images via Tauri's asset protocol
- 7-slot autotile system with animated autotile rendering
- Tile property viewer (passage, priority, terrain tags)

### Project Management
- Native folder picker to open any RMXP project
- Parses `Game.rxproj`, `MapInfos.rxdata`, `Tilesets.rxdata`, and individual map files
- Hierarchical map tree with parent/child relationships
- Auto-opens the last edited map on project load
- Save modified maps back to `.rxdata` format

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Rust (Tauri v2)
- **Binary parsing:** Custom Ruby Marshal v4.8 deserializer (reads `.rxdata` files directly)
- **Rendering:** HTML5 Canvas with requestAnimationFrame loop

## Architecture

```
src/                        # React frontend
├── components/
│   ├── MapEditor/          # Canvas-based map editor with drawing tools
│   ├── MapTree/            # Hierarchical map list panel
│   ├── TilesetPalette/     # Tileset/autotile selector
│   └── EventEditor/        # Event page and command viewer
├── services/
│   ├── tauriApi.ts         # Tauri IPC command wrappers
│   ├── imageLoader.ts      # Asset protocol image loading with caching
│   ├── mapRenderer.ts      # Canvas tile renderer (regular + autotile)
│   ├── mapEditor.ts        # Paint operations and undo/redo
│   └── autotileData.ts     # 48-pattern autotile lookup table
└── types/                  # TypeScript type definitions and RMXP constants

src-tauri/                  # Rust backend
├── src/
│   ├── commands/           # Tauri IPC command handlers
│   ├── marshal/            # Ruby Marshal v4.8 binary format parser
│   └── models/             # RMXP data structures (Map, Tileset, Event, Table)
└── Cargo.toml
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your platform

### Development

```bash
# Install frontend dependencies
npm install

# Run in development mode (starts both Vite dev server and Tauri)
cargo tauri dev
```

### Build

```bash
# Create a production build
cargo tauri build
```

## Roadmap

- [x] **Phase 1** — Project loading, Ruby Marshal parser, map tree
- [x] **Phase 2** — Map editor with tile rendering, drawing tools, undo/redo
- [x] **Phase 3** — Event system viewer and editor
- [ ] **Phase 4** — PBS file parser and database editors (species, moves, items, etc.)
- [ ] **Phase 5** — Script editor with syntax highlighting and mkxp-z integration

## License

This project is not affiliated with Enterbrain, Maruno, or the Pokémon Essentials team.
