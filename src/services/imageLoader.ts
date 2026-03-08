/**
 * Image loading service for tileset and autotile assets.
 *
 * When running in Tauri, loads images via the asset protocol.
 * When running in browser (dev mode), generates placeholder images.
 */

import { getAssetPath } from "./tauriApi";

const imageCache = new Map<string, HTMLImageElement>();

// Lazy-loaded convertFileSrc from Tauri — same pattern as tauriApi.ts
type ConvertFn = (filePath: string, protocol?: string) => string;
let _convertFileSrc: ConvertFn | null = null;
let _convertResolving: Promise<ConvertFn | null> | null = null;

async function getConvertFileSrc(): Promise<ConvertFn | null> {
  if (_convertFileSrc) return _convertFileSrc;
  if (!_convertResolving) {
    _convertResolving = (async () => {
      try {
        const mod = await import("@tauri-apps/api/core");
        _convertFileSrc = mod.convertFileSrc;
        console.log("[imageLoader] Using Tauri convertFileSrc");
        return _convertFileSrc;
      } catch {
        console.log("[imageLoader] Tauri not available, using fallback URL conversion");
        return null;
      }
    })();
  }
  return _convertResolving;
}

async function convertFilePathToUrl(filePath: string): Promise<string> {
  const convert = await getConvertFileSrc();
  if (convert) {
    const url = convert(filePath);
    console.log(`[imageLoader] convertFileSrc: ${filePath} → ${url}`);
    return url;
  }
  // Fallback: Tauri v2 asset protocol format
  // Encode each path segment individually to handle spaces without encoding slashes
  const encoded = filePath
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://asset.localhost/${encoded}`;
}

/**
 * Load an image from a file path or URL.
 * Caches loaded images for reuse.
 * Falls back to alternate URL encoding if the first attempt fails (handles spaces in filenames).
 */
export async function loadImage(path: string): Promise<HTMLImageElement> {
  if (imageCache.has(path)) {
    return imageCache.get(path)!;
  }

  // In Tauri, convert filesystem path to asset protocol URL
  const isFilePath =
    path.startsWith("/") || path.startsWith("C:") || path.startsWith("D:");

  const tryLoadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        console.log(
          `[imageLoader] Loaded image: ${path} (${img.width}x${img.height}) from ${src}`
        );
        imageCache.set(path, img);
        resolve(img);
      };
      img.onerror = (e) => {
        reject(new Error(`Failed to load image: ${src} — ${e}`));
      };
      img.src = src;
    });

  if (isFilePath) {
    // Primary: use Tauri convertFileSrc
    const primaryUrl = await convertFilePathToUrl(path);
    try {
      return await tryLoadImage(primaryUrl);
    } catch (primaryErr) {
      console.warn(
        `[imageLoader] Primary URL failed for: ${path} (${primaryUrl}), trying alternate encoding...`,
        primaryErr
      );

      // Determine platform-correct asset base URL from the primary URL
      // macOS: asset://localhost/...  Windows: https://asset.localhost/...
      const isWindows = primaryUrl.startsWith("https://asset.localhost");
      const assetBase = isWindows
        ? "https://asset.localhost/"
        : "asset://localhost/";

      // Fallback 1: encode each path segment individually (preserves slashes, encodes spaces)
      const segmentEncoded = path
        .split("/")
        .map((seg) => encodeURIComponent(seg))
        .join("/");
      const altUrl = assetBase + segmentEncoded;
      if (altUrl !== primaryUrl) {
        try {
          return await tryLoadImage(altUrl);
        } catch (altErr) {
          console.error(
            `[imageLoader] Alt URL also failed for: ${path} (${altUrl})`,
            altErr
          );
        }
      }

      // Fallback 2: raw path (no encoding) — some platforms handle this directly
      const rawUrl = assetBase + path.replace(/^\//, "");
      if (rawUrl !== primaryUrl && rawUrl !== altUrl) {
        try {
          return await tryLoadImage(rawUrl);
        } catch {
          // All attempts failed
        }
      }

      throw new Error(
        `All URL attempts failed for: ${path}\n  Primary: ${primaryUrl}\n  Alt: ${altUrl}\n  Raw: ${rawUrl}`
      );
    }
  }

  // Non-file path (already a URL)
  return tryLoadImage(path);
}

/**
 * Load the tileset image for a given tileset.
 */
