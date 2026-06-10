import { useId } from "react";
import type { Evolution } from "../../../../types/pbsEntityTypes";
import { evInp } from "./shared";

export function EvolutionsTab({
  evolutions,
  pokemonNames,
  onChange,
}: {
  evolutions: Evolution[];
  pokemonNames: string[];
  onChange: (evos: Evolution[]) => void;
}) {
  const dlId = useId();
  const METHODS = [
    // Level-up methods
    "Level", "LevelMale", "LevelFemale",
    "LevelDay", "LevelNight", "LevelMorning", "LevelAfternoon", "LevelEvening",
    "LevelNoWeather", "LevelSun", "LevelRain", "LevelSnow", "LevelSandstorm",
    "LevelCycling", "LevelSurfing", "LevelDiving", "LevelDarkness", "LevelDarkInParty",
    "AttackGreater", "AtkDefEqual", "DefenseGreater",
    "Silcoon", "Cascoon",
    // Happiness
    "Happiness", "HappinessDay", "HappinessNight",
    // Item-use methods
    "Item", "ItemMale", "ItemFemale", "ItemDay", "ItemNight", "ItemMorning",
    // Trade methods
    "Trade", "TradeItem", "TradeSpecies",
    // Party/move methods
    "HasMove", "HasMoveType", "HasInParty", "InArea", "Location",
    // Other
    "Beauty", "LevelAmie", "Shedinja", "None",
  ];
  const methodDlId = useId();

  return (
    <div>
      <datalist id={dlId}>{pokemonNames.map((n) => <option key={n} value={n} />)}</datalist>
      <datalist id={methodDlId}>{METHODS.map((m) => <option key={m} value={m} />)}</datalist>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {evolutions.map((evo, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 8px", background: "#f0f2f5", borderRadius: 4 }}>
            <span style={{ fontSize: 10, color: "#8c8fa1", width: 16 }}>→</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              <div style={{ display: "flex", gap: 4 }}>
                <input list={dlId} value={evo.species ?? ""} onChange={(e) => { const next = [...evolutions]; next[i] = { ...evo, species: e.target.value }; onChange(next); }} placeholder="Species" style={{ ...evInp, flex: 1 }} />
                <input list={methodDlId} value={evo.method ?? ""} onChange={(e) => { const next = [...evolutions]; next[i] = { ...evo, method: e.target.value }; onChange(next); }} placeholder="Method" style={{ ...evInp, flex: 1 }} />
                <input value={evo.parameter ?? ""} onChange={(e) => { const next = [...evolutions]; next[i] = { ...evo, parameter: e.target.value }; onChange(next); }} placeholder="Param (level/item/etc)" style={{ ...evInp, flex: 1 }} />
              </div>
            </div>
            <button onClick={() => onChange(evolutions.filter((_, j) => j !== i))} style={{ background: "none", border: "none", cursor: "pointer", color: "#fe640b", fontSize: 13 }}>×</button>
          </div>
        ))}
        <button onClick={() => onChange([...evolutions, { species: "", method: "Level", parameter: "" }])} style={{ alignSelf: "flex-start", fontSize: 11, padding: "3px 10px", background: "#1e66f5", color: "#fff", border: "none", borderRadius: 3, cursor: "pointer" }}>
          + Add Evolution
        </button>
      </div>
    </div>
  );
}
