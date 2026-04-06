/**
 * World panel (Map Metadata)
 * - Left: list of maps
 * - Right: Properties tab + Region Map Pin tab (draggable canvas overlay)
 */
import { useCallback, useState, useRef, useEffect } from "react";
import { useEntityEditor } from "../../../hooks/useEntityEditor";
import { loadMapMeta } from "../../../services/pbsUnified";
import { saveMapMeta } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import type { MapMetaEntry } from "../../../types/pbsEntityTypes";
import { EntityListPanel } from "../shared/EntityListPanel";
import { ChipListEditor } from "../shared/ChipListEditor";
import { readRawPbsFile, writeRawPbsFile } from "../../../services/tauriApi";

const ENVIRONMENTS = ["None", "Grass", "TallGrass", "Rock", "Cave", "Sand", "Underwater", "Snow", "Ice", "Volcano", "Sky"] as const;
const MAP_FLAG_OPTIONS = ["DisableBoxLink", "HideEncountersInPokedex", "MossRock", "IcedRock", "Magnetized", "HiveQueen", "NoTeleport", "NoSurf"] as const;

const getId = (m: MapMetaEntry) => String(m.mapId);

function buildAssetUrl(p: string) {
  return `asset://localhost/${encodeURIComponent(p)}`;
}

// ── Region Map Pin Editor (canvas overlay) ────────────────────────────────────

