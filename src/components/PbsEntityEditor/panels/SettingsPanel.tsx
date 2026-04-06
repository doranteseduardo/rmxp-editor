import { useCallback, useState, useEffect, useRef } from "react";
import { loadMetadata } from "../../../services/pbsUnified";
import { saveMetadata } from "../../../services/pbsDistributor";
import { usePbsEntityContext } from "../PbsEntityContext";
import { useEditorRegistration } from "../../../context/ProjectSaveContext";
import type { MetadataEntry, PlayerChar } from "../../../types/pbsEntityTypes";
import { ChipListEditor } from "../shared/ChipListEditor";
import { previewAudio } from "../../../services/tauriApi";

const EMPTY_CHAR: PlayerChar = { trainerType: "", walkCharset: "" };

function BgmField({
  label, value, projectPath, type = "BGM",
  onChange,
}: {
  label: string; value?: string; projectPath: string; type?: "BGM" | "ME";
  onChange: (v: string | undefined) => void;
}) {
  return (
    <Field label={label}>
      <div style={{ display: "flex", gap: 6 }}>
        <input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || undefined)}
          style={{ ...inp, flex: 1 }}
          placeholder="e.g. Battle Trainer"
        />
        {value && (
          <button
            onClick={() => previewAudio(projectPath, type, value, 0.8)}
            style={{ padding: "4px 8px", fontSize: 11, background: "#1e66f5", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
          >▶</button>
        )}
      </div>
    </Field>
  );
}

function PlayerCharEditor({
  char, idx, projectPath, trainerTypeNames,
  onChange, onRemove,
}: {
  char: PlayerChar; idx: number; projectPath: string; trainerTypeNames: string[];
  onChange: (patch: Partial<PlayerChar>) => void;
  onRemove: () => void;
}) {
  const dlId = `pc-dl-${idx}`;
  return (
    <div style={{ border: "1px solid #ccd0da", borderRadius: 6, padding: 12, background: "#f8f9fc" }}>
      <datalist id={dlId}>{trainerTypeNames.map((n) => <option key={n} value={n} />)}</datalist>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrainerSprite projectPath={projectPath} id={char.trainerType} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#5c5f77" }}>
            Player {String.fromCharCode(65 + idx)}
          </span>
        </div>
        <button onClick={onRemove} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 14 }}>×</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <Field label="Trainer Type">
            <select
              value={char.trainerType}
              onChange={(e) => onChange({ trainerType: e.target.value })}
              style={{ ...inp, width: 180 }}
            >
              {!trainerTypeNames.includes(char.trainerType) && char.trainerType && (
                <option value={char.trainerType}>{char.trainerType}</option>
              )}
              {trainerTypeNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Walk Charset">
            <input value={char.walkCharset} onChange={(e) => onChange({ walkCharset: e.target.value })} style={{ ...inp, width: 150 }} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {([
            ["runCharset", "Run"],
            ["cycleCharset", "Cycle"],
            ["surfCharset", "Surf"],
            ["diveCharset", "Dive"],
            ["fishCharset", "Fish"],
            ["surfFishCharset", "Surf+Fish"],
          ] as [keyof PlayerChar, string][]).map(([key, label]) => (
            <Field key={key} label={label}>
              <input
                value={(char[key] as string) ?? ""}
                onChange={(e) => onChange({ [key]: e.target.value || undefined })}
                style={{ ...inp, width: 110 }}
                placeholder="—"
              />
            </Field>
          ))}
        </div>
        <Field label="Home Override (Map ID, X, Y, Direction)">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {([0, 1, 2] as const).map((i) => (
              <input
                key={i}
                type="number"
                value={char.home?.[i] ?? ""}
                placeholder={["Map", "X", "Y"][i]}
                onChange={(e) => {
                  const h: [number, number, number, string] = [...(char.home ?? [0, 0, 0, "Down"])] as [number, number, number, string];
                  h[i] = parseInt(e.target.value, 10) || 0;
                  onChange({ home: h });
                }}
                style={{ ...inp, width: 65 }}
              />
            ))}
            <select
              value={char.home?.[3] ?? ""}
              onChange={(e) => {
                const h: [number, number, number, string] = [...(char.home ?? [0, 0, 0, "Down"])] as [number, number, number, string];
                h[3] = e.target.value;
                onChange({ home: h });
              }}
              style={{ ...inp, width: 80 }}
            >
              <option value="">—</option>
              <option>Down</option><option>Up</option><option>Left</option><option>Right</option>
            </select>
            {char.home && (
              <button onClick={() => onChange({ home: undefined })} style={{ padding: "4px 8px", background: "none", border: "1px solid #ccd0da", borderRadius: 4, cursor: "pointer", color: "#fe640b", fontSize: 11 }}>Clear</button>
            )}
          </div>
        </Field>
      </div>
    </div>
  );
}

