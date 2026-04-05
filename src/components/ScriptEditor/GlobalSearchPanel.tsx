import { useEffect, useRef } from "react";

export interface SearchResult {
  scriptId: number;
  scriptTitle: string;
  line: number;       // 1-indexed
  ch: number;         // 0-indexed char offset within the line
  lineContent: string;
  matchLength: number;
}

interface Props {
  query: string;
  results: SearchResult[];
  searching: boolean;
  onQueryChange: (q: string) => void;
  onClose: () => void;
  onNavigate: (scriptId: number, line: number, ch: number, matchLength: number) => void;
}

/** Render one line of text with the matched portion highlighted.
 *  Long lines are trimmed to show context around the match. */
function MatchLine({ text, ch, length }: { text: string; ch: number; length: number }) {
  const rawMatch = text.slice(ch, ch + length);

  if (text.length <= 100) {
    return (
      <span className="search-result-line">
        {text.slice(0, ch)}
        <mark className="search-result-match">{rawMatch}</mark>
        {text.slice(ch + length)}
      </span>
    );
  }

  const BEFORE = 30;
  const AFTER  = 50;
  const startOffset = Math.max(0, ch - BEFORE);
  const endOffset   = Math.min(text.length, ch + length + AFTER);

  return (
    <span className="search-result-line">
      {startOffset > 0 && "…"}
      {text.slice(startOffset, ch)}
      <mark className="search-result-match">{rawMatch}</mark>
      {text.slice(ch + length, endOffset)}
      {endOffset < text.length && "…"}
    </span>
  );
}

export function GlobalSearchPanel({
  query,
  results,
  searching,
  onQueryChange,
  onClose,
  onNavigate,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input when the panel opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Group results by script
  const groups: Array<{ scriptId: number; title: string; items: SearchResult[] }> = [];
  const groupMap = new Map<number, { scriptId: number; title: string; items: SearchResult[] }>();
  for (const r of results) {
    if (!groupMap.has(r.scriptId)) {
      const g = { scriptId: r.scriptId, title: r.scriptTitle, items: [] };
      groupMap.set(r.scriptId, g);
      groups.push(g);
    }
    groupMap.get(r.scriptId)!.items.push(r);
  }

  const capped = results.length >= 1000;

  return (
    <div className="script-list-panel">
      <div className="script-list-header">
        <span>Search</span>
        <button className="script-list-add-btn" title="Close search (Escape)" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="global-search-input-row">
        <input
          ref={inputRef}
          className="global-search-input"
          placeholder="Search all scripts…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          spellCheck={false}
        />
      </div>

      {/* Status line */}
      <div className="global-search-status">
        {searching && "Searching…"}
        {!searching && query.trim() && results.length === 0 && "No results"}
        {!searching && results.length > 0 && (
          <>
            {capped ? "1000+" : results.length} match{results.length !== 1 ? "es" : ""}{" "}
            in {groups.length} script{groups.length !== 1 ? "s" : ""}
            {capped && " (showing first 1000)"}
          </>
        )}
      </div>

      {/* Grouped results */}
      <div className="script-list-items global-search-results">
        {groups.map((group) => (
          <div key={group.scriptId} className="search-result-group">
            <div className="search-result-group-title">{group.title}</div>
            {group.items.map((r, i) => (
              <div
                key={i}
                className="search-result-item"
                onClick={() => onNavigate(r.scriptId, r.line, r.ch, r.matchLength)}
                title={`${r.scriptTitle}:${r.line}`}
              >
                <span className="search-result-lineno">{r.line}</span>
                <MatchLine text={r.lineContent} ch={r.ch} length={r.matchLength} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