function RegionPinCanvas({
  projectPath,
  entries,
  selectedMapId,
  regionIndex = 0,
  onUpdatePin,
}: {
  projectPath: string;
  entries: MapMetaEntry[];
  selectedMapId?: number;
  regionIndex?: number;
  onUpdatePin: (mapId: number, pos: [number, number]) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [dragging, setDragging] = useState<number | null>(null);
  const [imgDims, setImgDims] = useState<[number, number]>([480, 320]);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // PE v21 uses mapRegion0.png, mapRegion1.png, etc. inside Town Map folder
  const townMapPath = buildAssetUrl(`${projectPath}/Graphics/UI/Town Map/mapRegion${regionIndex}.png`);

  useEffect(() => {
    setImgLoaded(false);
    const img = new Image();
    img.src = townMapPath;
    img.onload = () => {
      imgRef.current = img;
      setImgDims([img.naturalWidth || 480, img.naturalHeight || 320]);
      setImgLoaded(true);
    };
    img.onerror = () => { imgRef.current = null; setImgLoaded(false); };
  }, [townMapPath]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const [w, h] = imgDims;
    ctx.clearRect(0, 0, w, h);
    if (imgRef.current && imgLoaded) ctx.drawImage(imgRef.current, 0, 0, w, h);
    else { ctx.fillStyle = "#2d2d3f"; ctx.fillRect(0, 0, w, h); }

    for (const entry of entries) {
      if (!entry.mapPosition) continue;
      const [x, y] = entry.mapPosition;
      const isSelected = entry.mapId === selectedMapId;
      ctx.beginPath();
      ctx.arc(x, y, isSelected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? "#1e66f5" : "#fe640b";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = isSelected ? 2 : 1.5;
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.font = `${isSelected ? "bold " : ""}9px sans-serif`;
      ctx.fillText(String(entry.mapId), x + 7, y + 4);
    }
  }, [entries, imgLoaded, imgDims, selectedMapId]);

  // Convert mouse event position to image-space coordinates
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    // Scale from CSS display size back to canvas logical size (image coords)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return [Math.round((e.clientX - rect.left) * scaleX), Math.round((e.clientY - rect.top) * scaleY)];
  };

  const findPin = (x: number, y: number): number | null => {
    for (const entry of entries) {
      if (!entry.mapPosition) continue;
      const dx = entry.mapPosition[0] - x;
      const dy = entry.mapPosition[1] - y;
      if (Math.sqrt(dx * dx + dy * dy) < 8) return entry.mapId;
    }
    return null;
  };

  const [canvasW, canvasH] = imgDims;

  return (
    <div>
      <div style={{ fontSize: 11, color: "#8c8fa1", marginBottom: 6 }}>
        Drag pins to reposition. Click empty area to place pin for selected map.
        {!imgLoaded && <span style={{ color: "#fe640b", marginLeft: 8 }}>Map image not found — place pins on blank canvas.</span>}
      </div>
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={canvasH}
        style={{
          border: "1px solid #ccd0da", borderRadius: 4,
          cursor: dragging != null ? "grabbing" : "crosshair",
          display: "block", maxWidth: "100%",
        }}
        onMouseDown={(e) => {
          const [x, y] = getPos(e);
          const pinId = findPin(x, y);
          if (pinId != null) { setDragging(pinId); }
          else if (selectedMapId != null) {
            onUpdatePin(selectedMapId, [x, y]);
          }
        }}
        onMouseMove={(e) => {
          if (dragging == null) return;
          const [x, y] = getPos(e);
          onUpdatePin(dragging, [x, y]);
        }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      />
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export function WorldPanel() {
  const { projectPath, mapNames } = usePbsEntityContext();
  const [tab, setTab] = useState<"props" | "pins" | "connections">("props");
  const [regionIndex, setRegionIndex] = useState(0);

  const loadFn = useCallback(() => loadMapMeta(projectPath, mapNames), [projectPath, mapNames]);
  const saveFn = useCallback((items: MapMetaEntry[]) => saveMapMeta(projectPath, items), [projectPath]);

  const { items, selectedId, selected, loading, error, select, update, add, remove } =
    useEntityEditor("pbs-world", getId, loadFn, saveFn);

  const handleAdd = () => {
    const mapId = Math.max(0, ...items.map((m) => m.mapId)) + 1;
    add({
      mapId, mapName: mapNames.get(mapId) ?? `Map ${mapId}`,
      outdoor: false, showArea: false, canBicycle: false, canFly: false, canDigEscape: false,
    });
  };

  const updatePin = (mapId: number, pos: [number, number]) => {
    const entry = items.find((m) => m.mapId === mapId);
    if (entry) update(String(mapId), { mapPosition: pos });
  };

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
      <EntityListPanel
        items={items}
        selectedId={selectedId}
        getId={getId}
        getLabel={(m) => `${m.mapId} — ${m.mapName}`}
        onSelect={select}
        onAdd={handleAdd}
        onDelete={remove}
        loading={loading}
        addLabel="+ Add Map"
      />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid #ccd0da", padding: "4px 12px 0", background: "#dce0e8", flexShrink: 0 }}>
          {(["props", "pins", "connections"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: "4px 12px", fontSize: 11, background: tab === t ? "#eff1f5" : "transparent",
              border: "1px solid", borderColor: tab === t ? "#ccd0da" : "transparent",
              borderBottom: tab === t ? "1px solid #eff1f5" : "1px solid transparent",
              borderRadius: "4px 4px 0 0", cursor: "pointer",
              color: tab === t ? "#4c4f69" : "#8c8fa1", fontWeight: tab === t ? 600 : 400,
            }}>
              {t === "props" ? "Properties" : t === "pins" ? "Region Map" : "Connections"}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
          {error && <div style={{ color: "#d20f39", fontSize: 12, marginBottom: 8 }}>{error}</div>}

          {tab === "pins" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "#5c5f77", fontWeight: 600 }}>Region:</span>
                {[0, 1, 2, 3].map((i) => (
                  <button key={i} onClick={() => setRegionIndex(i)} style={{
                    padding: "2px 8px", fontSize: 11, borderRadius: 3, cursor: "pointer",
                    background: regionIndex === i ? "#1e66f5" : "#dce0e8",
                    color: regionIndex === i ? "#fff" : "#4c4f69",
                    border: "1px solid", borderColor: regionIndex === i ? "#1e66f5" : "#ccd0da",
                  }}>{i}</button>
                ))}
              </div>
              <RegionPinCanvas
                projectPath={projectPath}
                entries={items}
                selectedMapId={selectedId ? parseInt(selectedId, 10) : undefined}
                regionIndex={regionIndex}
                onUpdatePin={updatePin}
              />
            </div>
          )}

          {tab === "connections" && (
            <ConnectionsEditor projectPath={projectPath} mapNames={mapNames} entries={items} />
          )}

          {tab === "props" && (
            <>
              {!selected && !loading && <div style={{ color: "#8c8fa1", fontSize: 12 }}>Select a map.</div>}
              {selected && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 480 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69", borderBottom: "1px solid #ccd0da", paddingBottom: 8 }}>
                    Map {selected.mapId} — {selected.mapName}
                  </div>

                  {/* Boolean flags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                    {([
                      ["outdoor", "Outdoor"],
                      ["showArea", "Show Area Name"],
                      ["canBicycle", "Bicycle"],
                      ["bicycleAlways", "Bicycle (Always)"],
                      ["bicycleBridge", "Bicycle (Bridge only)"],
                      ["canFly", "Fly"],
                      ["canDigEscape", "Dig/Escape Rope"],
                      ["safariBattle", "Safari Battle"],
                      ["darkMap", "Dark Map"],
                    ] as [keyof MapMetaEntry, string][]).map(([key, label]) => (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#4c4f69" }}>
                        <input
                          type="checkbox"
                          checked={!!selected[key]}
                          onChange={(e) => update(getId(selected), { [key]: e.target.checked || undefined })}
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    <Field label="Environment">
                      <select
                        value={selected.environment ?? ""}
                        onChange={(e) => update(getId(selected), { environment: e.target.value || undefined })}
                        style={inp}
                      >
                        <option value="">—</option>
                        {ENVIRONMENTS.map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </Field>
                    <Field label="Weather">
                      <select
                        value={selected.weather ?? ""}
                        onChange={(e) => update(getId(selected), { weather: e.target.value || undefined })}
                        style={inp}
                      >
                        <option value="">None</option>
                        {["Sun", "Rain", "LightRain", "Snow", "Blizzard", "Sandstorm", "Hail", "Fog"].map((w) => (
                          <option key={w}>{w}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Chance (%)">
                      <input
                        type="number"
                        value={selected.weatherChance ?? ""}
                        onChange={(e) => update(getId(selected), { weatherChance: parseInt(e.target.value, 10) || undefined })}
                        style={{ ...inp, width: 70 }}
                      />
                    </Field>
                  </div>

                  <Field label="Healing Spot (Map ID, X, Y)">
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {([0, 1, 2] as const).map((idx) => (
                        <input
                          key={idx}
                          type="number"
                          value={selected.healingSpot?.[idx] ?? ""}
                          placeholder={["Map ID", "X", "Y"][idx]}
                          onChange={(e) => {
                            const spot: [number, number, number] = [...(selected.healingSpot ?? [0, 0, 0])] as [number, number, number];
                            spot[idx] = parseInt(e.target.value, 10) || 0;
                            update(getId(selected), { healingSpot: spot });
                          }}
                          style={{ ...inp, width: 70 }}
                        />
                      ))}
                      {selected.healingSpot && (
                        <button onClick={() => update(getId(selected), { healingSpot: undefined })} style={{ padding: "4px 8px", background: "none", border: "1px solid #ccd0da", borderRadius: 4, cursor: "pointer", color: "#fe640b", fontSize: 11 }}>Clear</button>
                      )}
                    </div>
                  </Field>

                  <Field label="Region Map Position (x, y)">
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input
                        type="number"
                        value={selected.mapPosition?.[0] ?? ""}
                        onChange={(e) => update(getId(selected), { mapPosition: [parseInt(e.target.value, 10) || 0, selected.mapPosition?.[1] ?? 0] })}
                        style={{ ...inp, width: 70 }}
                      />
                      <span style={{ color: "#8c8fa1" }}>×</span>
                      <input
                        type="number"
                        value={selected.mapPosition?.[1] ?? ""}
                        onChange={(e) => update(getId(selected), { mapPosition: [selected.mapPosition?.[0] ?? 0, parseInt(e.target.value, 10) || 0] })}
                        style={{ ...inp, width: 70 }}
                      />
                    </div>
                  </Field>

                  <Field label="Battle Background (ground, sky)">
                    <div style={{ display: "flex", gap: 6 }}>
                      <input
                        value={selected.battleBacks?.ground ?? ""}
                        onChange={(e) => update(getId(selected), { battleBacks: { ...selected.battleBacks, ground: e.target.value } })}
                        placeholder="Ground"
                        style={inp}
                      />
                      <input
                        value={selected.battleBacks?.sky ?? ""}
                        onChange={(e) => update(getId(selected), { battleBacks: { ...selected.battleBacks, sky: e.target.value } })}
                        placeholder="Sky"
                        style={inp}
                      />
                    </div>
                  </Field>

                  <div style={{ display: "flex", gap: 12 }}>
                    <Field label="Default Fly Destination (Map ID)">
                      <input
                        type="number"
                        value={selected.defaultFlyTo ?? ""}
                        onChange={(e) => update(getId(selected), { defaultFlyTo: parseInt(e.target.value, 10) || undefined })}
                        style={{ ...inp, width: 80 }}
                      />
                    </Field>
                    <Field label="Parent Map ID">
                      <input
                        type="number"
                        value={selected.parent ?? ""}
                        onChange={(e) => update(getId(selected), { parent: parseInt(e.target.value, 10) || undefined })}
                        style={{ ...inp, width: 80 }}
                      />
                    </Field>
                  </div>

                  <Field label="Map Flags">
                    <ChipListEditor
                      values={selected.mapFlags ?? []}
                      options={[...MAP_FLAG_OPTIONS]}
                      onChange={(v) => update(getId(selected), { mapFlags: v.length ? v : undefined })}
                      placeholder="e.g. DisableBoxLink…"
                    />
                  </Field>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Map Connections Editor ────────────────────────────────────────────────────

interface MapConnection {
  map1: number;
  dir1: string;
  offset1: number;
  map2: number;
  dir2: string;
  offset2: number;
}

const DIRS = ["N", "S", "E", "W"] as const;
const OPPOSITE: Record<string, string> = { N: "S", S: "N", E: "W", W: "E" };

function parseConnections(raw: string): MapConnection[] {
  return raw.split("\n")
    .map((l) => l.replace(/#.*$/, "").trim())
    .filter(Boolean)
    .map((line) => {
      const p = line.split(",").map((s) => s.trim());
      if (p.length < 6) return null;
      return {
        map1: parseInt(p[0], 10),
        dir1: p[1],
        offset1: parseInt(p[2], 10),
        map2: parseInt(p[3], 10),
        dir2: p[4],
        offset2: parseInt(p[5], 10),
      };
    })
    .filter((c): c is MapConnection => c !== null && !isNaN(c.map1) && !isNaN(c.map2));
}

function serializeConnections(conns: MapConnection[]): string {
  return conns
    .map((c) => `${c.map1},${c.dir1},${c.offset1},${c.map2},${c.dir2},${c.offset2}`)
    .join("\n") + (conns.length ? "\n" : "");
}

// ── Connections: visual canvas diagram ───────────────────────────────────────

function ConnectionsDiagram({
  connections,
  mapNames,
  entries,
}: {
  connections: MapConnection[];
  mapNames: Map<number, string>;
  entries: MapMetaEntry[];
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#eff1f5";
    ctx.fillRect(0, 0, W, H);

    if (connections.length === 0) {
      ctx.fillStyle = "#8c8fa1";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No connections defined", W / 2, H / 2);
      return;
    }

    // Build layout: BFS from first map, place connected maps in N/S/E/W grid
    const DIR_DELTA: Record<string, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
    const gridPos = new Map<number, [number, number]>();
    const allIds = new Set<number>();
    connections.forEach((c) => { allIds.add(c.map1); allIds.add(c.map2); });

    // Try to use mapPosition from entries for layout
    let useGeo = false;
    const geoPos = new Map<number, [number, number]>();
    for (const id of allIds) {
      const entry = entries.find((e) => e.mapId === id);
      if (entry?.mapPosition) geoPos.set(id, entry.mapPosition);
    }
    if (geoPos.size >= allIds.size * 0.6) useGeo = true;

    if (useGeo) {
      // Normalize geographic positions to canvas space
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [, [gx, gy]] of geoPos) {
        minX = Math.min(minX, gx); maxX = Math.max(maxX, gx);
        minY = Math.min(minY, gy); maxY = Math.max(maxY, gy);
      }
      const pad = 60;
      const rx = maxX === minX ? 1 : (W - pad * 2) / (maxX - minX);
      const ry = maxY === minY ? 1 : (H - pad * 2) / (maxY - minY);
      for (const [id, [gx, gy]] of geoPos) {
        gridPos.set(id, [pad + (gx - minX) * rx, pad + (gy - minY) * ry]);
      }
      // Place remaining maps (no geo pos) in a row at bottom
      let xOff = pad;
      for (const id of allIds) {
        if (!gridPos.has(id)) { gridPos.set(id, [xOff, H - pad]); xOff += 100; }
      }
    } else {
      // BFS layout
      const BOX_W = 100, BOX_H = 36, GAP_X = 40, GAP_Y = 30;
      const STEP_X = BOX_W + GAP_X, STEP_Y = BOX_H + GAP_Y;
      const firstId = connections[0].map1;
      gridPos.set(firstId, [0, 0]);
      const queue = [firstId];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        const [gx, gy] = gridPos.get(cur)!;
        for (const conn of connections) {
          let neighbor: number | null = null, delta: [number, number] | null = null;
          if (conn.map1 === cur) { neighbor = conn.map2; delta = DIR_DELTA[conn.dir1]; }
          else if (conn.map2 === cur) { neighbor = conn.map1; delta = DIR_DELTA[conn.dir2]; }
          if (neighbor == null || delta == null || gridPos.has(neighbor)) continue;
          gridPos.set(neighbor, [gx + delta[0], gy + delta[1]]);
          queue.push(neighbor);
        }
      }
      // Place disconnected maps
      let xi = 0;
      for (const id of allIds) {
        if (!gridPos.has(id)) { gridPos.set(id, [xi++, 3]); }
      }
      // Convert grid units to pixels, centering in canvas
      let minGx = Infinity, maxGx = -Infinity, minGy = Infinity, maxGy = -Infinity;
      for (const [, [gx, gy]] of gridPos) {
        minGx = Math.min(minGx, gx); maxGx = Math.max(maxGx, gx);
        minGy = Math.min(minGy, gy); maxGy = Math.max(maxGy, gy);
      }
      const gridW = (maxGx - minGx + 1) * STEP_X;
      const gridH = (maxGy - minGy + 1) * STEP_Y;
      const offX = (W - gridW) / 2 + BOX_W / 2;
      const offY = (H - gridH) / 2 + BOX_H / 2;
      for (const [id, [gx, gy]] of gridPos) {
        gridPos.set(id, [offX + (gx - minGx) * STEP_X, offY + (gy - minGy) * STEP_Y]);
      }
    }

    const BOX_W = useGeo ? 0 : 100, BOX_H = useGeo ? 0 : 36;

    // Draw connections (arrows)
    ctx.strokeStyle = "#7287fd";
    ctx.lineWidth = 2;
    for (const conn of connections) {
      const a = gridPos.get(conn.map1), b = gridPos.get(conn.map2);
      if (!a || !b) continue;
      const [ax, ay] = a, [bx, by] = b;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.stroke();
      // Arrow head toward b
      const angle = Math.atan2(by - ay, bx - ax);
      const ah = 8;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx - ah * Math.cos(angle - 0.4), by - ah * Math.sin(angle - 0.4));
      ctx.lineTo(bx - ah * Math.cos(angle + 0.4), by - ah * Math.sin(angle + 0.4));
      ctx.closePath();
      ctx.fillStyle = "#7287fd";
      ctx.fill();
      // Direction label
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      ctx.fillStyle = "#4c4f69";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${conn.dir1}↔${conn.dir2}`, mx, my - 4);
    }

    // Draw map boxes
    for (const id of allIds) {
      const pos = gridPos.get(id);
      if (!pos) continue;
      const [px, py] = pos;
      const name = mapNames.get(id) ?? "";
      const label = `${id}`;
      const sublabel = name.length > 12 ? name.slice(0, 10) + "…" : name;

      if (!useGeo) {
        ctx.fillStyle = "#1e66f5";
        ctx.beginPath();
        ctx.roundRect(px - BOX_W / 2, py - BOX_H / 2, BOX_W, BOX_H, 4);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(label, px, py - 4);
        ctx.font = "9px sans-serif";
        ctx.fillStyle = "rgba(255,255,255,0.8)";
        ctx.fillText(sublabel, px, py + 8);
      } else {
        // Geo mode: just draw a pin + label
        ctx.beginPath();
        ctx.arc(px, py, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#1e66f5";
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = "#4c4f69";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "left";
        ctx.fillText(`${label} ${sublabel}`, px + 9, py + 3);
      }
    }
  }, [connections, mapNames, entries]);

  return (
    <canvas
      ref={canvasRef}
      width={640}
      height={400}
      style={{ border: "1px solid #ccd0da", borderRadius: 4, display: "block", maxWidth: "100%", background: "#eff1f5" }}
    />
  );
}

function ConnectionsEditor({ projectPath, mapNames, entries }: { projectPath: string; mapNames: Map<number, string>; entries: MapMetaEntry[] }) {
  const [connections, setConnections] = useState<MapConnection[]>([]);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "visual">("table");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    readRawPbsFile(projectPath, "map_connections.txt")
      .then((raw) => { if (!cancelled) { setConnections(parseConnections(raw)); setDirty(false); } })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectPath]);

  const save = async () => {
    try {
      await writeRawPbsFile(projectPath, "map_connections.txt", serializeConnections(connections));
      setDirty(false);
    } catch (e) { setError(String(e)); }
  };

  const update = (idx: number, patch: Partial<MapConnection>) => {
    setConnections((prev) => prev.map((c, i) => i === idx ? { ...c, ...patch } : c));
    setDirty(true);
  };

  const add = () => {
    const ids = Array.from(mapNames.keys()).sort((a, b) => a - b);
    const m1 = ids[0] ?? 1, m2 = ids[1] ?? 2;
    setConnections((prev) => [...prev, { map1: m1, dir1: "N", offset1: 0, map2: m2, dir2: "S", offset2: 0 }]);
    setDirty(true);
  };

  const remove = (idx: number) => { setConnections((prev) => prev.filter((_, i) => i !== idx)); setDirty(true); };

  const mapLabel = (id: number) => mapNames.has(id) ? `${id} — ${mapNames.get(id)}` : String(id);

  const mapIds = Array.from(mapNames.keys()).sort((a, b) => a - b);

  if (loading) return <div style={{ color: "#8c8fa1", fontSize: 12 }}>Loading...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {error && <div style={{ color: "#d20f39", fontSize: 12 }}>{error}</div>}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#4c4f69" }}>Map Connections ({connections.length})</span>
        <button onClick={add} style={{ fontSize: 11, padding: "3px 10px", background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>+ Add</button>
        {dirty && <button onClick={save} style={{ fontSize: 11, padding: "3px 10px", background: "#40a02b", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>Save</button>}
        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {(["table", "visual"] as const).map((mode) => (
            <button key={mode} onClick={() => setViewMode(mode)} style={{
              fontSize: 10, padding: "2px 8px", borderRadius: 3, cursor: "pointer",
              background: viewMode === mode ? "#4c4f69" : "#dce0e8",
              color: viewMode === mode ? "#fff" : "#5c5f77",
              border: "1px solid", borderColor: viewMode === mode ? "#4c4f69" : "#ccd0da",
            }}>{mode === "table" ? "Table" : "Visual"}</button>
          ))}
        </div>
      </div>

      {viewMode === "visual" ? (
        <ConnectionsDiagram connections={connections} mapNames={mapNames} entries={entries} />
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
            <thead>
              <tr style={{ background: "#dce0e8" }}>
                {["Map A", "Dir", "Offset", "Map B", "Dir", "Offset", ""].map((h, i) => (
                  <th key={i} style={{ padding: "4px 8px", textAlign: "left", fontWeight: 600, color: "#5c5f77", borderBottom: "1px solid #ccd0da", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {connections.map((c, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8f9fc" }}>
                  <td style={{ padding: "3px 6px" }}>
                    <select value={c.map1} onChange={(e) => update(i, { map1: parseInt(e.target.value, 10) })} style={cellSel}>
                      {mapIds.map((id) => <option key={id} value={id}>{mapLabel(id)}</option>)}
                      {!mapNames.has(c.map1) && <option value={c.map1}>{c.map1}</option>}
                    </select>
                  </td>
                  <td style={{ padding: "3px 6px" }}>
                    <select value={c.dir1} onChange={(e) => { const d = e.target.value; update(i, { dir1: d, dir2: OPPOSITE[d] ?? c.dir2 }); }} style={{ ...cellSel, width: 52 }}>
                      {DIRS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "3px 6px" }}>
                    <input type="number" value={c.offset1} onChange={(e) => update(i, { offset1: parseInt(e.target.value, 10) || 0 })} style={{ ...cellSel, width: 60 }} />
                  </td>
                  <td style={{ padding: "3px 6px" }}>
                    <select value={c.map2} onChange={(e) => update(i, { map2: parseInt(e.target.value, 10) })} style={cellSel}>
                      {mapIds.map((id) => <option key={id} value={id}>{mapLabel(id)}</option>)}
                      {!mapNames.has(c.map2) && <option value={c.map2}>{c.map2}</option>}
                    </select>
                  </td>
                  <td style={{ padding: "3px 6px" }}>
                    <select value={c.dir2} onChange={(e) => update(i, { dir2: e.target.value })} style={{ ...cellSel, width: 52 }}>
                      {DIRS.map((d) => <option key={d}>{d}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: "3px 6px" }}>
                    <input type="number" value={c.offset2} onChange={(e) => update(i, { offset2: parseInt(e.target.value, 10) || 0 })} style={{ ...cellSel, width: 60 }} />
                  </td>
                  <td style={{ padding: "3px 6px" }}>
                    <button onClick={() => remove(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 14 }}>×</button>
                  </td>
                </tr>
              ))}
              {connections.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "12px 8px", color: "#8c8fa1", textAlign: "center" }}>No connections. Click "+ Add" to create one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const cellSel: React.CSSProperties = {
  padding: "2px 5px", fontSize: 11, border: "1px solid #ccd0da", borderRadius: 3,
  background: "#fff", color: "#4c4f69", boxSizing: "border-box", width: "100%",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: "#5c5f77" }}>{label}</label>
      {children}
    </div>
  );
}
const inp: React.CSSProperties = {
  padding: "4px 8px", fontSize: 12, border: "1px solid #ccd0da", borderRadius: 4,
  background: "#fff", color: "#4c4f69", width: "100%", boxSizing: "border-box",
};