function buildAssetUrl(p: string) {
  return `asset://localhost/${encodeURIComponent(p)}`;
}

function TrainerSprite({ projectPath, id }: { projectPath: string; id: string }) {
  if (!id) return <span style={{ width: 32, height: 32, display: "inline-block" }} />;
  return (
    <img
      src={buildAssetUrl(`${projectPath}/Graphics/Trainers/${id}.png`)}
      alt={id}
      style={{ width: 32, height: 32, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
    />
  );
}

export function SettingsPanel() {
  const { projectPath, pbsIndex, mapNames } = usePbsEntityContext();
  const trainerTypeNames = pbsIndex.get("trainer_types.txt") ?? [];
  const itemNames = pbsIndex.get("items.txt") ?? [];

  // Build sorted map list for the map selector
  const mapList = Array.from(mapNames.entries()).sort((a, b) => a[0] - b[0]);
  const mapDlId = "settings-map-dl";

  const [meta, setMeta] = useState<MetadataEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const snapshotRef = useRef<MetadataEntry | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadMetadata(projectPath)
      .then((data) => {
        if (cancelled) return;
        setMeta(data);
        snapshotRef.current = data;
        setDirty(false);
      })
      .catch((err) => { if (!cancelled) setError(String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectPath]);

  const update = (patch: Partial<MetadataEntry>) => {
    setMeta((prev) => prev ? { ...prev, ...patch } : prev);
    setDirty(true);
  };

  const doSave = useCallback(async () => {
    if (!meta) return;
    try {
      setLoading(true);
      await saveMetadata(projectPath, meta);
      snapshotRef.current = meta;
      setDirty(false);
    } catch (err) {
      setError(`Save failed: ${err}`);
    } finally {
      setLoading(false);
    }
  }, [projectPath, meta]);

  const doCancel = useCallback(() => {
    if (snapshotRef.current) { setMeta(snapshotRef.current); setDirty(false); }
  }, []);

  useEditorRegistration("pbs-settings", doSave, doCancel, dirty);

  if (loading) return <div style={{ padding: 20, color: "#8c8fa1", fontSize: 12 }}>Loading...</div>;
  if (error) return <div style={{ padding: 20, color: "#d20f39", fontSize: 12 }}>{error}</div>;
  if (!meta) return null;

  const updateChar = (idx: number, patch: Partial<PlayerChar>) => {
    const chars = [...meta.playerChars];
    chars[idx] = { ...chars[idx], ...patch };
    update({ playerChars: chars });
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#4c4f69", borderBottom: "1px solid #ccd0da", paddingBottom: 8, marginBottom: 16 }}>
        Global Project Settings
      </div>

      <Section title="Starting Position">
        <datalist id={mapDlId}>
          {mapList.map(([id, name]) => <option key={id} value={id}>{id} — {name}</option>)}
        </datalist>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Field label="Map">
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select
                value={meta.startingMap}
                onChange={(e) => update({ startingMap: parseInt(e.target.value, 10) || 0 })}
                style={{ ...inp, minWidth: 180 }}
              >
                {mapList.map(([id, name]) => (
                  <option key={id} value={id}>{id} — {name}</option>
                ))}
                {!mapNames.has(meta.startingMap) && (
                  <option value={meta.startingMap}>{meta.startingMap} (unknown)</option>
                )}
              </select>
            </div>
          </Field>
          <Field label="X">
            <input type="number" value={meta.startingX} onChange={(e) => update({ startingX: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 70 }} />
          </Field>
          <Field label="Y">
            <input type="number" value={meta.startingY} onChange={(e) => update({ startingY: parseInt(e.target.value, 10) || 0 })} style={{ ...inp, width: 70 }} />
          </Field>
          <Field label="Direction">
            <select value={meta.startingDirection} onChange={(e) => update({ startingDirection: e.target.value })} style={inp}>
              <option>Down</option><option>Up</option><option>Left</option><option>Right</option>
            </select>
          </Field>
          <Field label="Start Money">
            <input type="number" value={meta.startMoney ?? ""} onChange={(e) => update({ startMoney: parseInt(e.target.value, 10) || undefined })} style={{ ...inp, width: 90 }} placeholder="3000" />
          </Field>
        </div>
        <Field label="Start Item Storage">
          <ChipListEditor
            values={meta.startItemStorage ?? []}
            options={itemNames}
            onChange={(v) => update({ startItemStorage: v.length ? v : undefined })}
            placeholder="Item IDs pre-placed in PC…"
          />
        </Field>
        <Field label="Storage Creator">
          <input
            value={meta.storageCreator ?? ""}
            onChange={(e) => update({ storageCreator: e.target.value })}
            style={{ ...inp, maxWidth: 300 }}
          />
        </Field>
      </Section>

      <Section title="Music">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <BgmField label="Wild Battle BGM" value={meta.wildBattleBGM} projectPath={projectPath} onChange={(v) => update({ wildBattleBGM: v })} />
          <BgmField label="Trainer Battle BGM" value={meta.trainerBattleBGM} projectPath={projectPath} onChange={(v) => update({ trainerBattleBGM: v })} />
          <BgmField label="Wild Victory BGM" value={meta.wildVictoryBGM} projectPath={projectPath} onChange={(v) => update({ wildVictoryBGM: v })} />
          <BgmField label="Trainer Victory BGM" value={meta.trainerVictoryBGM} projectPath={projectPath} onChange={(v) => update({ trainerVictoryBGM: v })} />
          <BgmField label="Wild Capture ME" value={meta.wildCaptureME} projectPath={projectPath} type="ME" onChange={(v) => update({ wildCaptureME: v })} />
          <BgmField label="Surf BGM" value={meta.surfBGM} projectPath={projectPath} onChange={(v) => update({ surfBGM: v })} />
          <BgmField label="Bicycle BGM" value={meta.bicycleBGM} projectPath={projectPath} onChange={(v) => update({ bicycleBGM: v })} />
        </div>
      </Section>

      <Section title="Region Map">
        <Field label="Town Map Bitmap">
          <input
            value={meta.townMapBitmap ?? ""}
            onChange={(e) => update({ townMapBitmap: e.target.value || undefined })}
            placeholder="e.g. Graphics/UI/Town Map/town_map"
            style={inp}
          />
        </Field>
        <Field label="Region Map Files">
          <ChipListEditor
            values={meta.regionMaps}
            onChange={(v) => update({ regionMaps: v })}
            placeholder="e.g. town_map"
          />
        </Field>
      </Section>

      <Section title="Player Characters">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {meta.playerChars.map((char, i) => (
            <PlayerCharEditor
              key={i}
              char={char}
              idx={i}
              projectPath={projectPath}
              trainerTypeNames={trainerTypeNames}
              onChange={(patch) => updateChar(i, patch)}
              onRemove={() => update({ playerChars: meta.playerChars.filter((_, j) => j !== i) })}
            />
          ))}
        </div>
        {meta.playerChars.length < 8 && (
          <button
            onClick={() => update({ playerChars: [...meta.playerChars, { ...EMPTY_CHAR }] })}
            style={{ fontSize: 11, padding: "3px 10px", background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer", marginTop: 8 }}
          >
            + Add Player Character
          </button>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#5c5f77", marginBottom: 8, borderBottom: "1px solid #e6e9ef", paddingBottom: 4 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{children}</div>
    </div>
  );
}

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
