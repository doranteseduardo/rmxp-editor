/**
 * PBS names index — loads all PBS files and builds a Map<filename, string[]>
 * of section headers. Used to power cross-reference autocomplete pickers.
 */
import { listPbsFiles, loadPbsFile } from "./tauriApi";

export type PbsIndex = Map<string, string[]>;

export async function buildPbsIndex(projectPath: string): Promise<PbsIndex> {
  const index: PbsIndex = new Map();
  try {
    const files = await listPbsFiles(projectPath);
    await Promise.all(
      files.map(async (filename) => {
        try {
          const sections = await loadPbsFile(projectPath, filename);
          index.set(filename, sections.map((s) => s.header));
        } catch {
          index.set(filename, []);
        }
      })
    );
  } catch {
    // PBS directory may not exist — return empty index
  }
  return index;
}
