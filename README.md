# RMXP Editor

A modern, cross-platform desktop editor for **RPG Maker XP** projects. Built with [Tauri v2](https://v2.tauri.app/) + React + TypeScript, targeting **Pokémon Essentials v21.1** workflows while remaining compatible with any RMXP project.

![Main Interface](screenshot_main.png)

---

## Overview

The official RPG Maker XP editor is a 32-bit Windows application from 2004 that cannot run natively on modern macOS or Linux. This editor reimplements it from scratch as a native desktop app, reading and writing the original `.rxdata` binary format directly — no Ruby runtime or game engine required.

**Key design goals:**

- Full read/write fidelity with the original `.rxdata` binary format (Ruby Marshal v4.8)
- Native cross-platform binary (macOS, Windows, Linux)
- Feature parity with all 13 database tabs and the map/event/script editors
- Pokémon Essentials v21.1 compatibility (extended terrain tags, PBS integration roadmap)

---

## Features

### Map Editor

![Map Editor](screenshot_main.png)

- Three independent tile layers (L1 / L2 / L3) plus an Events overlay layer
- 7-slot autotile system with animated rendering (frame cycling at 250 ms intervals)
- Drawing tools: **Pencil**, **Rectangle**, **Flood Fill**, **Eraser**
- Zoom (Ctrl+scroll / pinch) from 25% to 400%; pan with middle-click drag or scroll
- Undo/Redo stack with full per-operation history (`Ctrl+Z` / `Ctrl+Y`)
- DPR-aware canvas renderer — crisp on Retina/HiDPI displays
- Grid and event marker overlays (toggleable)
- **Starting position marker** — green ⌂ icon shows the game's player start tile on the relevant map
- **Right-click context menu** on any tile:
  - Set as Starting Point (saves immediately to `System.rxdata`)
  - Open Event / Copy Event / Delete Event (when an event is present)
  - Paste Event (when an event is on the clipboard and the tile is empty)

### Event Editor

![Event Editor](screenshot_event_editor.png)

- Event list rendered as character sprites or named markers directly on the canvas
- Double-click any event on the map to open the editor
- Full multi-page event editor: add, delete, and copy pages
- Page conditions: switch, variable, self-switch
- Trigger types, move speed/frequency, walk/step animation, direction fix, through, always-on-top
- **Character picker** with sprite sheet preview
- **Move Route Editor** — inline movement sequence builder
- **Command editor** with inline parameter editing for the vast majority of RMXP commands:
  - Message / choice / input / scroll text
  - Switch / variable / self-switch / timer control
  - Conditional branches, loops, labels, jumps
  - Event management (transfer player, set event location, etc.)
  - Screen effects: tone, flash, shake, fade, weather
  - Audio commands: BGM, BGS, ME, SE
  - Battle, shop, name input calls
  - Script call
- Command picker modal with category sidebar and live keyboard search
- Clipboard for event commands: `Ctrl+C` / `Ctrl+V` / `Ctrl+D` (duplicate)
- Undo/Redo within the event editor
- OK / Cancel flow with unsaved-changes guard (native dialog)

![Event Commands](screenshot_event_editor_2.png)

### Database Editor

![Database Editor](screenshot_database_editor.png)

All 13 RMXP data categories, fully editable:

| Tab | Highlights |
|-----|-----------|
| **Actors** | Stats, EXP curves, starting equipment, class assignment |
| **Classes** | Skill learn table, stat growth curves, element/state rank tables |
| **Skills** | Scope, MP cost, animations, audio, element/state flags |
| **Items** | Consumables, equipment, key items, parameter bonuses |
| **Weapons** | ATK/DEF stats, elements, states, animation, audio |
| **Armors** | PDEF/MDEF, guard elements/states, auto-state |
| **Enemies** | Stats, loot, element/state ranks, action patterns |
| **Troops** | Enemy group positioning, battle event pages with full command editing |
| **States** | Restrictions, ratings, auto-release conditions, overlay animations |
| **Animations** | Frame-by-frame cell editor, real-time preview canvas, timing/flash/SE |
| **Tilesets** | Passage, 4-direction passage, priority (0–5), bush/counter flags, terrain tags (0–17) with autotile graphic previews |
| **Common Events** | Trigger type, switch condition, full event command list |
| **System** | Title/game-over graphics, map selector for start position, music/sound config, vocabulary |

Shared controls across tabs: graphic/audio asset pickers with preview and playback, ID selectors, set editors, parameter curve editors.

![Tileset Editor](screenshot_database_editor_2.png)

### Script Editor

![Script Editor](screenshot_script_editor.png)

- Script list panel with create, rename, delete, and drag-to-reorder
- Double-click a name or press `F2` to rename inline
- CodeMirror 6 editor with **Ruby syntax highlighting** (Catppuccin Latte theme)
- Bracket matching, auto-close brackets, fold gutter, tab indentation
- Per-script unsaved-changes indicators (yellow dot)
- **Global search** (`Ctrl+Shift+F`) — searches across all scripts simultaneously, shows results grouped by script with line numbers and highlighted matches; click any result to jump directly to it
- `Ctrl+S` saves all dirty scripts at once

---

## Keyboard Shortcuts

| Shortcut | Context | Action |
|----------|---------|--------|
| `Ctrl+S` | Global | Save all dirty editors |
| `Ctrl+O` | Global | Open project folder |
| `Ctrl+Z` | Map / Event Editor | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Map / Event Editor | Redo |
| `Ctrl+Shift+F` | Script Editor | Global search across all scripts |
| `Double-click` | Map canvas | Open event editor (on event tile) / create event (on Events layer) |
| `Right-click` | Map canvas | Tile context menu |
| `Middle-click drag` | Map canvas | Pan viewport |
| `Ctrl+scroll` / Pinch | Map canvas | Zoom |
| `Insert` | Event command list | Insert new command |
| `Delete` | Event command list | Delete selected command |
| `Ctrl+C/V/D` | Event command list | Copy / Paste / Duplicate command |
| `Escape` | Event Editor | Cancel (with unsaved-changes guard) |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript, Vite |
| Desktop shell | Tauri v2 (Rust) |
| Binary format | Custom Ruby Marshal v4.8 parser/serializer |
| Map rendering | HTML5 Canvas 2D, `requestAnimationFrame` loop |
| Code editor | CodeMirror 6 |
| Audio playback | rodio (Rust) |
| Theme | Catppuccin Latte |

### Binary Format

All game data is stored in `.rxdata` files — Ruby's binary Marshal format (version 4.8). This editor ships a **pure Rust** Marshal reader and writer that handles all RMXP object types: `RPG::Map`, `RPG::Event`, `RPG::Tileset`, `RPG::System`, `RPG::Actor`, `Table`, `Color`, `Tone`, `RPG::AudioFile`, and so on. No Ruby runtime is involved at any point.

Scripts are stored compressed with zlib inside `Scripts.rxdata`; the editor decompresses and recompresses them transparently.

---

## Architecture

```
src/                              # React + TypeScript frontend
├── App.tsx                       # Root shell, project state, unified save context
├── context/
│   └── ProjectSaveContext.tsx    # Global dirty/save coordination across all editors
├── components/
│   ├── MapEditor/                # Canvas-based tile editor with drawing tools
│   ├── MapTree/                  # Hierarchical map list with context menu
│   ├── TilesetPalette/           # Tileset / autotile selector
│   ├── EventEditor/              # Event page editor, command picker, move route editor
│   ├── ScriptEditor/             # Script list, CodeMirror panel, global search
│   ├── DatabaseEditor/
│   │   ├── tabs/                 # 13 data-category tabs
│   │   └── controls/             # Shared controls (AssetPicker, TilePropertyEditor, …)
│   └── MapProperties/            # Map settings dialog
├── services/
│   ├── tauriApi.ts               # Tauri IPC wrappers (typed)
│   ├── imageLoader.ts            # Asset-protocol image loading with cache
│   ├── mapRenderer.ts            # Canvas tile renderer (tiles + autotiles + markers)
│   ├── mapEditor.ts              # Paint operations, flood fill, undo/redo stack
│   ├── eventCommands.ts          # Command catalog, summary text, picker categories
│   └── autotileData.ts           # 48-pattern autotile rect lookup table
└── types/                        # TypeScript types and RMXP constants

src-tauri/                        # Rust backend
├── src/
│   ├── commands/                 # Tauri IPC handlers (project, map, database, scripts, audio)
│   ├── marshal/                  # Ruby Marshal v4.8 reader + writer
│   ├── models/                   # RMXP data models (Map, Tileset, Event, System, Table, …)
│   ├── state/                    # App-level shared state
│   └── pbs/                      # PBS file utilities (roadmap)
└── Cargo.toml
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri v2 system dependencies](https://v2.tauri.app/start/prerequisites/) for your OS

### Development

```bash
npm install
npm run tauri dev
```

### Production Build

```bash
npm run tauri build
```

The output installer/binary will be in `src-tauri/target/release/bundle/`.

---

## Roadmap

- [x] Ruby Marshal v4.8 parser/serializer (read + write)
- [x] Project loading — `Game.rxproj`, `MapInfos.rxdata`, map tree
- [x] Map editor — tile layers, autotiles, drawing tools, undo/redo, zoom/pan
- [x] Event system — viewer, editor, full command set, move routes
- [x] Database editor — all 13 tabs with full editing support
- [x] Script editor — CodeMirror 6, Ruby highlighting, global search
- [x] Unified save flow — global dirty tracking, OK/Cancel/Apply pattern
- [x] Starting position — map marker + context-menu setter
- [x] Event clipboard — copy/paste events across tiles via right-click menu
- [ ] PBS file integration (species, moves, items, trainer data for Pokémon Essentials)
- [ ] Playtest launcher

---

## License

MIT.  
Not affiliated with Enterbrain, Maruno, or the Pokémon Essentials team.
