import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle, StreamLanguage } from "@codemirror/language";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";

// ── Catppuccin Latte theme ──────────────────────────────────────

const catppuccinTheme = EditorView.theme(
  {
    "&": {
      color: "#4c4f69",
      backgroundColor: "#eff1f5",
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
    },
    ".cm-content": { caretColor: "#dc8a78" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#dc8a78" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "#bcc0cc" },
    ".cm-panels": { backgroundColor: "#e6e9ef", color: "#4c4f69" },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid #ccd0da" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid #ccd0da" },
    ".cm-searchMatch": { backgroundColor: "#acb0be66", outline: "1px solid #acb0be" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#1e66f533" },
    ".cm-activeLine": { backgroundColor: "#e6e9ef" },
    ".cm-selectionMatch": { backgroundColor: "#acb0be44" },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "#acb0be66",
      outline: "1px solid #1e66f5",
    },
    ".cm-gutters": {
      backgroundColor: "#e6e9ef",
      color: "#8c8fa1",
      border: "none",
      borderRight: "1px solid #ccd0da",
    },
    ".cm-activeLineGutter": { backgroundColor: "#eff1f5", color: "#6c6f85" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#ccd0da",
      color: "#6c6f85",
      border: "none",
    },
    ".cm-tooltip": {
      backgroundColor: "#eff1f5",
      border: "1px solid #ccd0da",
      color: "#4c4f69",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": { borderTopColor: "#ccd0da" },
    ".cm-tooltip .cm-tooltip-arrow:after": { borderTopColor: "#eff1f5" },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": { backgroundColor: "#bcc0cc" },
    },
    // Search panel styling
    ".cm-panel.cm-search": {
      backgroundColor: "#e6e9ef",
      padding: "4px 8px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: "#eff1f5",
      border: "1px solid #bcc0cc",
      color: "#4c4f69",
      borderRadius: "3px",
      padding: "2px 6px",
    },
    ".cm-panel.cm-search button": {
      backgroundColor: "#ccd0da",
      border: "1px solid #bcc0cc",
      color: "#4c4f69",
      borderRadius: "3px",
      cursor: "pointer",
    },
    ".cm-panel.cm-search label": { color: "#6c6f85" },
  },
  { dark: false }
);

const catppuccinHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#8839ef" },
  { tag: tags.operator, color: "#04a5e5" },
  { tag: tags.special(tags.variableName), color: "#d20f39" },
  { tag: tags.typeName, color: "#df8e1d" },
  { tag: tags.atom, color: "#fe640b" },
  { tag: tags.number, color: "#fe640b" },
  { tag: tags.definition(tags.variableName), color: "#1e66f5" },
  { tag: tags.string, color: "#40a02b" },
  { tag: tags.special(tags.string), color: "#40a02b" },
  { tag: tags.comment, color: "#8c8fa1", fontStyle: "italic" },
  { tag: tags.variableName, color: "#4c4f69" },
  { tag: tags.tagName, color: "#1e66f5" },
  { tag: tags.bracket, color: "#7c7f93" },
  { tag: tags.meta, color: "#dc8a78" },
  { tag: tags.link, color: "#1e66f5", textDecoration: "underline" },
  { tag: tags.heading, color: "#1e66f5", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.bool, color: "#fe640b" },
  { tag: tags.regexp, color: "#d20f39" },
  { tag: tags.className, color: "#df8e1d" },
  { tag: tags.propertyName, color: "#1e66f5" },
  { tag: tags.function(tags.variableName), color: "#1e66f5" },
  { tag: tags.self, color: "#d20f39" },
]);

// ── Component ───────────────────────────────────────────────────

interface Props {
  source: string | null;
  loading: boolean;
  onSourceChange: (newSource: string) => void;
}

export function CodeEditorPanel({ source, loading, onSourceChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onSourceChange);
  onChangeRef.current = onSourceChange;
  // Flag to suppress onChange during programmatic doc swaps
  const suppressChangeRef = useRef(false);

  // Create the editor when container is available
  // We track whether the editor has been created to avoid double-creation
  const editorCreated = useRef(false);

  useEffect(() => {
    if (!containerRef.current || editorCreated.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !suppressChangeRef.current) {
        onChangeRef.current(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: source ?? "",
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        highlightSelectionMatches(),
        StreamLanguage.define(ruby),
        catppuccinTheme,
        syntaxHighlighting(catppuccinHighlight),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
        updateListener,
        EditorView.lineWrapping,
        EditorState.tabSize.of(2),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    editorCreated.current = true;

    return () => {
      view.destroy();
      viewRef.current = null;
      editorCreated.current = false;
    };
    // Re-run when source becomes non-null (editor container appears)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source !== null]);

  // Swap document when source prop changes (different script selected)
  useEffect(() => {
    const view = viewRef.current;
    if (!view || source === null) return;

    const currentDoc = view.state.doc.toString();
    if (currentDoc !== source) {
      suppressChangeRef.current = true;
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: source,
        },
      });
      suppressChangeRef.current = false;
    }
  }, [source]);

  return (
    <div className="script-code-panel">
      {loading && <div className="script-code-loading">Loading script...</div>}
      {!loading && source === null && (
        <div className="script-code-empty">Select a script to edit</div>
      )}
      <div
        className="script-code-editor"
        ref={containerRef}
        style={{ display: source !== null && !loading ? undefined : "none" }}
      />
    </div>
  );
}
