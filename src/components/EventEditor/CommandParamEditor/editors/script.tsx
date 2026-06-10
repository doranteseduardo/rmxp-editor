import { useRef } from "react";
import type { PeScriptEditorProps } from "../types";
import { EditorShell, PbsNamePicker, str } from "../shared";

const PE_SNIPPETS: { label: string; code: string }[] = [
  { label: "Wild Battle", code: 'pbBattle(PBSpecies::POKEMON,5,false,false)' },
  { label: "Trainer Battle", code: 'pbTrainerBattle(:POKEMONTRAINER,"Trainer Name",_I("You lost!"))' },
  { label: "Give Item", code: 'pbReceiveItem(:POTION,1)' },
  { label: "Has Item?", code: 'pbHasItem?(:POTION)' },
  { label: "Remove Item", code: 'pbTakeItem(:POTION,1)' },
  { label: "Give Pokémon", code: 'pbAddPokemon(:POKEMON,5)' },
  { label: "Heal Party", code: 'pbHealAll' },
  { label: "Play BGM", code: 'pbBGMPlay("Battle trainer")' },
  { label: "Play SE", code: 'pbSEPlay("Pkmn level up")' },
  { label: "Player Name", code: '$Trainer.name' },
  { label: "Has Badge?", code: 'pbHasBadge?(1)' },
  { label: "Give Badge", code: 'pbSetBadge(1)' },
  { label: "Fade/Flash", code: 'pbFadeOutIn { }' },
  { label: "Message", code: 'pbMessage(_INTL("Hello, {1}!",$Trainer.name))' },
];

export function PeScriptEditor({ params, onChange, onDone, pbsIndex }: PeScriptEditorProps) {
  const speciesNames = pbsIndex?.get("pokemon.txt") ?? [];
  const itemNames = pbsIndex?.get("items.txt") ?? [];
  const moveNames = pbsIndex?.get("moves.txt") ?? [];
  const abilityNames = pbsIndex?.get("abilities.txt") ?? [];

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSnippet = (code: string) => {
    onChange(0, code);
  };

  const insertAtCursor = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) { onChange(0, str(params[0]) + text); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const current = str(params[0]);
    const next = current.slice(0, start) + text + current.slice(end);
    onChange(0, next);
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = start + text.length;
      ta.focus();
    });
  };

  return (
    <EditorShell title="Script (Ruby)" onDone={onDone}>
      <textarea
        ref={textareaRef}
        className="prop-input"
        value={str(params[0])}
        onChange={(e) => onChange(0, e.target.value)}
        rows={4}
        style={{ width: "100%", fontFamily: "monospace", fontSize: 11, resize: "vertical", boxSizing: "border-box" }}
        spellCheck={false}
      />

      {/* PE Snippets */}
      <div style={{ marginTop: 6 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: "#8c8fa1", marginBottom: 3 }}>PE Snippets</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {PE_SNIPPETS.map((s) => (
            <button
              key={s.label}
              onClick={() => insertSnippet(s.code)}
              style={{ fontSize: 10, padding: "2px 6px", background: "#e6e9ef", border: "1px solid #ccd0da", borderRadius: 3, cursor: "pointer", color: "#4c4f69" }}
            >{s.label}</button>
          ))}
        </div>
      </div>

      {/* PBS entity name inserters */}
      {(speciesNames.length > 0 || itemNames.length > 0 || moveNames.length > 0) && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: "#8c8fa1", marginBottom: 3 }}>Insert PBS Name</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {speciesNames.length > 0 && (
              <PbsNamePicker label="Species" names={speciesNames} prefix="PBSpecies::" onPick={insertAtCursor} />
            )}
            {itemNames.length > 0 && (
              <PbsNamePicker label="Item" names={itemNames} prefix=":" onPick={insertAtCursor} />
            )}
            {moveNames.length > 0 && (
              <PbsNamePicker label="Move" names={moveNames} prefix="PBMoves::" onPick={insertAtCursor} />
            )}
            {abilityNames.length > 0 && (
              <PbsNamePicker label="Ability" names={abilityNames} prefix="PBAbilities::" onPick={insertAtCursor} />
            )}
          </div>
        </div>
      )}
    </EditorShell>
  );
}
