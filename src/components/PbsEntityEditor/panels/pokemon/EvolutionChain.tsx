import type { PokemonEntry } from "../../../../types/pbsEntityTypes";
import { buildAssetUrl } from "../../../../services/assetUrl";

export function EvolutionChain({
  entry,
  all,
  projectPath,
}: {
  entry: PokemonEntry;
  all: PokemonEntry[];
  projectPath: string;
}) {
  if (!entry.evolutions.length) {
    return <div style={{ color: "#8c8fa1", fontSize: 11, padding: 8 }}>No evolutions defined.</div>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
      {/* Base form */}
      <EvolutionNode id={entry.id} name={entry.name} projectPath={projectPath} />

      {entry.evolutions.map((evo, i) => {
        const target = all.find((p) => p.id === evo.species);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <span style={{ fontSize: 16, color: "#8c8fa1" }}>→</span>
              <span style={{ fontSize: 9, color: "#8c8fa1", maxWidth: 72, textAlign: "center" }}>
                {evo.method}{evo.parameter ? ` ${evo.parameter}` : ""}
              </span>
            </div>
            <EvolutionNode id={evo.species} name={target?.name ?? evo.species} projectPath={projectPath} />
          </div>
        );
      })}
    </div>
  );
}

function EvolutionNode({ id, name, projectPath }: { id: string; name: string; projectPath: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <img
        src={buildAssetUrl(`${projectPath}/Graphics/Pokemon/Front/${id}.png`)}
        alt={id}
        style={{ width: 48, height: 48, imageRendering: "pixelated", objectFit: "contain" }}
        onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }}
      />
      <span style={{ fontSize: 9, color: "#4c4f69", fontWeight: 600 }}>{name}</span>
      <span style={{ fontSize: 8, color: "#8c8fa1" }}>{id}</span>
    </div>
  );
}