export async function loadTilesetImage(
  projectPath: string,
  tilesetName: string
): Promise<HTMLImageElement | null> {
  if (!tilesetName) return null;

  try {
    const path = await getAssetPath(projectPath, "tileset", tilesetName);
    console.log(`[imageLoader] Loading tileset: ${tilesetName} → ${path}`);
    return await loadImage(path);
  } catch (err) {
    console.warn(`[imageLoader] Failed to load tileset image: ${tilesetName}`, err);
    return createPlaceholderTileset();
  }
}

/**
 * Load an autotile image by slot name.
 */
export async function loadAutotileImage(
  projectPath: string,
  autotileName: string
): Promise<HTMLImageElement | null> {
  if (!autotileName) {
    console.log(`[imageLoader] Skipping empty autotile name`);
    return null;
  }

  try {
    console.log(`[imageLoader] Requesting asset path for autotile: '${autotileName}'`);
    const path = await getAssetPath(projectPath, "autotile", autotileName);
    console.log(`[imageLoader] Loading autotile: '${autotileName}' → ${path}`);
    const img = await loadImage(path);
    console.log(`[imageLoader] ✓ Autotile '${autotileName}' loaded: ${img.width}x${img.height}`);
    return img;
  } catch (err) {
    console.error(`[imageLoader] ✗ Failed to load autotile '${autotileName}':`, err);
    return null;
  }
}

/**
 * Load all images for a tileset (tileset + 7 autotiles).
 */
export async function loadAllTilesetImages(
  projectPath: string,
  tilesetName: string,
  autotileNames: string[]
): Promise<{
  tileset: HTMLImageElement | null;
  autotiles: (HTMLImageElement | null)[];
}> {
  console.log(`[imageLoader] loadAllTilesetImages: tileset='${tilesetName}', autotiles=[${autotileNames.map(n => `'${n}'`).join(', ')}]`);
  const [tileset, ...autotiles] = await Promise.all([
    loadTilesetImage(projectPath, tilesetName),
    ...autotileNames.map((name) =>
      name ? loadAutotileImage(projectPath, name) : Promise.resolve(null)
    ),
  ]);

  console.log(`[imageLoader] Results: tileset=${tileset ? `${tileset.width}x${tileset.height}` : 'null'}, autotiles=[${autotiles.map(a => a ? `${a.width}x${a.height}` : 'null').join(', ')}]`);
  return { tileset, autotiles };
}

/**
 * Generate a placeholder tileset image for development.
 * Creates a 256×512 image with colored tiles.
 */
function createPlaceholderTileset(): HTMLImageElement {
  const cols = 8;
  const rows = 16;
  const canvas = document.createElement("canvas");
  canvas.width = cols * 32;
  canvas.height = rows * 32;
  const ctx = canvas.getContext("2d")!;

  // Color palette for variety
  const colors = [
    "#2d5016", "#3a6b1e", "#4a8526", "#2a4a14", // greens (grass)
    "#6b5a2e", "#8a7040", "#a08550", "#5a4a22", // browns (dirt)
    "#4a6080", "#5a7090", "#6a80a0", "#3a5070", // blues (water)
    "#707070", "#888888", "#606060", "#505050", // grays (stone)
  ];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const idx = y * cols + x;
      const color = colors[idx % colors.length];

      ctx.fillStyle = color;
      ctx.fillRect(x * 32, y * 32, 32, 32);

      // Add tile index text
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "9px monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        String(384 + idx),
        x * 32 + 16,
        y * 32 + 20
      );
    }
  }

  const img = new Image();
  img.src = canvas.toDataURL();
  return img;
}

/**
 * Load a character sprite image by character name.
 * Character sprites are in Graphics/Characters/<name>.png
 */
export async function loadCharacterImage(
  projectPath: string,
  characterName: string
): Promise<HTMLImageElement | null> {
  if (!characterName) return null;

  try {
    const path = await getAssetPath(projectPath, "character", characterName);
    console.log(`[imageLoader] Loading character: '${characterName}' → ${path}`);
    const img = await loadImage(path);
    console.log(`[imageLoader] ✓ Character '${characterName}' loaded: ${img.width}x${img.height}`);
    return img;
  } catch (err) {
    console.warn(`[imageLoader] ✗ Failed to load character '${characterName}':`, err);
    return null;
  }
}

/** Clear the image cache. */
export function clearImageCache() {
  imageCache.clear();
}
