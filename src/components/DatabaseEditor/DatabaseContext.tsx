/**
 * DatabaseContext — loads cross-reference data from ALL database files
 * so that any tab can show name dropdowns instead of raw IDs.
 *
 * Provides: actors, classes, skills, items, weapons, armors, enemies,
 * states, animations, commonEvents, tilesets, troops, elements, switches, variables.
 */
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { loadDatabase, loadSystemData } from "../../services/tauriApi";

export interface NameEntry {
  id: number;
  name: string;
}

export interface DatabaseNames {
  actors: NameEntry[];
  classes: NameEntry[];
  skills: NameEntry[];
  items: NameEntry[];
  weapons: NameEntry[];
  armors: NameEntry[];
  enemies: NameEntry[];
  states: NameEntry[];
  animations: NameEntry[];
  commonEvents: NameEntry[];
  tilesets: NameEntry[];
  troops: NameEntry[];
  elements: string[];      // index-based, from System
  switches: string[];       // index-based, from System
  variables: string[];      // index-based, from System
  loading: boolean;
  /** Force reload of all cross-reference data */
  reload: () => void;
}

const defaultNames: DatabaseNames = {
  actors: [], classes: [], skills: [], items: [], weapons: [], armors: [],
  enemies: [], states: [], animations: [], commonEvents: [], tilesets: [], troops: [],
  elements: [], switches: [], variables: [],
  loading: true,
  reload: () => {},
};

const DatabaseNamesContext = createContext<DatabaseNames>(defaultNames);

export function useDatabaseNames() {
  return useContext(DatabaseNamesContext);
}

function extractNames(data: unknown[]): NameEntry[] {
  const result: NameEntry[] = [];
  for (let i = 1; i < data.length; i++) {
    const item = data[i] as { id?: number; name?: string } | null;
    if (item) {
      result.push({ id: item.id ?? i, name: item.name ?? `#${i}` });
    }
  }
  return result;
}

interface Props {
  projectPath: string;
  children: ReactNode;
}

export function DatabaseNamesProvider({ projectPath, children }: Props) {
  const [names, setNames] = useState<DatabaseNames>(defaultNames);

  const loadAll = useCallback(async () => {
    setNames(prev => ({ ...prev, loading: true }));
    try {
      const [
        actorsRaw, classesRaw, skillsRaw, itemsRaw, weaponsRaw, armorsRaw,
        enemiesRaw, statesRaw, animsRaw, ceRaw, tsRaw, troopsRaw, sys,
      ] = await Promise.all([
        loadDatabase(projectPath, "Actors.rxdata").catch(() => []),
        loadDatabase(projectPath, "Classes.rxdata").catch(() => []),
        loadDatabase(projectPath, "Skills.rxdata").catch(() => []),
        loadDatabase(projectPath, "Items.rxdata").catch(() => []),
        loadDatabase(projectPath, "Weapons.rxdata").catch(() => []),
        loadDatabase(projectPath, "Armors.rxdata").catch(() => []),
        loadDatabase(projectPath, "Enemies.rxdata").catch(() => []),
        loadDatabase(projectPath, "States.rxdata").catch(() => []),
        loadDatabase(projectPath, "Animations.rxdata").catch(() => []),
        loadDatabase(projectPath, "CommonEvents.rxdata").catch(() => []),
        loadDatabase(projectPath, "Tilesets.rxdata").catch(() => []),
        loadDatabase(projectPath, "Troops.rxdata").catch(() => []),
        loadSystemData(projectPath).catch(() => null),
      ]);

      setNames({
        actors: extractNames(actorsRaw),
        classes: extractNames(classesRaw),
        skills: extractNames(skillsRaw),
        items: extractNames(itemsRaw),
        weapons: extractNames(weaponsRaw),
        armors: extractNames(armorsRaw),
        enemies: extractNames(enemiesRaw),
        states: extractNames(statesRaw),
        animations: extractNames(animsRaw),
        commonEvents: extractNames(ceRaw),
        tilesets: extractNames(tsRaw),
        troops: extractNames(troopsRaw),
        elements: sys?.elements ?? [],
        switches: sys?.switches ?? [],
        variables: sys?.variables ?? [],
        loading: false,
        reload: loadAll,
      });
    } catch (err) {
      console.error("[DatabaseContext] Failed to load cross-references:", err);
      setNames(prev => ({ ...prev, loading: false, reload: loadAll }));
    }
  }, [projectPath]);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <DatabaseNamesContext.Provider value={{ ...names, reload: loadAll }}>
      {children}
    </DatabaseNamesContext.Provider>
  );
}
