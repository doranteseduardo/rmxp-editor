/** Build a Tauri asset-protocol URL from an absolute file path. */
export function buildAssetUrl(path: string): string {
  return `asset://localhost/${encodeURIComponent(path)}`;
}

/** Convenience: asset URL for a project Graphics subdir asset, e.g. (proj, "Tilesets", "Outside"). */
export function graphicAssetUrl(projectPath: string, subdir: string, name: string): string {
  return buildAssetUrl(`${projectPath}/Graphics/${subdir}/${name}.png`);
}
