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
- Full event editor with page management (add, delete, copy pages)
- Double-click events on the map to open the editor
- Rich command editing with inline parameter editors for 90+ RMXP commands
- Command picker modal with category sidebar and keyboard search
- Keyboard shortcuts: Insert, Delete, Ctrl+C/V/D, Ctrl+Z/Y
- Sprite preview with character sheet rendering

### Database Editor
- Full tabbed interface covering all 13 RMXP data categories:
  - **Actors** — stats, exp curves, equipment, class assignment
  - **Classes** — learnable skills, stat growth curves, element/state rank tables
  - **Skills** — scope, cost, animations, audio, element/state associations
  - **Items** — consumables, equipment, key items with parameter bonuses
  - **Weapons** — stats, elements, states, animations, audio
  - **Armors** — defense stats, guard elements/states, auto-state
  - **Enemies** — stats, loot drops, element/state ranks, treasure tables
  - **Troops** — enemy positioning editor, battle event pages with full command editing
  - **States** — restrictions, ratings, auto-release, animations
  - **Animations** — frame-by-frame cell editor, real-time preview canvas, timing/flash/SE editing
  - **Tilesets** — passage, priority, and terrain tag grid editors with tileset image overlay
  - **Common Events** — trigger types, switch conditions, full event command editing
  - **System** — title/game-over graphics, start position, music/sound config, vocabulary
- Shared controls: asset pickers (graphics + audio with preview/playback), ID selectors, set editors, parameter curve editors

### Script Editor
- Full script list panel with search, reorder, add/delete
- Code editor with syntax highlighting
- Script content editing and saving

### Tileset Support
- Loads RMXP tileset images via Tauri's asset protocol
- 7-slot autotile system with animated autotile rendering
- Tile property editor with tileset graphics as background overlay (memory-efficient single-image approach)

### Project Management
- Native folder picker to open any RMXP project
- Parses `Game.rxproj`, `MapInfos.rxdata`, `Tilesets.rxdata`, and individual map files
- Reads and writes all database `.rxdata` files (Actors, Classes, Skills, Items, Weapons, Armors, Enemies, Troops, States, Animations, CommonEvents, System)
- Hierarchical map tree with parent/child relationships
- Auto-opens the last edited map on project load
- Save modified maps and database entries back to `.rxdata` format

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite
- **Backend:** Rust (Tauri v2)
- **Binary parsing:** Custom Ruby Marshal v4.8 deserializer/serializer (reads and writes `.rxdata` files directly)
- **Rendering:** HTML5 Canvas with requestAnimationFrame loop
- **Theme:** Catppuccin Mocha dark theme

## Architecture

```
src/                            # React frontend
├── components/
│   ├── MapEditor/              # Canvas-based map editor with drawing tools
│   ├── MapTree/                # Hierarchical map list panel
│   ├── TilesetPalette/         # Tileset/autotile selector
│   ├── EventEditor/            # Event page editor, command param editors, command picker
│   ├── ScriptEditor/           # Script list + code editor panels
│   ├── DatabaseEditor/         # Tabbed database editor
│   │   ├── tabs/               # 13 data category tabs (Actors, Classes, Skills, etc.)
│   │   └── controls/           # Shared controls (AssetPicker, TilePropertyEditor, etc.)
│   ├── MapProperties/          # Map settings dialog
│   ├── common/                 # Shared UI primitives
│   └── shared/                 # Cross-component utilities
├── services/
│   ├── tauriApi.ts             # Tauri IPC command wrappers
│   ├── imageLoader.ts          # Asset protocol image loading with caching
│   ├── mapRenderer.ts          # Canvas tile renderer (regular + autotile)
│   ├── mapEditor.ts            # Paint operations and undo/redo
│   ├── eventCommands.ts        # Command catalog, summary formatting, picker categories
│   └── autotileData.ts         # 48-pattern autotile lookup table
└── types/                      # TypeScript type definitions and RMXP constants

src-tauri/                      # Rust backend
├── src/
│   ├── commands/               # Tauri IPC command handlers
│   ├── marshal/                # Ruby Marshal v4.8 binary format parser/serializer
│   └── models/                 # RMXP data structures (Map, Tileset, Event, Table, etc.)
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
- [x] **Phase 4** — Database editors (all 13 RMXP data categories with full editing)
- [x] **Phase 5** — Script editor with syntax highlighting
- [ ] **Phase 6** — PBS file integration and Pokémon Essentials-specific tooling

## License

This project is not affiliated with Enterbrain, Maruno, or the Pokémon Essentials team.
