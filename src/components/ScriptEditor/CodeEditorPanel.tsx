import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { syntaxHighlighting, indentOnInput, bracketMatching, foldGutter, foldKeymap, HighlightStyle, StreamLanguage } from "@codemirror/language";
import { ruby } from "@codemirror/legacy-modes/mode/ruby";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";

// ── Catppuccin Mocha theme ──────────────────────────────────────

const catppuccinTheme = EditorView.theme(
  {
    "&": {
      color: "#cdd6f4",
      backgroundColor: "#1e1e2e",
      fontSize: "13px",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', Menlo, monospace",
    },
    ".cm-content": { caretColor: "#f5e0dc" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#f5e0dc" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      { backgroundColor: "#45475a" },
    ".cm-panels": { backgroundColor: "#181825", color: "#cdd6f4" },
    ".cm-panels.cm-panels-top": { borderBottom: "1px solid #313244" },
    ".cm-panels.cm-panels-bottom": { borderTop: "1px solid #313244" },
    ".cm-searchMatch": { backgroundColor: "#585b7066", outline: "1px solid #585b70" },
    ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "#89b4fa33" },
    ".cm-activeLine": { backgroundColor: "#181825" },
    ".cm-selectionMatch": { backgroundColor: "#585b7044" },
    "&.cm-focused .cm-matchingBracket": {
      backgroundColor: "#585b7066",
      outline: "1px solid #89b4fa",
    },
    ".cm-gutters": {
      backgroundColor: "#181825",
      color: "#6c7086",
      border: "none",
      borderRight: "1px solid #313244",
    },
    ".cm-activeLineGutter": { backgroundColor: "#1e1e2e", color: "#a6adc8" },
    ".cm-foldPlaceholder": {
      backgroundColor: "#313244",
      color: "#a6adc8",
      border: "none",
    },
    ".cm-tooltip": {
      backgroundColor: "#1e1e2e",
      border: "1px solid #313244",
      color: "#cdd6f4",
    },
    ".cm-tooltip .cm-tooltip-arrow:before": { borderTopColor: "#313244" },
    ".cm-tooltip .cm-tooltip-arrow:after": { borderTopColor: "#1e1e2e" },
    ".cm-tooltip-autocomplete": {
      "& > ul > li[aria-selected]": { backgroundColor: "#45475a" },
    },
    // Search panel styling
    ".cm-panel.cm-search": {
      backgroundColor: "#181825",
      padding: "4px 8px",
    },
    ".cm-panel.cm-search input": {
      backgroundColor: "#1e1e2e",
      border: "1px solid #45475a",
      color: "#cdd6f4",
      borderRadius: "3px",
      padding: "2px 6px",
    },
    ".cm-panel.cm-search button": {
      backgroundColor: "#313244",
      border: "1px solid #45475a",
      color: "#cdd6f4",
      borderRadius: "3px",
      cursor: "pointer",
    },
    ".cm-panel.cm-search label": { color: "#a6adc8" },
  },
  { dark: true }
);

const catppuccinHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#cba6f7" },
  { tag: tags.operator, color: "#89dceb" },
  { tag: tags.special(tags.variableName), color: "#f38ba8" },
  { tag: tags.typeName, color: "#f9e2af" },
  { tag: tags.atom, color: "#fab387" },
  { tag: tags.number, color: "#fab387" },
  { tag: tags.definition(tags.variableName), color: "#89b4fa" },
  { tag: tags.string, color: "#a6e3a1" },
  { tag: tags.special(tags.string), color: "#a6e3a1" },
  { tag: tags.comment, color: "#6c7086", fontStyle: "italic" },
  { tag: tags.variableName, color: "#cdd6f4" },
  { tag: tags.tagName, color: "#89b4fa" },
  { tag: tags.bracket, color: "#9399b2" },
  { tag: tags.meta, color: "#f5e0dc" },
  { tag: tags.link, color: "#89b4fa", textDecoration: "underline" },
  { tag: tags.heading, color: "#89b4fa", fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.bool, color: "#fab387" },
  { tag: tags.regexp, color: "#f38ba8" },
  { tag: tags.className, color: "#f9e2af" },
  { tag: tags.propertyName, color: "#89b4fa" },
  { tag: tags.function(tags.variableName), color: "#89b4fa" },
  { tag: tags.self, color: "#f38ba8" },
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

  // Create the editor when container is available
  // We track whether the editor has been created to avoid double-creation
  const editorCreated = useRef(false);

  useEffect(() => {
    if (!containerRef.current || editorCreated.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
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
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: source,
        },
      });
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
